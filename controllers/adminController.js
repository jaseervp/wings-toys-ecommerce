const User = require("../models/User");
const bcrypt = require("bcryptjs");

/* ================= GET ADMIN PROFILE ================= */
exports.getAdminProfile = async (req, res) => {
  const admin = await User.findById(req.user._id).select("-password");
  res.json(admin);
};

/* ================= UPDATE ADMIN PROFILE ================= */
exports.updateAdminProfile = async (req, res) => {
  try {
    const updates = {
      fullName: req.body.fullName,
      email: req.body.email,
      phone: req.body.phone,
      dob: req.body.dob,
      location: req.body.location,
      bio: req.body.bio
    };

    // 📸 If file uploaded, add to updates
    if (req.file) {
      updates.avatar = `/uploads/profiles/${req.file.filename}`;
    }

    // Filter undefined
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const admin = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    res.json({
      message: "Admin profile updated",
      admin
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= CHANGE ADMIN PASSWORD ================= */
exports.changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password incorrect" });
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password updated successfully" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
