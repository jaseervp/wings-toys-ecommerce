const razorpay = require("../config/razorpay");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    // 1. Fetch Cart
    const cart = await Cart.findOne({ user: userId }).populate("items.product");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    // 2. Validate Stock
    for (const item of cart.items) {
      const product = item.product;

      if (!product) {
        return res.status(400).json({ success: false, message: "Product not found" });
      }

      if (!product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" is no longer available.`
        });
      }

      if (!product.isUnlimited && item.quantity > product.stockQuantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} left.`
        });
      }
    }

    // 3. Create Razorpay Order (Only if validation passes)
    const order = await razorpay.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: "test_rcpt_" + Date.now(),
    });

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error("PAYMENT CREATE ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
