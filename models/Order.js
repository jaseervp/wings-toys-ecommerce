// models/Order.js
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
        },
        itemStatus: {
          type: String,
          enum: ["pending", "shipped", "delivered", "canceled"],
          default: "pending"
        }
      }
    ],

    subtotal: Number,
    discount: Number,
    totalAmount: Number,

    paymentMethod: {
      type: String,
      enum: ["cod", "upi", "wallet"]
    },

    paymentStatus: {
      type: String,
      enum: ["paid", "unpaid"]
    },

    orderStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "canceled"],
      default: "pending"
    },

    couponCode: String,

    returnStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected"],
      default: "none"
    },

    returnReason: {
      type: String,
      default: ""
    },

    isRefunded: {
      type: Boolean,
      default: false
    },

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
