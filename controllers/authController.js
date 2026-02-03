const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');
const generateToken = require("../utils/generateToken");


// SIGNUP LOGIC
exports.registerUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "All fields required" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        const user = await User.create({
            fullName,
            email,
            password: hashedPassword,
            emailOtp: otp,
            emailOtpExpiry: Date.now() + 10 * 60 * 1000
        });

        await sendEmail(
            email,
            "Verify your email - Wings Toys",
            `Your verification OTP is ${otp}`
        );

        res.status(201).json({
            message: "OTP sent to email",
            userId: user._id
        });

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.verifySignupOtp = async (req, res) => {
    const { userId, otp } = req.body;

    const user = await User.findOne({
        _id: userId,
        emailOtp: otp,
        emailOtpExpiry: { $gt: Date.now() }
    });

    if (!user) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiry = undefined;
    await user.save();

   res.status(201).json({
    message: "OTP sent",
    userId: user._id
});

};


// LOGIN LOGIC
// controllers/authController.js
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;


  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = generateToken(user._id, user.role);

  // 👑 ADMIN → token in response
  if (user.role === "admin") {
    return res.json({
      user: {
        id: user._id,
        role: "admin"
      },
      token
    });
  }

  // 👤 USER → token in cookie
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false // true in production
  });

  res.json({
    user: {
      id: user._id,
      role: "user"
    }
  });
};


exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // ✅ FIXED FIELD NAMES
        user.resetOtp = otp;
        user.resetOtpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save();

        await sendEmail(
            email,
            "Wings Toys - Password Reset OTP",
            `Your OTP is ${otp}. It is valid for 10 minutes.`
        );

        res.status(200).json({ message: "OTP sent to email" });

    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;

        const user = await User.findOne({
            resetOtp: otp,
            resetOtpExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        res.status(200).json({ message: "OTP verified", userId: user._id });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        // Find user who recently verified OTP
        const user = await User.findOne({
            resetOtpExpiry: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: "OTP session expired" });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        // Clear OTP fields
        user.resetOtp = undefined;
        user.resetOtpExpiry = undefined;

        await user.save();

        res.status(200).json({ message: "Password reset successful" });

    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.checkAuth = async (req, res) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) return res.status(401).json({ loggedIn: false });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) return res.status(401).json({ loggedIn: false });

    res.json({
      loggedIn: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch {
    res.status(401).json({ loggedIn: false });
  }
};


exports.logoutUser = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};




