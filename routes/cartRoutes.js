const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");

const {
  addToCart,
  updateCartQty,
  removeFromCart,
  getCart,
  validateCartStock
} = require("../controllers/cartController");

router.get("/cart", protect, getCart);
router.get("/cart/validate", protect, validateCartStock);
router.post("/cart", protect, addToCart);
router.put("/cart/update", protect, updateCartQty);
router.delete("/cart/:productId", protect, removeFromCart);

module.exports = router;
