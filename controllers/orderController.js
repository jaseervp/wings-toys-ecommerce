const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const User = require("../models/User");
const Product = require("../models/Product");
const Offer = require("../models/Offer");
const { calculateProductFinalPrice } = require("../utils/priceCalculator");
const mongoose = require("mongoose");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");

/* ================= CREATE ORDER ================= */
/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  // Check if the MongoDB deployment supports transactions
  const isReplicaSet = mongoose.connection.getClient().topology?.description?.type !== 'Single';

  if (isReplicaSet) {
    session.startTransaction();
  }

  try {
    const { paymentMethod, couponCode, shippingAddress } = req.body;

    // 1. Get cart
    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product")
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error("Cart is empty");
    }

    if (!shippingAddress) {
      throw new Error("Shipping address is required");
    }

    // 2. Validate payment method
    const allowedMethods = ["wallet", "upi", "cod"];
    if (!allowedMethods.includes(paymentMethod)) {
      throw new Error("Invalid payment method");
    }

    // 3. Check Stock & Calculate Totals
    let subtotal = 0;
    const items = [];

    // --- Dynamic Price Calculation ---
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).session(session);

    // Optimize: Fetch all products in one go
    const productIds = cart.items.map(item => item.product._id);
    const products = await Product.find({ _id: { $in: productIds } }).session(session);

    // Create a Map for easy lookup
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    for (const item of cart.items) {
      const product = productMap.get(item.product._id.toString());

      if (!product) {
        throw new Error(`Product ${item.product.name || 'Unknown'} not found`);
      }

      if (!product.isActive) {
        throw new Error(`Product ${product.name} is no longer available`);
      }

      // Stock Check
      if (!product.isUnlimited && product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Only ${product.stockQuantity} left.`);
      }

      // Deduct Stock
      if (!product.isUnlimited) {
        product.stockQuantity -= item.quantity;
        await product.save({ session });
      }

      // Calculate Real-time Offer Price
      const priceDetails = calculateProductFinalPrice(product, activeOffers);
      const effectivePrice = priceDetails.finalPrice;

      subtotal += effectivePrice * item.quantity;
      items.push({
        product: product._id,
        quantity: item.quantity,
        price: effectivePrice,
        itemStatus: "pending"
      });
    }

    // 4. Apply Coupon
    let discount = 0;
    let appliedCouponCode = null;
    let validatedCoupon = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode,
        isActive: true
      }).session(session);

      if (coupon) {
        // Expiry check
        if (new Date() > coupon.expiryDate) {
          throw new Error("Coupon has expired");
        }

        if (subtotal < coupon.minCartValue) {
          throw new Error(`Minimum purchase ₹${coupon.minCartValue} required for coupon`);
        }

        // Global usage limit check
        if (coupon.totalUsageLimit !== null && coupon.usedCount >= coupon.totalUsageLimit) {
          throw new Error("Coupon usage limit reached");
        }

        // Per-user usage limit check
        const userUsageCount = coupon.usedBy.filter(id => id.toString() === req.user.id).length;
        if (userUsageCount >= coupon.usageLimitPerUser) {
          throw new Error("You have already used this coupon.");
        }

        if (coupon.discountType === "percentage") {
          discount = Math.floor((subtotal * coupon.discountValue) / 100);
          if (coupon.maxDiscount && discount > coupon.maxDiscount) {
            discount = coupon.maxDiscount;
          }
        } else if (coupon.discountType === "flat") {
          discount = coupon.discountValue;
        }

        appliedCouponCode = coupon.code;
        validatedCoupon = coupon;
      }
    }

    const totalAmount = subtotal - discount;

    // Distribute discount proportionally across items
    if (discount > 0 && items.length > 0) {
      let distributedDiscount = 0;
      for (let i = 0; i < items.length; i++) {
        if (i === items.length - 1) {
          // Last item gets the remainder to avoid rounding issues
          items[i].discountShare = discount - distributedDiscount;
        } else {
          const itemTotal = items[i].price * items[i].quantity;
          const share = Math.round((itemTotal / subtotal) * discount);
          items[i].discountShare = share;
          distributedDiscount += share;
        }
      }
    }

    // 5. Process Payment
    let paymentStatus = "unpaid";

    if (paymentMethod === "wallet") {
      const user = await User.findById(req.user.id).session(session);
      if (user.wallet.balance < totalAmount) {
        throw new Error("Insufficient wallet balance");
      }

      user.wallet.balance -= totalAmount;
      user.wallet.transactions.push({
        amount: totalAmount,
        type: "debit",
        reason: "Order Payment",
        date: new Date()
      });
      await user.save({ session });
      paymentStatus = "paid";

    } else if (paymentMethod === "upi") {
      const { razorpayPayment } = req.body;
      if (razorpayPayment) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = razorpayPayment;
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest("hex");

        if (expectedSignature === razorpay_signature) {
          paymentStatus = "paid";
        } else {
          throw new Error("Invalid payment signature");
        }
      }
    }

    // 6. Create Order
    const [order] = await Order.create([{
      user: req.user.id,
      items,
      subtotal,
      discount,
      totalAmount,
      couponCode: appliedCouponCode,
      paymentMethod,
      paymentStatus,
      orderStatus: "pending",
      shippingAddress
    }], { session });

    // 7. Mark Coupon as Used (Only on success)
    if (validatedCoupon) {
      validatedCoupon.usedBy.push(req.user.id);
      validatedCoupon.usedCount += 1;
      await validatedCoupon.save({ session });
    }

    // 8. Clear Cart
    cart.items = [];
    await cart.save({ session });

    // COMMIT
    if (session.inTransaction()) {
      await session.commitTransaction();
    }
    session.endSession();

    res.status(201).json({ success: true, order });

  } catch (error) {
    // ABORT
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();

    console.error("ORDER PROCESSING FAILED:", error);
    res.status(400).json({ message: error.message || "Order processing failed" });
  }
};


/* ================= USER: GET MY ORDERS ================= */
/* ================= USER: GET MY ORDERS ================= */
exports.getMyOrders = async (req, res) => {
  try {
    const { status, returnStatus, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user.id };

    if (status === 'canceled') {
      filter.$or = [
        { orderStatus: 'canceled' },
        { "items.itemStatus": 'canceled' }
      ];
    } else if (status) {
      filter.orderStatus = status;
    }

    if (returnStatus === 'active') {
      filter.returnStatus = { $ne: 'none' };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalOrders = await Order.countDocuments(filter);
    const totalPages = Math.ceil(totalOrders / limitNum);

    const orders = await Order.find(filter)
      .populate("items.product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      orders,
      currentPage: pageNum,
      totalPages,
      totalOrders
    });
  } catch (error) {
    console.error("Error fetching my orders:", error);
    res.status(500).json({ message: "Server Error" });
  }
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
  const { status } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.orderStatus = status;

  // Propagate order status to all items that are not canceled
  order.items.forEach(item => {
    if (item.itemStatus !== 'canceled') {
      item.itemStatus = status;
    }
  });

  await order.save();
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

    //  REFUND LOGIC (Full Order)
    if (
      (order.paymentMethod === "upi" || order.paymentMethod === "wallet") &&
      order.paymentStatus === "paid"
    ) {
      const refundAmount = order.totalAmount;
      const user = await User.findById(req.user.id);

      if (user) {
        user.wallet.balance += refundAmount;
        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for Order #${order._id.toString().slice(-6).toUpperCase()}`,
          date: new Date()
        });
        await user.save();
        order.isRefunded = true;
      }
    }

    // Update Status
    order.orderStatus = "canceled";

    // Mark all items as canceled
    order.items.forEach(item => {
      item.itemStatus = "canceled";
    });

    await order.save();

    //  RESTORE STOCK (Full Order)
    const Product = require("../models/Product");
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.quantity }
      });
    }

    res.json({ message: "Order canceled & refund processed (if eligible)", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// User: Cancel Single Item
exports.cancelOrderItem = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const order = await Order.findOne({ _id: orderId, user: req.user.id });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      return res.status(400).json({ message: "Cannot cancel items in shipped/delivered order" });
    }

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.itemStatus === "canceled") {
      return res.status(400).json({ message: "Item is already canceled" });
    }

    //  REFUND LOGIC (Item Only)
    if (
      (order.paymentMethod === "upi" || order.paymentMethod === "wallet") &&
      order.paymentStatus === "paid"
    ) {
      // Logic: Refund = (Item Price * Qty) - Discount Share
      const refundAmount = Number((item.price * item.quantity) - (item.discountShare || 0));

      const user = await User.findById(req.user.id);
      if (user) {
        if (!user.wallet) {
          user.wallet = { balance: 0, transactions: [] };
        }

        user.wallet.balance += refundAmount;
        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for Cancelled Item (Order #${order._id.toString().slice(-6).toUpperCase()})`,
          date: new Date()
        });
        await user.save();
      }
    }

    // Update Item Status
    item.itemStatus = "canceled";

    // Update Totals accurately
    const itemFullPrice = item.price * item.quantity;
    const itemDiscountShare = item.discountShare || 0;
    const itemEffectivePaid = itemFullPrice - itemDiscountShare;

    if (order.subtotal >= itemFullPrice) order.subtotal -= itemFullPrice;
    if (order.discount >= itemDiscountShare) order.discount -= itemDiscountShare;
    if (order.totalAmount >= itemEffectivePaid) order.totalAmount -= itemEffectivePaid;

    //  RESTORE STOCK (Single Item)
    const Product = require("../models/Product");
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stockQuantity: item.quantity }
    });

    // Auto-update Order Status if all items canceled
    const allCanceled = order.items.every(i => i.itemStatus === "canceled");
    if (allCanceled) {
      order.orderStatus = "canceled";
      // If payment was paid, and we just canceled the last item, 
      // strictly speaking we refunded piece-by-piece. 
      // We can mark isRefunded = true if fully canceled.
      if (order.paymentStatus === "paid") {
        order.isRefunded = true;
      }
    }

    await order.save();

    res.json({ message: "Item canceled & refunded (if eligible)", order });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// User: Request Return for Item
