const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { createOrder } = require("../controllers/paymentController");

router.post("/create-order", protect, createOrder);

module.exports = router;
