const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true
        },
        price: {
          type: Number,
          required: true
        }
      }
    ], itemStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending"
    },

    subtotal: {
      type: Number,
      required: true
    },

    discount: {
      type: Number,
      default: 0
    },

    totalAmount: {
      type: Number,
      required: true
    },

    couponCode: {
      type: String,
      default: null
    },

    paymentMethod: {
      type: String,
      enum: ["wallet", "upi", "cod"],
      required: true
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid", "failed"],
      default: "unpaid"
    },

    orderStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
