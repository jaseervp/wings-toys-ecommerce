
const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  // 1️⃣ Check for session-based user first (as requested)
  if (req.session && req.session.user) {
    req.user = await User.findById(req.session.user.id || req.session.user._id).select("-password");
    if (req.user) {
      if (req.user.isBlocked) {
        return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
      }
      return next();
    }
  }

  // 2️⃣ Check for JWT in headers or cookies
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized - No Token Found" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized - User not found" });
    }

    if (req.user.isBlocked) {
      return res.status(403).json({ message: "Your account has been blocked. Please contact support." });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized - Invalid token" });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};



