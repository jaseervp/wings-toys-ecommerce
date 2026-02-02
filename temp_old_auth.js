const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/sendEmail');

// SIGNUP LOGIC
exports.registerUser = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({ message: "Please enter all fields" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({ fullName, email, password: hashedPassword });
        await newUser.save();

        res.status(201).json({ message: "User created successfully" });
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err.message });
    }
};

// LOGIN LOGIC
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
);


        // SET COOKIE HERE
        res.cookie('wingsToken', token, {
            httpOnly: true, // Security: JS cannot access this cookie
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({ 
    message: "Login successful",
    user: {
        id: user._id,
        fullName: user.fullName,
        role: user.role
    }
});

    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
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

        // Γ£à FIXED FIELD NAMES
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


