const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { getAllUsers } = require('../controllers/adminController');

router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword);
router.get( "/admin/users",protect,adminOnly,getAllUsers);



router.post('/signup', authController.registerUser);
router.post('/login', authController.loginUser);

router.get('/profile', protect, (req, res) => {
    res.json({ message: "Protected data" });
});

module.exports = router;
