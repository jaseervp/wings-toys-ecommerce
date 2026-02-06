const User = require("../models/User");
const bcrypt = require("bcryptjs");

/* ================= GET ADMIN PROFILE ================= */
exports.getAdminProfile = async (req, res) => {
  const admin = await User.findById(req.user._id).select("-password");
  res.json(admin);
};

/* ================= UPDATE ADMIN PROFILE ================= */
exports.updateAdminProfile = async (req, res) => {
  const allowedFields = [
    "fullName",
    "email",
    "phone",
    "dob",
    "location",
    "bio"
  ];

  const updates = {};
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  const admin = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  ).select("-password");

  res.json({
    message: "Admin profile updated",
    admin
  });
};

/* ================= CHANGE ADMIN PASSWORD ================= */
exports.changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  const admin = await User.findById(req.user._id);

  const isMatch = await bcrypt.compare(currentPassword, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Current password incorrect" });
  }

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();

  res.json({ message: "Password updated successfully" });
};
