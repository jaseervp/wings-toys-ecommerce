const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
  },
  rating: {
    type: Number,
    required: [true, "Please provide a rating"],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, "Please provide a comment"],
    trim: true
  },
  status: {
    type: String,
    enum: ["pending", "approved", "flagged"],
    default: "pending"
  }
}, { timestamps: true });

// Prevent user from submitting more than one review per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Static method to get avg rating and save
reviewSchema.statics.getAverageRating = async function (productId) {
  const obj = await this.aggregate([
    {
      $match: { product: productId }
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        numReviews: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj.length > 0) {
      await mongoose.model("Product").findByIdAndUpdate(productId, {
        averageRating: Math.round(obj[0].averageRating * 10) / 10,
        numReviews: obj[0].numReviews
      });
    } else {
      await mongoose.model("Product").findByIdAndUpdate(productId, {
        averageRating: 0,
        numReviews: 0
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageRating after save
reviewSchema.post("save", function () {
  this.constructor.getAverageRating(this.product);
});

// Call getAverageRating before remove
reviewSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    await doc.constructor.getAverageRating(doc.product);
  }
});

// For update (post save also covers update if using save())
// But if using findByIdAndUpdate, we need post findOneAndUpdate
reviewSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    await doc.constructor.getAverageRating(doc.product);
  }
});

module.exports = mongoose.model("Review", reviewSchema);