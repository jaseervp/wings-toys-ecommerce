const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const { getMyProfile } = require("../controllers/userController");
const { updateMyProfile } = require("../controllers/userController")
const {changePassword} = require("../controllers/userController");

const {
    addAddress,
    getAddresses,
    deleteAddress
} = require("../controllers/userController");

const { updateAddress } = require("../controllers/userController");


// GET logged-in user profile
router.get("/me", protect, getMyProfile);
router.put("/me", protect, updateMyProfile);
router.put("/change-password", protect, changePassword);

router.get("/addresses", protect, getAddresses);
router.post("/addresses", protect, addAddress);
router.delete("/addresses/:id", protect, deleteAddress);
router.put("/addresses/:id", protect, updateAddress);


module.exports = router;
