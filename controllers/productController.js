const Product = require("../models/Product");

/* =========================
   ➕ ADD PRODUCT (ADMIN)
========================= */
exports.addProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      description,
      price,
      discountPrice,
      stockQuantity,
      stockStatus,
      category
    } = req.body;

    // 🔴 VALIDATION
    if (!name || !sku || !price || !category) {
      return res.status(400).json({
        message: "Product name, SKU, price and category are required"
      });
    }

    // 🔹 FINAL PRICE CALCULATION
    const finalPrice =
      discountPrice && Number(discountPrice) > 0
        ? Number(price) - Number(discountPrice)
        : Number(price);

    const images = req.files
  ? req.files.map(file => `/uploads/products/${file.filename}`)
  : [];

const product = await Product.create({
  name,
  sku,
  description,
  price,
  discountPrice,
  finalPrice,
  stockQuantity,
  stockStatus,
  category,
  images, 
  createdBy: req.user.id
});


    res.status(201).json({
      message: "Product added successfully",
      product
    });

  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   📋 GET ALL PRODUCTS (ADMIN)
========================= */
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(products);

  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* =========================
   🗑 DELETE PRODUCT (ADMIN)
========================= */
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await product.deleteOne();

    res.status(200).json({
      message: "Product deleted successfully"
    });

  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
/* =========================
   🔍 GET SINGLE PRODUCT (PUBLIC)
========================= */
exports.getSingleProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);

  } catch (error) {
    console.error("GET SINGLE PRODUCT ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

