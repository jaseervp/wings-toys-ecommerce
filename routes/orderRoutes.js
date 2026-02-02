const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ================= USER =================
router.post("/", protect, orderController.createOrder);

// ================= ADMIN =================
router.get("/admin", protect, adminOnly, orderController.getOrders);

router.put(
  "/admin/:id/status",
  protect,
  adminOnly,
  orderController.updateOrderStatus
);

router.put(
  "/admin/:orderId/item/:itemId/status",
  protect,
  adminOnly,
  orderController.updateItemStatus
);

module.exports = router;
