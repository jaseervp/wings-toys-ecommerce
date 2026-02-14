const Product = require("../models/Product");
const Offer = require("../models/Offer");
const { calculateProductFinalPrice } = require("../utils/priceCalculator");

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
    const { search, category, stockStatus, sort } = req.query;

    let query = {};

    // 🔍 Search (Name or SKU)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ];
    }

    // 📂 Filter by Category
    if (category) {
      query.category = category;
    }

    // 📦 Filter by Stock Status
    if (stockStatus) {
      query.stockStatus = stockStatus;
    }

    // 🔃 Sorting
    let sortOption = { createdAt: -1 }; // Default: Newest
    if (sort === "price-asc") sortOption = { finalPrice: 1 };
    if (sort === "price-desc") sortOption = { finalPrice: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "name-asc") sortOption = { name: 1 };

    const products = await Product.find(query)
      .populate("category", "name")
      .sort(sortOption);

    res.status(200).json(products);

  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ✏️ UPDATE PRODUCT (ADMIN)
========================= */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      name,
      sku,
      description,
      price,
      discountPrice,
      stockQuantity,
      stockStatus,
      category,
      existingImages // JSON string or array of URLs to KEEP
    } = req.body;

    // 1. Update basic fields
    product.name = name || product.name;
    product.sku = sku || product.sku;
    product.description = description || product.description;
    product.price = price || product.price;
    product.discountPrice = discountPrice || 0;
    product.stockQuantity = stockQuantity || 0;
    product.stockStatus = stockStatus || product.stockStatus;
    product.category = category || product.category;

    // Recalculate Final Price
    product.finalPrice =
      product.discountPrice && Number(product.discountPrice) > 0
        ? Number(product.price) - Number(product.discountPrice)
        : Number(product.price);

    // 2. Handle Images
    // - existingImages: URLs of images the user wants to KEEP
    // - req.files: NEW images uploaded

    let keptImages = [];
    if (existingImages) {
      // existingImages might be a single string or array, normalize it
      const existingList = Array.isArray(existingImages) ? existingImages : [existingImages];
      keptImages = existingList.filter(img => typeof img === 'string' && img.startsWith('/uploads'));
    }

    let newImages = [];
    if (req.files && req.files.length > 0) {
      newImages = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    // Combine: Kept images first, then new ones
    product.images = [...keptImages, ...newImages];

    await product.save();

    res.status(200).json({
      message: "Product updated successfully",
      product
    });

  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    if (error.code === 11000 && error.keyPattern?.sku) {
      return res.status(400).json({
        message: "SKU already exists. Please use a unique SKU."
      });
    }
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   🛒 GET ACTIVE PRODUCTS (PUBLIC)
========================= */
exports.getPublicProducts = async (req, res) => {
  try {
    const { sort, category, trending } = req.query;
    let sortOption = { createdAt: -1 }; // Default: Newest
    let filter = { isActive: true };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (trending === 'true') {
      filter.isTrending = true;
    }

    if (sort === "price-asc") {
      sortOption = { finalPrice: 1 };
    } else if (sort === "price-desc") {
      sortOption = { finalPrice: -1 };
    } else if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort(sortOption);

    // --- Dynamic Price Calculation ---
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    const productsWithOffers = products.map(product => {
      const productObj = product.toObject();
      const priceDetails = calculateProductFinalPrice(productObj, activeOffers);
      return { ...productObj, ...priceDetails };
    });

    res.status(200).json(productsWithOffers);

  } catch (error) {
    console.error("FETCH PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle Trending Status
exports.toggleTrending = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.isTrending = !product.isTrending;
    await product.save();

    res.status(200).json({
      message: `Product marked as ${product.isTrending ? "Trending" : "Not Trending"}`,
      isTrending: product.isTrending
    });

  } catch (error) {
    console.error("TOGGLE TRENDING ERROR:", error);
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

    // --- Dynamic Price Calculation ---
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    const productObj = product.toObject();
    const priceDetails = calculateProductFinalPrice(productObj, activeOffers);

    res.status(200).json({ ...productObj, ...priceDetails });

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
      .select("name finalPrice images category discountPrice price"); // Added discountPrice/price for calc

    // --- Dynamic Price Calculation ---
    const activeOffers = await Offer.find({
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });

    const relatedWithOffers = relatedProducts.map(p => {
      const pObj = p.toObject();
      const priceDetails = calculateProductFinalPrice(pObj, activeOffers);
      return { ...pObj, ...priceDetails };
    });

    res.status(200).json(relatedWithOffers);

  } catch (error) {
    console.error("RELATED PRODUCTS ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
