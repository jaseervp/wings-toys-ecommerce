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

    if (!name || !sku || !price || !category) {
      return res.status(400).json({
        message: "Product name, SKU, price and category are required"
      });
    }

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

  // ✅ HANDLE DUPLICATE SKU ERROR
  if (error.code === 11000 && error.keyPattern?.sku) {
    return res.status(400).json({
      message: "SKU already exists. Please use a unique SKU."
    });
  }

  res.status(500).json({
    message: "Server error"
  });
}
};

/* =========================
   📦 GET ALL PRODUCTS (ADMIN)
========================= */
exports.getAllProductsAdmin = async (req, res) => {
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
   🛒 GET ACTIVE PRODUCTS (PUBLIC)
========================= */
exports.getPublicProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate("category", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(products);

  } catch (error) {
    console.error("FETCH PRODUCTS ERROR:", error);
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
   🔍 GET SINGLE PRODUCT
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

/* =========================
   🔁 GET RELATED PRODUCTS
========================= */
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
      .limit(4)
      .populate("category", "name")
      .select("name finalPrice images category");

    res.status(200).json(relatedProducts);

  } catch (error) {
    console.error("RELATED PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