exports.requestReturn = async (req, res) => {
  try {
    const { reason, itemId } = req.body;
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.orderStatus !== "delivered") {
      return res.status(400).json({ message: "Only delivered orders can be returned" });
    }

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.returnStatus && item.returnStatus !== "none") {
      return res.status(400).json({ message: "Return already requested for this item" });
    }

    item.returnStatus = "requested";
    item.returnReason = reason;

    // Optional: Keep order-level status for backwards compatibility or global view
    order.returnStatus = "requested";

    await order.save();

    res.json({ message: "Return requested successfully for the item", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin: Update Return Status (Item-Level)
exports.updateReturnStatus = async (req, res) => {
  try {
    const { status, itemId } = req.body; // approved / rejected
    const order = await Order.findById(req.params.id).populate("user");

    if (!order) return res.status(404).json({ message: "Order not found" });

    const item = order.items.id(itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    // Fix potential case sensitivity issues
    const normalizedStatus = status.toLowerCase();

    // REFUND LOGIC: Only processing if approved and not already refunded
    if (normalizedStatus === "approved" && item.itemStatus !== "returned") {

      // Calculate Refund Amount: Effective Paid Amount = (Price * Qty) - Discount Share
      const refundAmount = Number((item.price * item.quantity) - (item.discountShare || 0));
      console.log(`[INFO] Processing universal refund of ₹${refundAmount} for Item in Order #${order._id} (Paid via ${order.paymentMethod})`);

      const userId = order.user._id || order.user;
      const user = await User.findById(userId);

      if (user) {
        if (!user.wallet) {
          user.wallet = { balance: 0, transactions: [] };
        }

        user.wallet.balance += refundAmount;

        // Universal Transaction Description
        const paymentContext = order.paymentMethod.toUpperCase();
        user.wallet.transactions.push({
          amount: refundAmount,
          type: "credit",
          reason: `Refund for Item (Returned product from ${paymentContext} order #${order._id.toString().slice(-6).toUpperCase()})`,
          date: new Date()
        });

        user.markModified('wallet');
        await user.save();

        // Update item status to returned
        item.itemStatus = "returned";
      }
    }

    item.returnStatus = status;

    // Sync order-level return status (Requested > Approved > Rejected)
    const hasRequested = order.items.some(i => i.returnStatus === 'requested');
    const hasApproved = order.items.some(i => i.returnStatus === 'approved');
    const hasRejected = order.items.some(i => i.returnStatus === 'rejected');

    if (hasRequested) {
      order.returnStatus = 'requested';
    } else if (hasApproved) {
      order.returnStatus = 'approved';
    } else if (hasRejected) {
      order.returnStatus = 'rejected';
    } else {
      order.returnStatus = 'none';
    }

    await order.save();

    res.json({ message: "Item return status updated", order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ================= DOWNLOAD INVOICE ================= */
exports.downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "fullName email")
      .populate("items.product", "name price");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Security: Check if order belongs to user (unless admin)
    const userId = order.user._id || order.user;
    if (userId.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const doc = new PDFDocument({ margin: 50 });

    // Stream PDF directly to response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${order._id}.pdf`
    );

    doc.pipe(res);

    // --- Header ---
    doc.fillColor("#444444").fontSize(20).text("WINGS TOY STORE", 50, 50);
    doc.fontSize(10).text("123 Toy Street, Playland", 200, 50, { align: "right" });
    doc.text("support@wingstoys.com", 200, 65, { align: "right" });
    doc.moveDown();

    // --- Invoice Info ---
    doc.fillColor("#000000").fontSize(15).text("INVOICE", 50, 120);
    doc.fontSize(10).text(`Invoice Number: ${order._id.toString().toUpperCase()}`, 50, 140);
    doc.text(`Order Date: ${new Date(order.createdAt).toLocaleDateString()}`, 50, 155);
    doc.moveDown();

    // --- Customer Details ---
    doc.fontSize(12).text("Bill To:", 50, 185);
    doc.fontSize(10).text(order.shippingAddress.fullName || order.user.fullName || "Customer", 50, 200);
    doc.text(order.shippingAddress.addressLine, 50, 215);
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 50, 230);
    doc.text(`Phone: ${order.shippingAddress.phone}`, 50, 245);
    doc.moveDown();

    // --- Items Table Headers ---
    const tableTop = 280;
    const col1 = 50;  // Item
    const col2 = 300; // Price
    const col3 = 380; // Qty
    const col4 = 450; // Total
    const colWidth = 100;

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Item", col1, tableTop);
    doc.text("Price", col2, tableTop, { width: colWidth, align: "right" });
    doc.text("Qty", col3, tableTop, { width: 50, align: "right" });
    doc.text("Total", col4, tableTop, { width: colWidth, align: "right" });

    doc.moveTo(col1, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let currentY = tableTop + 25;
    doc.font("Helvetica");
    order.items.forEach((item) => {
      doc.text(item.product.name, col1, currentY, { width: 240 });
      doc.text(`Rs. ${item.price.toFixed(2)}`, col2, currentY, { width: colWidth, align: "right" });
      doc.text(item.quantity.toString(), col3, currentY, { width: 50, align: "right" });
      doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, col4, currentY, { width: colWidth, align: "right" });
      currentY += 20;
    });

    doc.moveTo(col1, currentY).lineTo(550, currentY).stroke();
    currentY += 15;

    // --- Totals ---
    const totalLabelX = 350;
    const totalValueX = 450;
    const totalValueWidth = 100;

    doc.text("Subtotal:", totalLabelX, currentY, { width: 100, align: "right" });
    doc.text(`Rs. ${order.subtotal.toFixed(2)}`, totalValueX, currentY, { width: totalValueWidth, align: "right" });

    currentY += 20;
    doc.text("Discount:", totalLabelX, currentY, { width: 100, align: "right" });
    doc.text(`-Rs. ${order.discount.toFixed(2)}`, totalValueX, currentY, { width: totalValueWidth, align: "right" });

    currentY += 25;
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Grand Total:", totalLabelX, currentY, { width: 100, align: "right" });
    doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, totalValueX, currentY, { width: totalValueWidth, align: "right" });

    // --- Footer ---
    doc.fontSize(10).font("Helvetica").text("Thank you for shopping with Wings Toy Store!", 50, 700, { align: "center", width: 500 });

    doc.end();
  } catch (error) {
    console.error("INVOICE GENERATION ERROR:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  }
};
