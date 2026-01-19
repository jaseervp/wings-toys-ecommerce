const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  addToCart,
  updateCartQty,
  removeFromCart,
  getCart
} = require("../controllers/cartController");

// Get cart
router.get("/cart", protect, getCart);

// Add to cart ✅
router.post("/cart", protect, addToCart);

// Update quantity ✅
router.put("/cart/update", protect, updateCartQty);

// Remove product ✅
router.delete("/cart/:productId", protect, removeFromCart);

module.exports = router;
