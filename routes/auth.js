const express = require('express');
const router = express.Router();
const passport = require("passport");
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');


// ===============================
// 🔵 GOOGLE AUTH
// ===============================


const generateToken = require("../utils/generateToken");

// 1️⃣ Start Google login
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",   // 👈 ADD THIS
  })
);


// 2️⃣ Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login.html",
  }),
  (req, res) => {
    const token = generateToken(req.user._id, req.user.role);

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    res.redirect("/");
  }
);






const { validateSignup } = require('../middleware/signupValidation');

// AUTH
router.post('/signup', validateSignup, authController.registerUser);
router.post('/verify-signup-otp', authController.verifySignupOtp);
router.post('/login', authController.loginUser);
router.post('/logout', authController.logoutUser);
router.get('/check-auth', authController.checkAuth);

// PASSWORD
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);

// PROFILE (normal user / admin)
router.get('/profile', protect, (req, res) => {
  res.json({ message: "Protected data" });
});

module.exports = router;
