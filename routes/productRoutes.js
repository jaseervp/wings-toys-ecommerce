const express = require("express");
const router = express.Router();

// Controllers
const {
  addProduct,
  getAllProductsAdmin,
  deleteProduct,
  getSingleProduct,
  getRelatedProducts,
  getPublicProducts
} = require("../controllers/productController");

// Middlewares
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadProduct");

/* =========================
   🛡️ ADMIN ROUTES
========================= */

// ➕ Add Product
router.post(
  "/admin/product",
  protect,
  adminOnly,
  upload.array("images", 5),
  addProduct
);

// 📦 Get All Products (Admin)
router.get(
  "/admin/products",
  protect,
  adminOnly,
  getAllProductsAdmin
);

// 🗑 Delete Product
router.delete(
  "/admin/product/:id",
  protect,
  adminOnly,
  deleteProduct
);

/* =========================
   🌍 PUBLIC ROUTES
========================= */

// 🛒 Get Active Products
router.get("/products", getPublicProducts);

// 🔍 Get Single Product
router.get("/products/:id", getSingleProduct);

// 🔁 Get Related Products
router.get("/products/:id/related", getRelatedProducts);

module.exports = router;
