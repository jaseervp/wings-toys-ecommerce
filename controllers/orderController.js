const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");

/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  try {
    const { paymentMethod, couponCode, shippingAddress } = req.body;

    // 1️⃣ Get cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    if (!shippingAddress) {
      return res.status(400).json({ message: "Shipping address is required" });
    }

    // 2️⃣ Validate payment
    const allowedMethods = ["wallet", "upi", "cod"];
    if (!allowedMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // 3️⃣ Build items + calculate subtotal (DO NOT trust frontend)
    let subtotal = 0;
    const items = cart.items.map(item => {
      subtotal += item.product.finalPrice * item.quantity;
      return {
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.finalPrice,
        itemStatus: "pending"
      };
    });

    // 4️⃣ Apply coupon
    let discount = 0;
    let appliedCouponCode = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true
      });

      if (coupon) {

        // ❌ Minimum cart check
        if (subtotal < coupon.minCartValue) {
          return res.status(400).json({
            message: `Minimum purchase ₹${coupon.minCartValue} required`
          });
        }

        // ✅ Calculate discount
        if (coupon.discountType === "percentage") {
          discount = Math.floor((subtotal * coupon.discountValue) / 100);

          // 🔒 Max discount cap
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        }

        if (coupon.discountType === "flat") {
          discount = coupon.discountValue;
        }

        appliedCouponCode = coupon.code;
      }
    }

    // 5️⃣ Wallet Payment Logic
    let paymentStatus = "unpaid";
    if (paymentMethod === "wallet") {
      const finalAmount = subtotal - discount;

      const user = await User.findById(req.user.id);

      if (user.wallet.balance < finalAmount) {
        return res.status(400).json({
          message: "Insufficient wallet balance"
        });
      }

      // Deduct from wallet & Add transaction
      user.wallet.balance -= finalAmount;
      user.wallet.transactions.push({
        amount: finalAmount,
        type: "debit",
        reason: "Order Payment",
        date: new Date()
      });

      await user.save();
      paymentStatus = "paid";
    } else if (paymentMethod === "upi") {
      // UPI is handled separately or marked as unpaid initially
      paymentStatus = "unpaid";
    }

    // 6️⃣ Create order
    const order = await Order.create({
      user: req.user.id,
      items,
      subtotal,
      discount,
      totalAmount: subtotal - discount,
      couponCode: appliedCouponCode,
      paymentMethod,
      paymentStatus, // Updated status
      orderStatus: "pending",
      shippingAddress
    });

    // 6️⃣ Clear cart
    cart.items = [];
    await cart.save();

    res.status(201).json({ success: true, order });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= USER: GET MY ORDERS ================= */
exports.getMyOrders = async (req, res) => {
  const { status, returnStatus } = req.query;
  const filter = { user: req.user.id };

  if (status) {
    filter.orderStatus = status;
  }

  if (returnStatus === 'active') {
    filter.returnStatus = { $ne: 'none' };
  }

  const orders = await Order.find(filter)
    .populate("items.product", "name images")
    .sort({ createdAt: -1 });

  res.json({ orders });
};
exports.getAllOrdersAdmin = async (req, res) => {
  const orders = await Order.find()
    .populate("user", "name email")            // 👈 THIS FIXES "Guest"
    .populate("items.product", "name images")
    .sort({ createdAt: -1 });

  res.json({ orders });
};


/* ================= USER: GET SINGLE ORDER ================= */
exports.getMyOrderById = async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    user: req.user.id
  }).populate("items.product", "name images");

  if (!order) return res.status(404).json({ message: "Order not found" });

  res.json({ order });
};

/* ================= ADMIN ================= */
exports.getOrders = async (req, res) => {
  const { sortBy } = req.query;
  let sort = { createdAt: -1 }; // Default: Newest

  if (sortBy === 'oldest') sort = { createdAt: 1 };
  if (sortBy === 'amount_high') sort = { totalAmount: -1 };
  if (sortBy === 'amount_low') sort = { totalAmount: 1 };

  const orders = await Order.find()
    .populate("user", "fullName email")
    .populate("items.product", "name images")
    .sort(sort);

  res.json({ orders });
};

