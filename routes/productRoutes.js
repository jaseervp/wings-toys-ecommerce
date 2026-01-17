const express = require("express");
const router = express.Router();

const {
  addProduct,
  getAllProducts,
  deleteProduct,
  getSingleProduct
} = require("../controllers/productController");


const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadProduct"); // multer config
const Product = require("../models/Product");


/**
 * ➕ ADD PRODUCT (ADMIN)
 * POST /api/admin/product
 */
router.post(
  "/admin/product",
  protect,
  adminOnly,
  (req, res, next) => {
    upload.array("images", 5)(req, res, function (err) {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "Image too large. Max size is 2MB"
          });
        }
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  addProduct
);

/**
 * 📦 GET ALL PRODUCTS (ADMIN)
 * GET /api/admin/products
 */
router.get(
  "/admin/products",
  protect,
  adminOnly,
  getAllProducts
);

/**
 * 🗑️ DELETE PRODUCT (OPTIONAL – READY FOR UI)
 */
router.delete(
  "/admin/product/:id",
  protect,
  adminOnly,
  deleteProduct
);

/**
 * 🌍 GET ALL PRODUCTS (PUBLIC – SHOP PAGE)
 * GET /api/products
 */
router.get("/products", async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error("FETCH PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================
   🔍 GET SINGLE PRODUCT (PUBLIC)
========================= */
router.get("/products/:id", getSingleProduct);


module.exports = router;

