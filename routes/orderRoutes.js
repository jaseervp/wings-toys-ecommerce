const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");

// ✅ ONE auth import only
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ================= USER =================

// create order
router.post("/", protect, orderController.createOrder);

// get logged-in user's orders
router.get("/my", protect, orderController.getMyOrders);

// get single order (for View Details)
router.get("/my/:id", protect, orderController.getMyOrderById);


// ================= ADMIN =================

// get all orders
router.get("/admin", protect, adminOnly, orderController.getOrders);

// update whole order status
router.put(
  "/admin/:id/status",
  protect,
  adminOnly,
  orderController.updateOrderStatus
);

// update single item status
router.put(
  "/admin/:orderId/item/:itemId/status",
  protect,
  adminOnly,
  orderController.updateItemStatus
);

module.exports = router;
