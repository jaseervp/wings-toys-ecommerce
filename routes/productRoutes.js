const express = require("express");
const router = express.Router();

// Controllers
const {
  addProduct,
  getAllProductsAdmin,
  deleteProduct,
  getSingleProduct,
  getRelatedProducts,
  getPublicProducts,
  toggleTrending,
  updateProduct,
  getProductStock,
  searchProducts
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
  upload.array("productImage", 4),
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

// 🔥 Toggle Trending Status
router.patch(
  "/admin/product/:id/trending",
  protect,
  adminOnly,
  toggleTrending
);

// ✏️ Update Product
router.put(
  "/admin/product/:id",
  protect,
  adminOnly,
  upload.array("productImage", 4),
  updateProduct
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

// 📡 Get Product Stock (Polling)
router.get("/products/:id/stock", getProductStock);

// 🔍 Search Route (API)
router.get("/search/api", searchProducts);

// 🔍 Search Route (Serve Page)
router.get("/search", (req, res) => {
  res.sendFile(require("path").join(__dirname, "../public/User/search.html"));
});

module.exports = router;
