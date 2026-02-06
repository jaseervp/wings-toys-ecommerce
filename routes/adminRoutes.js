const express = require("express");
const router = express.Router();

const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  getAdminProfile,
  updateAdminProfile,
  changeAdminPassword
} = require("../controllers/adminController");

// 🔐 Admin profile
router.get("/admin/profile", protect, adminOnly, getAdminProfile);
router.put("/admin/profile", protect, adminOnly, updateAdminProfile);

// 🔐 Admin password change
router.put("/admin/change-password", protect, adminOnly, changeAdminPassword);

module.exports = router;
 