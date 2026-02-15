const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { addFunds, verifyFundAddition } = require("../controllers/walletController");

// Protect all wallet routes
router.post("/add-funds", protect, addFunds);
router.post("/verify-funds", protect, verifyFundAddition);

module.exports = router;
