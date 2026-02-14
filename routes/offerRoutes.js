const express = require("express");
const router = express.Router();
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadOffer");
const { createOffer, getAllOffers, deleteOffer,
    getOfferById,
    updateOffer
} = require("../controllers/offerController");

// Create Offer
router.post(
    "/",
    protect,
    adminOnly,
    upload.single("bannerImage"),
    createOffer
);

// Get All Offers
router.get(
    "/",
    protect,
    adminOnly,
    getAllOffers
);

// Get Offer By ID
router.get(
    "/:id",
    protect,
    adminOnly,
    getOfferById
);

// Update Offer
router.put(
    "/:id",
    protect,
    adminOnly,
    upload.single("bannerImage"),
    updateOffer
);

// Delete Offer
router.delete(
    "/:id",
    protect,
    adminOnly,
    deleteOffer
);

module.exports = router;
