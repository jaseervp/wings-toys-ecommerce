const Coupon = require("../models/Coupon");

/*
  CREATE COUPON (ADMIN)
 */
exports.createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountValue,
            description,
            minCartValue,
            maxDiscount,
            usageLimit,
            startDate,
            expiryDate,
            limitPerUser
        } = req.body;



        //  Basic validation
        if (!code || !discountType || !expiryDate) {
            return res.status(400).json({
                message: "Required fields missing"
            });
        }
        if (!startDate || !expiryDate) {
            return res.status(400).json({
                message: "Start date and expiry date are required"
            });
        }

        if (new Date(startDate) > new Date(expiryDate)) {
            return res.status(400).json({
                message: "Start date cannot be after expiry date"
            });
        }


        //  Discount value required except free shipping
        if (
            discountType !== "free_shipping" &&
            (discountValue === undefined || discountValue === null)
        ) {
            return res.status(400).json({
                message: "Discount value is required"
            });
        }

        //  Check duplicate coupon
        const existing = await Coupon.findOne({ code });
        if (existing) {
            return res.status(400).json({
                message: "Coupon already exists"
            });
        }

        //  Negative Value Check
        if (Number(discountValue) < 0 || Number(minCartValue) < 0) {
            return res.status(400).json({ message: "Values cannot be negative" });
        }

        //  Create coupon
        const coupon = await Coupon.create({
            code: code.toUpperCase(),
            discountType,
            discountValue: discountType === "free_shipping" ? 0 : Number(discountValue),
            description: description || "",
            minCartValue: Number(minCartValue) || 0,
            maxDiscount: maxDiscount ? Number(maxDiscount) : null,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            startDate,              // 
            expiryDate,
            isActive: true,
            limitPerUser: Boolean(limitPerUser)
        });


        res.status(201).json({
            message: "Coupon created successfully",
            coupon
        });

    } catch (err) {
        console.error("Create coupon error:", err);
        res.status(500).json({
            message: "Server error"
        });
    }
};

/**
 * UPDATE COUPON (ADMIN)
 */
exports.updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            code,
            discountType,
            discountValue,
            description,
            minCartValue,
            maxDiscount,
            usageLimit,
            startDate,
            expiryDate,
            limitPerUser
        } = req.body;

        // Basic validation
        if (!code || !discountType || !expiryDate) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        if (startDate && expiryDate && new Date(startDate) > new Date(expiryDate)) {
            return res.status(400).json({ message: "Start date cannot be after expiry date" });
        }

        // Check for duplicate code (excluding current coupon)
        const existing = await Coupon.findOne({ code, _id: { $ne: id } });
        if (existing) {
            return res.status(400).json({ message: "Coupon code already exists" });
        }

        //  Negative Value Check
        if (Number(discountValue) < 0 || Number(minCartValue) < 0) {
            return res.status(400).json({ message: "Values cannot be negative" });
        }


        const updatedCoupon = await Coupon.findByIdAndUpdate(
            id,
            {
                code: code.toUpperCase(),
                discountType,
                discountValue: discountType === "free_shipping" ? 0 : Number(discountValue),
                description: description || "",
                minCartValue: Number(minCartValue) || 0,
                maxDiscount: maxDiscount ? Number(maxDiscount) : null,
                usageLimit: usageLimit ? Number(usageLimit) : null,
                startDate,
                expiryDate,
                limitPerUser: Boolean(limitPerUser)
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        res.json({ message: "Coupon updated successfully", coupon: updatedCoupon });

    } catch (err) {
        console.error("Update coupon error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/**
 * GET ACTIVE COUPONS (USER / CHECKOUT)
 */
exports.getActiveCoupons = async (req, res) => {
    try {
        const today = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: today },   //  EXCLUDE UPCOMING
            expiryDate: { $gte: today }
        }).select(
            "code discountType discountValue description minCartValue maxDiscount expiryDate limitPerUser"
        );


        res.status(200).json(coupons);

    } catch (err) {
        console.error("Get coupons error:", err);
        res.status(500).json({
            message: "Failed to fetch coupons"
        });
    }
};
// ADMIN: Get all coupons
exports.getAllCoupons = async (req, res) => {
    try {
        const { search = "", status = "all", sort = "newest" } = req.query;

        let filter = {};

        // Search by code
        if (search) {
            filter.code = { $regex: search, $options: "i" };
        }

        // Status filter
        const today = new Date();

        if (status === "active") {
            filter.startDate = { $lte: today };
            filter.expiryDate = { $gte: today };
        }
        else if (status === "expired") {
            filter.expiryDate = { $lt: today };
        }
        else if (status === "upcoming") {
            filter.startDate = { $gt: today };
        }


        // Sorting
        let sortOption = sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };

        const coupons = await Coupon.find(filter).sort(sortOption);

        res.json(coupons);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch coupons" });
    }
};
/**
 * GET COUPONS FOR CHECKOUT (ACTIVE + UPCOMING)
 */
exports.getCheckoutCoupons = async (req, res) => {
    try {
        const today = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gte: today } //  only expired removed
        }).select(
            "code discountType discountValue description minCartValue maxDiscount startDate expiryDate"
        );

        res.status(200).json(coupons);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch coupons" });
    }
};


// ADMIN: Delete coupon
exports.deleteCoupon = async (req, res) => {
    try {
        await Coupon.findByIdAndDelete(req.params.id);
        res.json({ message: "Coupon deleted" });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};
