const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  addToCart,
  updateCartQty,
  removeFromCart,
  getCart
} = require("../controllers/cartController");

router.get("/cart", protect, getCart);
router.post("/cart", protect, addToCart);
router.put("/cart/update", protect, updateCartQty);
router.delete("/cart/:productId", protect, removeFromCart);

module.exports = router;
