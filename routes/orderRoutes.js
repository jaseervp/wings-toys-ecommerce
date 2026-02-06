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

// cancel order
router.post("/:id/cancel", protect, orderController.cancelOrder);

// request return
router.post("/:id/return", protect, orderController.requestReturn);


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

// update return status (approve/reject)
router.put(
  "/admin/:id/return",
  protect,
  adminOnly,
  orderController.updateReturnStatus
);

module.exports = router;
