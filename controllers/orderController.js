const Coupon = require("../models/Coupon");
const Order = require("../models/Order");

/* ================= CREATE ORDER ================= */
exports.createOrder = async (req, res) => {
  try {
    const { items, subtotal, paymentMethod, couponCode } = req.body;

    // 🔐 ENSURE USER EXISTS
    if (!req.user) {
  return res.status(401).json({
    message: "Login required to place order"
  });
}
console.log("USER IN ORDER:", req.user);


    // ✅ PAYMENT METHOD FIX
    const paymentMap = {
      "pay-w": "wallet",
      "pay-u": "upi",
      "pay-c": "cod"
    };

    const normalizedPaymentMethod = paymentMap[paymentMethod];
    if (!normalizedPaymentMethod) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    let coupon = null;
    let discount = 0;

    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode, isActive: true });
      if (!coupon) return res.status(400).json({ message: "Invalid coupon" });

      const today = new Date();
      if (today < coupon.startDate)
        return res.status(400).json({ message: "Coupon not active yet" });

      if (today > coupon.expiryDate)
        return res.status(400).json({ message: "Coupon expired" });

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
        return res.status(400).json({ message: "Coupon usage limit reached" });

      if (coupon.discountType === "percentage") {
        discount = Math.floor((subtotal * coupon.discountValue) / 100);
        if (coupon.maxDiscount && discount > coupon.maxDiscount)
          discount = coupon.maxDiscount;
      } else if (coupon.discountType === "flat") {
        discount = coupon.discountValue;
      }
    }

    const totalAmount = subtotal - discount;

    const order = await Order.create({
      user: req.user.id,
      items,
      subtotal,
      discount,
      totalAmount,
      paymentMethod: normalizedPaymentMethod,
      paymentStatus: normalizedPaymentMethod === "cod" ? "unpaid" : "paid",
      couponCode: coupon ? coupon.code : null
    });

    if (coupon) {
      coupon.usedCount += 1;
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        coupon.isActive = false;
      }
      await coupon.save();
    }

    res.status(201).json({ message: "Order placed successfully", order });

  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ================= ADMIN: GET ORDERS ================= */
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name images")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

/* ================= ADMIN: UPDATE STATUS ================= */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus: status },
      { new: true }
    );

    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};
// ADMIN: UPDATE SINGLE PRODUCT STATUS IN ORDER
exports.updateItemStatus = async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;

  const order = await Order.findOneAndUpdate(
    { _id: orderId, "items._id": itemId },
    { $set: { "items.$.itemStatus": status } },
    { new: true }
  );

  res.json(order);
};

