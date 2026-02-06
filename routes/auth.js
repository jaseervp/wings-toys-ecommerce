const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// AUTH
router.post('/signup', authController.registerUser);
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
