const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword
} = require("../controllers/adminController");

const uploadProfile = require("../middleware/uploadProfile");

// 🔐 Admin profile
router.get("/profile", protect, adminOnly, getAdminProfile);
router.put("/profile", protect, adminOnly, uploadProfile.single("avatar"), updateAdminProfile);
router.put("/change-password", protect, adminOnly, changeAdminPassword);


module.exports = router;
