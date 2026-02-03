const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Cart = require("../models/Cart");

/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  try {
    const { subtotal, paymentMethod, couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const items = cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.product.finalPrice,
      itemStatus: "pending"
    }));

    const paymentMap = {
      "pay-w": "wallet",
      "pay-u": "upi",
      "pay-c": "cod"
    };

    const normalizedPaymentMethod = paymentMap[paymentMethod];
    if (!normalizedPaymentMethod) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (coupon) discount = coupon.discountAmount || 0;
    }

    const order = await Order.create({
      user: req.user.id,
      items,
      subtotal,
      discount,
      totalAmount: subtotal - discount,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === "cod" ? "unpaid" : "paid"
    });

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
  const orders = await Order.find({ user: req.user.id })
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
  const orders = await Order.find()
    .populate("user", "fullName email")
    .populate("items.product", "name images");

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

  const order = await Order.findOneAndUpdate(
    { _id: orderId, "items._id": itemId },
    { $set: { "items.$.itemStatus": req.body.status } },
    { new: true }
  );

  res.json(order);
};
