const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },

        // ✅ SINGLE discountType (fixed)
        discountType: {
            type: String,
            enum: ["percentage", "flat", "free_shipping"],
            required: true
        },

        discountValue: {
            type: Number,
            required: function () {
                return this.discountType !== "free_shipping";
            }
        },

        description: {
            type: String,
            trim: true
        },

        minCartValue: {
            type: Number,
            default: 0
        },

        // ✅ NEW: Max discount cap (for % coupons)
        maxDiscount: {
            type: Number,
            default: null // null = no limit
        },

        // ✅ Usage limits
        totalUsageLimit: {
            type: Number,
            default: null // null = unlimited
        },

        usedCount: {
            type: Number,
            default: 0
        },

        usageLimitPerUser: {
            type: Number,
            default: 1
        },

        usedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        startDate: {
            type: Date,
            required: true
        },


        expiryDate: {
            type: Date,
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Coupon", couponSchema);
