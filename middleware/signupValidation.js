const User = require('../models/User');

const validateSignup = async (req, res, next) => {
    let { fullName, email, password } = req.body;

    // 1. Sanitize
    fullName = fullName ? fullName.trim() : '';
    email = email ? email.trim().toLowerCase() : '';
    password = password || '';

    req.body.fullName = fullName;
    req.body.email = email;

    // 2. Validate Fields Exist
    if (!fullName || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

   // Name validation
const name = fullName.trim();

const nameRegex = /^[A-Za-z]+( [A-Za-z]+)*$/;

if (!nameRegex.test(name) || name.length < 3) {
    return res.status(400).json({
        message: "Name must contain only letters and a single space between words"
    });
}

    // 4. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email address" });
    }

    // 5. Password Rules
    // Minimum 6 characters, at least one letter and one number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: "Password must be at least 6 characters and include one letter and one number" });
    }

    // 6. Check if email already registered
    try {
        const userExists = await User.findOne({ email });
        if (userExists && userExists.isVerified) {
            return res.status(400).json({ message: "Email is already registered" });
        }
    } catch (err) {
        return res.status(500).json({ message: "Server error during validation" });
    }

    next();
};

module.exports = { validateSignup };
