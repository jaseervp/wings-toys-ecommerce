const Category = require("../models/Category");

/**
 * ➕ ADD CATEGORY (ADMIN)
 * Supports image upload via Multer
 */
exports.addCategory = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    console.log("REQ FILE:", req.file);

    const name = req.body?.name?.trim();

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    if (name.length < 3 || name.length > 10) {
      return res.status(400).json({ message: "Category name must be between 3 and 10 characters" });
    }

    // Prevent duplicate categories (Case-insensitive)
    const exists = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    // Require Image
    if (!req.file) {
      return res.status(400).json({ message: "Category image is required" });
    }

    // Image path from Multer
    const imagePath = `/uploads/categories/${req.file.filename}`;

    const category = await Category.create({
      name,
      image: imagePath,
      createdBy: req.user.id
    });

    console.log("CATEGORY SAVED:", category);

    res.status(201).json({
      message: "Category added successfully",
      category
    });

  } catch (error) {
    console.error("ADD CATEGORY ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 📋 GET ALL CATEGORIES
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ createdAt: -1 });

    res.status(200).json(categories);

  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✏️ UPDATE CATEGORY (ADMIN)
 * Supports optional image replace
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body?.name?.trim();

    const updateData = {};

    if (name) {
      if (name.length < 3 || name.length > 10) {
        return res.status(400).json({ message: "Category name must be between 3 and 10 characters" });
      }

      // Check for duplicates (Case-insensitive regex), excluding current category
      const exists = await Category.findOne({
        name: { $regex: new RegExp(`^${name}$`, "i") },
        _id: { $ne: id }
      });

      if (exists) {
        return res.status(400).json({ message: "Category name already exists" });
      }

      updateData.name = name;
    }

    if (req.file) {
      updateData.image = `/uploads/categories/${req.file.filename}`;
    }

    const category = await Category.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category updated successfully",
      category
    });

  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * 🗑️ DELETE CATEGORY (ADMIN)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({
      message: "Category deleted successfully"
    });

  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};
