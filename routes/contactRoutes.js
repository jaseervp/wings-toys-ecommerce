const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const contactController = require("../controllers/contactController");

// @route   POST /api/contact
// @desc    Submit contact form
// @access  Public
router.post(
    "/contact",
    [
        check("name", "Name is required").not().isEmpty().trim(),
        check("email", "Please include a valid email").isEmail().normalizeEmail(),
        check("subject", "Subject is required").not().isEmpty().trim(),
        check("message", "Message is required").not().isEmpty().trim(),
    ],
    contactController.submitContactForm
);

module.exports = router;
