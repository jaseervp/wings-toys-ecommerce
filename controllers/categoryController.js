const Category = require("../models/Category");

/**
 * ADD CATEGORY (ADMIN)
 * Supports image upload via Multer
 */
function createSlug(name) {
  return name.toString().toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
}

exports.addCategory = async (req, res) => {
  try {
    console.log("REQ BODY:", req.body);
    console.log("REQ FILE:", req.file);

    const name = req.body?.name?.trim();

    if (!name) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const nameRegex = /^[a-zA-Z0-9\s]+$/;
    if (!nameRegex.test(name)) {
      return res.status(400).json({ message: "Category name cannot contain special characters" });
    }

    if (name.length < 3 || name.length > 20) {
      return res.status(400).json({ message: "Category name must be between 3 and 20 characters" });
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

    const slug = req.body.slug ? createSlug(req.body.slug) : createSlug(name);

    // Check if slug exists
    const slugExists = await Category.findOne({ slug });
    if (slugExists) {
      return res.status(400).json({ message: "Slug already exists, please choose another" });
    }

    const category = await Category.create({
      name,
      slug,
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
 *  GET ALL CATEGORIES
 */
exports.getCategories = async (req, res) => {
  try {
    const { isAdmin } = req.query;
    const matchStage = {};

    // Only filter by active status if explicitly requested
    if (req.query.active === 'true') {
      matchStage.isActive = true;
    }

    // Aggregation to get product count per category
    const categories = await Category.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products"
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          image: 1,
          isActive: 1,
          createdAt: 1,
          productCount: { $size: "$products" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json(categories);

  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 *  UPDATE CATEGORY (ADMIN)
 * Supports optional image replace
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const name = req.body?.name?.trim();

    const updateData = {};

    if (name) {
      const nameRegex = /^[a-zA-Z0-9\s]+$/;
      if (!nameRegex.test(name)) {
        return res.status(400).json({ message: "Category name cannot contain special characters" });
      }

      if (name.length < 3 || name.length > 20) {
        return res.status(400).json({ message: "Category name must be between 3 and 20 characters" });
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
      if (!req.body.slug) {
        updateData.slug = createSlug(name);
      }
    }

    if (req.body.isActive !== undefined) {
      updateData.isActive = req.body.isActive;
    }

    if (req.body.slug) {
      const newSlug = createSlug(req.body.slug);
      const slugExists = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
      if (slugExists) {
        return res.status(400).json({ message: "Slug already exists" });
      }
      updateData.slug = newSlug;
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
 *  DELETE CATEGORY (ADMIN)
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