exports.updateOrderStatus = async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { orderStatus: req.body.status },
    { new: true }
  );

  res.json(order);
};

exports.updateItemStatus = async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;

  let order = await Order.findOneAndUpdate(
    { _id: orderId, "items._id": itemId },
    { $set: { "items.$.itemStatus": status } },
    { new: true }
  );

  // Auto-update Order Status logic
  if (order) {
    const anyPending = order.items.some(i => i.itemStatus === 'pending');
    const allDelivered = order.items.every(i => i.itemStatus === 'delivered');
    const allCanceled = order.items.every(i => i.itemStatus === 'canceled');
    const anyShipped = order.items.some(i => i.itemStatus === 'shipped');
    const anyDelivered = order.items.some(i => i.itemStatus === 'delivered');

    if (allCanceled) order.orderStatus = 'canceled';
    else if (allDelivered) order.orderStatus = 'delivered';
    else if (anyPending) order.orderStatus = 'pending';
    else if (anyShipped || anyDelivered) order.orderStatus = 'shipped';
    else order.orderStatus = 'pending';

    await order.save();
  }

  res.json(order);
};

/* ================= CANCEL / RETURN LOGIC ================= */

// User: Cancel Order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      return res.status(400).json({ message: "Cannot cancel shipped or delivered order" });
    }

    if (order.orderStatus === "canceled") {
      return res.status(400).json({ message: "Order is already canceled" });
    }

    order.orderStatus = "canceled";
    await order.save();

    res.json({ message: "Order canceled successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// User: Request Return
exports.requestReturn = async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    if (order.returnStatus !== "none") {
      return res.status(400).json({ message: "Return already requested" });
    }

    order.returnStatus = "requested";
    order.returnReason = reason;
    await order.save();

    res.json({ message: "Return requested successfully", order });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Update Return Status
exports.updateReturnStatus = async (req, res) => {
  try {
    const { status } = req.body; // approved / rejected
    const order = await Order.findById(req.params.id).populate("user");

    if (!order) return res.status(404).json({ message: "Order not found" });

    // Fix potential case sensitivity issues
    const normalizedStatus = status.toLowerCase();

    // REFUND LOGIC: Only processing if approved and not already refunded
    if (normalizedStatus === "approved" && !order.isRefunded) {

      // 1. Calculate Refund Amount (Defaults to Full Order Amount as per current schema)
      const refundAmount = Number(order.totalAmount);
      console.log(`[INFO] Processing refund of ₹${refundAmount} for Order #${order._id}`);

      // 2. Credit Wallet
      // Handle case where order.user might be an object or ID
      const userId = order.user._id || order.user;

      const user = await User.findById(userId);

      if (user) {
        // Initialize wallet if it doesn't exist (e.g. for existing users)
        if (!user.wallet) {
          user.wallet = { balance: 0, transactions: [] };
        }

        const oldBalance = user.wallet.balance || 0;
        user.wallet.balance = oldBalance + refundAmount;

        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for Order #${order._id.toString().slice(-6).toUpperCase()}`
        });

        // Force Mongoose to see the change for nested objects
        user.markModified('wallet');

        try {
          await user.save();
          console.log(`[INFO] Refund successful. New Wallet Balance: ₹${user.wallet.balance}`);

          // 3. Mark as Refunded (only after wallet credit success)
          order.isRefunded = true;
        } catch (saveErr) {
          console.error("[ERROR] Failed to save wallet update:", saveErr);
          return res.status(500).json({ message: "Failed to process refund", error: saveErr.message });
        }
      } else {
        console.error(`[ERROR] User not found for order ${order._id}`);
        // Optionally return error or proceed if user is deleted
      }
    }

    order.returnStatus = status;
    await order.save();

    res.json({ message: "Return status updated", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


