const express = require("express");
const router = express.Router();
const couponController = require("../controllers/couponController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Admin
router.post("/admin/coupons", protect, adminOnly, couponController.createCoupon);
router.get("/admin/coupons", protect, adminOnly, couponController.getAllCoupons);
router.put("/admin/coupons/:id", protect, adminOnly, couponController.updateCoupon);
router.delete("/admin/coupons/:id", protect, adminOnly, couponController.deleteCoupon);


// User / Checkout
router.get("/coupons/active", couponController.getActiveCoupons);
router.get("/coupons/checkout", protect, couponController.getCheckoutCoupons);

module.exports = router;
