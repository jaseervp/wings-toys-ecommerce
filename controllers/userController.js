const User = require("../models/User");
const bcrypt = require("bcryptjs");


exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateMyProfile = async (req, res) => {
    try {
        const { firstName, lastName, email } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (firstName || lastName) {
            user.fullName = `${firstName || ""} ${lastName || ""}`.trim();
        }

        if (email) user.email = email;


        await user.save();

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Profile update failed" });
    }
};



exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // 1. Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "All password fields are required"
            });
        }

        // 2. Check new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "New password and confirm password do not match"
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3. Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                message: "Current password is incorrect"
            });
        }

        // 4. Hash & save new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Password update failed" });
    }
};
exports.addAddress = async (req, res) => {
    try {
        console.log("Add Address Body:", req.body);
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.addresses.push(req.body);
        await user.save();

        res.json({
            success: true,
            addresses: user.addresses
        });
    } catch (err) {
        console.error("ADD ADDRESS ERROR:", err);
        res.status(500).json({ message: "Failed to add address: " + err.message });
    }
};
exports.getAddresses = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user.addresses);
    } catch (err) {
        res.status(500).json({ message: "Failed to fetch addresses" });
    }
};
exports.deleteAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        user.addresses = user.addresses.filter(
            addr => addr._id.toString() !== req.params.id
        );

        await user.save();
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: "Delete failed" });
    }
};

exports.updateAddress = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const address = user.addresses.find(
            addr => addr._id.toString() === req.params.id
        );

        if (!address) {
            return res.status(404).json({ message: "Address not found" });
        }

        // Update fields safely
        address.fullName = req.body.fullName;
        address.phone = req.body.phone;
        address.addressLine = req.body.addressLine;
        address.city = req.body.city;
        address.state = req.body.state;
        address.pincode = req.body.pincode;
        address.isDefault = req.body.isDefault;

        // OPTIONAL: allow only one default
        if (req.body.isDefault) {
            user.addresses.forEach(a => {
                if (a._id.toString() !== req.params.id) {
                    a.isDefault = false;
                }
            });
        }

        await user.save();

        res.json({ success: true });

    } catch (error) {
        console.error("UPDATE ADDRESS ERROR:", error);
        res.status(500).json({ message: "Update address failed" });
    }
};



