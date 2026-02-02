const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Admin
router.post("/admin/coupons", protect, adminOnly, couponController.createCoupon);
router.get("/admin/coupons", protect, adminOnly, couponController.getAllCoupons);
router.delete("/admin/coupons/:id", protect, adminOnly, couponController.deleteCoupon);


// User / Checkout
router.get("/coupons/active", couponController.getActiveCoupons);
router.get("/coupons/checkout", couponController.getCheckoutCoupons);

module.exports = router;
