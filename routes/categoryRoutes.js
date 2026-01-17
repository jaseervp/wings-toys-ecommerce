const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory
} = require("../controllers/categoryController");

router.post(
  "/admin/category",
  protect,
  adminOnly,
  upload.single("image"),
  addCategory
);

router.get("/categories", protect, getCategories);

router.put(
  "/admin/category/:id",
  protect,
  adminOnly,
  upload.single("image"),
  updateCategory
);

router.delete(
  "/admin/category/:id",
  protect,
  adminOnly,
  deleteCategory
);

module.exports = router;
