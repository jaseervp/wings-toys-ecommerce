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

// 👥 Customers Management
router.get("/customers", protect, adminOnly, require("../controllers/adminController").getAllCustomers);
router.get("/customers/analytics", protect, adminOnly, require("../controllers/adminController").getCustomerAnalytics);
router.get("/customers/:id", protect, adminOnly, require("../controllers/adminController").getCustomerDetails);
router.put("/customers/:id/block", protect, adminOnly, require("../controllers/adminController").blockUser);
router.delete("/customers/:id", protect, adminOnly, require("../controllers/adminController").deleteUser);


// 📊 Dashboard Stats
// 📊 Dashboard Stats
router.get("/dashboard", protect, adminOnly, require("../controllers/adminController").getDashboardStats);
router.get("/transactions", protect, adminOnly, require("../controllers/adminController").getAllTransactions);
router.get("/report", protect, adminOnly, require("../controllers/adminController").getDashboardReport);

module.exports = router;
