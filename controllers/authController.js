const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/sendEmail");

/* =====================
   SIGNUP (SEND OTP)
===================== */
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 10 * 60 * 1000,
      otpPurpose: "signup",
      isVerified: false
    });

    await sendEmail(
      email,
      "Wings – Email Verification OTP",
      `Your OTP is ${otp}`
    );

    res.status(201).json({
      message: "OTP sent to email",
      userId: user._id
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================
   VERIFY OTP (SINGLE ROUTE)
===================== */
exports.verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findOne({
      _id: userId,
      otp,
      otpExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.otpPurpose === "signup") {
      user.isVerified = true;
    }

    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpPurpose = undefined;
    await user.save();

    res.json({ message: "OTP verified successfully" });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

/* =====================
   LOGIN
===================== */
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  // 🔴 ADMIN → localStorage
  if (user.role === "admin") {
    return res.json({
      user: { role: "admin" },
      token
    });
  }

  // 🔵 USER → cookie
  res.cookie("wingsToken", token, {
    httpOnly: true,
    sameSite: "Lax"
  });

  res.json({
    user: { role: "user" }
  });
};

/* =====================
   FORGOT PASSWORD (SEND OTP)
===================== */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.otp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  user.otpPurpose = "reset";
  await user.save();

  await sendEmail(email, "Password Reset OTP", `Your OTP is ${otp}`);

  res.json({ message: "OTP sent" });
};

/* =====================
   RESET PASSWORD
===================== */
exports.resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.status(400).json({ message: "Invalid request" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password reset successful" });
};
