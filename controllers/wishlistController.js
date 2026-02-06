const Wishlist = require("../models/Wishlist");
const Product = require("../models/Product");

// Get User Wishlist
exports.getWishlist = async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user.id }).populate(
            "products"
        );

        if (!wishlist) {
            return res.status(200).json([]);
        }

        res.status(200).json(wishlist.products);
    } catch (error) {
        console.error("GET WISHLIST ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Add to Wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;

        let wishlist = await Wishlist.findOne({ user: req.user.id });

        if (!wishlist) {
            wishlist = new Wishlist({ user: req.user.id, products: [] });
        }

        // Check if product already exists
        if (!wishlist.products.includes(productId)) {
            wishlist.products.push(productId);
            await wishlist.save();
            return res.status(200).json({ message: "Added to wishlist" });
        } else {
            return res.status(400).json({ message: "Product already in wishlist" });
        }
    } catch (error) {
        console.error("ADD WISHLIST ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const { id } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user.id });

        if (!wishlist) {
            return res.status(404).json({ message: "Wishlist not found" });
        }

        wishlist.products = wishlist.products.filter(
            (prodId) => prodId.toString() !== id
        );

        await wishlist.save();

        res.status(200).json({ message: "Removed from wishlist" });
    } catch (error) {
        console.error("REMOVE WISHLIST ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
