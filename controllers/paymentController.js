const razorpay = require("../config/razorpay");

exports.createOrder = async (req, res) => {
  try {
    const { amount } = req.body;

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
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
