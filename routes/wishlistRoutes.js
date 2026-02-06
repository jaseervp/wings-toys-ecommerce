const express = require("express");
const router = express.Router();
const {
    getWishlist,
    addToWishlist,
    removeFromWishlist
} = require("../controllers/wishlistController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.get("/", getWishlist);
router.post("/", addToWishlist);
router.delete("/:id", removeFromWishlist);

module.exports = router;
