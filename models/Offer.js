const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        bannerImage: {
            type: String,
            required: true
        },
        discountType: {
            type: String,
            enum: ["percentage", "flat"],
            required: true
        },
        discountValue: {
            type: Number,
            required: true
        },
        targetType: {
            type: String,
            enum: ["all", "category", "product"],
            required: true
        },
        targetTitle: {
            type: String, // Store name of category/product for display
            default: "All Products"
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'targetModel', // Dynamic reference based on targetType
            default: null
        },
        targetModel: {
            type: String,
            enum: ['Product', 'Category', null],
            default: null
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
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

module.exports = mongoose.model("Offer", offerSchema);
