const Offer = require("../models/Offer");
const Product = require("../models/Product");
const Category = require("../models/Category");
const fs = require('fs');
const path = require('path');

/* =========================
   CREATE OFFER
========================= */
exports.createOffer = async (req, res) => {
    try {
        const {
            name,
            discountType,
            discountValue,
            targetType,
            targetId,
            startDate,
            endDate,
            isActive
        } = req.body;

        // Validate Image
        if (!req.file) {
            return res.status(400).json({ message: "Banner image is required" });
        }

        const bannerImage = `/uploads/offers/${req.file.filename}`;

        // Helper to get Target Title
        let targetTitle = "All Products";
        if (targetType === 'product' && targetId) {
            const prod = await Product.findById(targetId);
            targetTitle = prod ? prod.name : "Unknown Product";
        } else if (targetType === 'category' && targetId) {
            const cat = await Category.findById(targetId);
            targetTitle = cat ? cat.name : "Unknown Category";
        }

        // Validate Dates
        if (new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "End Date cannot be before Start Date" });
        }

        // Check for Duplicate Name (Case-insensitive)
        const existingOffer = await Offer.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingOffer) {
            // cleanup image if uploaded
            if (req.file) {
                const imagePath = path.join(__dirname, '..', `/uploads/offers/${req.file.filename}`);
                if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
            }
            return res.status(400).json({ message: "Offer with this name already exists" });
        }

        const offer = await Offer.create({
            name,
            bannerImage,
            discountType,
            discountValue,
            targetType,
            targetTitle,
            targetId: targetId || null,
            targetModel: targetType === 'product' ? 'Product' : targetType === 'category' ? 'Category' : null,
            startDate,
            endDate,
            isActive: isActive === 'true'
        });

        res.status(201).json({ message: "Offer created successfully", offer });

    } catch (error) {
        console.error("CREATE OFFER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* =========================
   GET ALL OFFERS
========================= */
exports.getAllOffers = async (req, res) => {
    try {
        const offers = await Offer.find().sort({ createdAt: -1 });
        res.status(200).json(offers);
    } catch (error) {
        console.error("GET OFFERS ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* =========================
   DELETE OFFER
========================= */
exports.deleteOffer = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: "Offer not found" });
        }

        // Delete Image File
        if (offer.bannerImage) {
            const imagePath = path.join(__dirname, '..', offer.bannerImage);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await offer.deleteOne();
        res.status(200).json({ message: "Offer deleted successfully" });

    } catch (error) {
        console.error("DELETE OFFER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* =========================
   GET OFFER BY ID
========================= */
exports.getOfferById = async (req, res) => {
    try {
        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: "Offer not found" });
        }
        res.status(200).json(offer);
    } catch (error) {
        console.error("GET OFFER BY ID ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

/* =========================
   UPDATE OFFER
========================= */
exports.updateOffer = async (req, res) => {
    try {
        const {
            name,
            discountType,
            discountValue,
            targetType,
            targetId,
            startDate,
            endDate,
            isActive
        } = req.body;

        const offer = await Offer.findById(req.params.id);
        if (!offer) {
            return res.status(404).json({ message: "Offer not found" });
        }

        // Check for Duplicate Name (if name changed)
        if (name && name.toLowerCase() !== offer.name.toLowerCase()) {
            const existingOffer = await Offer.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: offer._id }
            });

            if (existingOffer) {
                // If we uploaded a new image, delete it because update failed
                if (req.file) {
                    const newImagePath = path.join(__dirname, '..', `/uploads/offers/${req.file.filename}`);
                    if (fs.existsSync(newImagePath)) fs.unlinkSync(newImagePath);
                }
                return res.status(400).json({ message: "Offer with this name already exists" });
            }
        }

        // Update Image if provided
        if (req.file) {
            // Delete old image
            if (offer.bannerImage) {
                const oldImagePath = path.join(__dirname, '..', offer.bannerImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            offer.bannerImage = `/uploads/offers/${req.file.filename}`;
        }

        // Validate Dates
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({ message: "End Date cannot be before Start Date" });
        }

        // Update Fields
        if (name) offer.name = name;
        if (discountType) offer.discountType = discountType;
        if (discountValue) offer.discountValue = discountValue;
        if (startDate) offer.startDate = startDate;
        if (endDate) offer.endDate = endDate;
        if (isActive !== undefined) offer.isActive = isActive === 'true';

        // Update Target (if changed)
        if (targetType && targetId) {
            offer.targetType = targetType;
            offer.targetId = targetId;

            // Update Target Title
            let targetTitle = "All Products";
            if (targetType === 'product') {
                const prod = await Product.findById(targetId);
                targetTitle = prod ? prod.name : "Unknown Product";
            } else if (targetType === 'category') {
                const cat = await Category.findById(targetId);
                targetTitle = cat ? cat.name : "Unknown Category";
            }
            offer.targetTitle = targetTitle;
            offer.targetModel = targetType === 'product' ? 'Product' : targetType === 'category' ? 'Category' : null;
        } else if (targetType === 'all') {
            offer.targetType = 'all';
            offer.targetId = null;
            offer.targetTitle = 'All Products';
            offer.targetModel = null;
        }

        await offer.save();
        res.status(200).json({ message: "Offer updated successfully", offer });

    } catch (error) {
        console.error("UPDATE OFFER ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
