const express = require("express");
const router = express.Router();
const { getPublicOffers } = require("../controllers/offerController");

// Get Active Offers (Public)
router.get("/", getPublicOffers);

module.exports = router;
