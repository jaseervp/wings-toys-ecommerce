const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },


    description: {
      type: String,
      trim: true
    },

    price: {
      type: Number,
      required: true
    },

    discountPrice: {
      type: Number,
      default: 0
    },

    finalPrice: {
      type: Number,
      required: true
    },

    stockQuantity: {
      type: Number,
      default: 0 // 0 means unlimited when isUnlimited = true
    },

    isUnlimited: {
      type: Boolean,
      default: false
    },

    stockStatus: {
      type: String,
      enum: ["In Stock", "Out of Stock"],
      default: "In Stock"
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true
    },

    images: {
      type: [String],
      default: []
    },

    isActive: {
      type: Boolean,
      default: true
    },

    isTrending: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

productSchema.virtual("isOutOfStock").get(function () {
  return !this.isUnlimited && this.stockQuantity <= 0;
});

module.exports = mongoose.model("Product", productSchema);
