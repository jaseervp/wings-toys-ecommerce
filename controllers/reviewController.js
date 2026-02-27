const Review = require("../models/Review");
const Order = require("../models/Order");
const Product = require("../models/Product");

// @desc    Add a review
// @route   POST /api/reviews/:productId
// @access  Private
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.productId;
    const userId = req.user._id;

    // 1. Check if user already reviewed this product
    const alreadyReviewed = await Review.findOne({ user: userId, product: productId });
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: "Product already reviewed" });
    }

    // 2. Check if user purchased and received the product
    // Based on Order model: orderStatus: "delivered"
    const order = await Order.findOne({
      user: userId,
      "items.product": productId,
      orderStatus: "delivered"
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message: "You can only review products that have been delivered to you."
      });
    }

    // 3. Create review
    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      comment
    });

    res.status(201).json({
      success: true,
      data: review,
      message: "Review added successfully"
    });
  } catch (error) {
    console.error("ADD_REVIEW_ERROR:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/:productId
// @access  Public
exports.getReviewsByProduct = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      status: "approved"
    })
      .populate("user", "fullName email")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private
exports.updateReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: "Not authorized to update this review" });
    }

    review = await Review.findByIdAndUpdate(
      req.params.id,
      { rating, comment },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: review,
      message: "Review updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    // Check ownership or admin status
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(401).json({ success: false, message: "Not authorized to delete this review" });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all reviews (Admin)
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.adminGetAllReviews = async (req, res) => {
  try {
    const { status, sort, page = 1, limit = 10 } = req.query;
    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    let sortBy = "-createdAt";
    if (sort === "highest") sortBy = "-rating";
    if (sort === "lowest") sortBy = "rating";

    const total = await Review.countDocuments(query);
    const reviews = await Review.find(query)
      .populate("user", "fullName email avatar")
      .populate("product", "name images")
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      total,
      pages: Math.ceil(total / limit),
      data: reviews
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update review status (Admin)
// @route   PATCH /api/admin/reviews/:id/status
// @access  Private/Admin
exports.adminUpdateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "flagged", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.status(200).json({
      success: true,
      message: `Review marked as ${status}`,
      data: review
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get review stats (Admin)
// @route   GET /api/admin/reviews/stats
// @access  Private/Admin
exports.adminGetReviewStats = async (req, res) => {
  try {
    const stats = await Review.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const formattedStats = {
      approved: 0,
      pending: 0,
      flagged: 0,
      total: 0
    };

    stats.forEach(s => {
      if (formattedStats.hasOwnProperty(s._id)) {
        formattedStats[s._id] = s.count;
      }
      formattedStats.total += s.count;
    });

    const avgRatingAgg = await Review.aggregate([
      { $match: { status: "approved" } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" }
        }
      }
    ]);

    formattedStats.averageRating = avgRatingAgg.length > 0 ? avgRatingAgg[0].avgRating.toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};