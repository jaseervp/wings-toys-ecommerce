const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ==========================================
// 🌟 Public Routes
// ==========================================

// Get all reviews for a specific product
router.get("/reviews/:productId", reviewController.getReviewsByProduct);

// ==========================================
// 🔐 Private Routes (Requires Login)
// ==========================================

// Add a new review
router.post("/review/:productId", protect, reviewController.addReview);

// Update a review (Only owner)
router.put("/review/:id", protect, reviewController.updateReview);

// Delete a review (Owner or Admin)
router.delete("/review/:id", protect, reviewController.deleteReview);

// ==========================================
// 🛡️ Admin Routes
// ==========================================

// Get all reviews (Admin)
router.get("/admin/reviews", protect, adminOnly, reviewController.adminGetAllReviews);

// Update review status (Admin)
router.patch("/admin/reviews/:id/status", protect, adminOnly, reviewController.adminUpdateReviewStatus);

// Get review stats (Admin)
router.get("/admin/reviews/stats", protect, adminOnly, reviewController.adminGetReviewStats);

module.exports = router;