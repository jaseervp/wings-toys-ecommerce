const jwt = require("jsonwebtoken");
const User = require("../models/User");


// ================= PROTECT MIDDLEWARE =================
const protect = async (req, res, next) => {
  try {

    // 1️⃣ SESSION CHECK
    if (req.session && req.session.user) {

      const user = await User.findById(req.session.user._id).select("-password");

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
          redirect: "/login"
        });
      }

      // 🔴 BLOCK CHECK
      if (user.isBlocked) {

        req.session.destroy();

        return res.status(403).json({
          success: false,
          message: "Your account is blocked",
          redirect: "/login"
        });
      }

      req.user = user;
      return next();
    }

    // 2️⃣ JWT CHECK
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    } 
    else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
        redirect: "/login"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
        redirect: "/login"
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account blocked",
        redirect: "/login"
      });
    }

    req.user = user;

    next();

  } catch (error) {

    console.log("AUTH ERROR:", error);

    res.status(401).json({
      success: false,
      message: "Unauthorized",
      redirect: "/login"
    });

  }
};



// ================= ADMIN CHECK =================
const adminOnly = (req, res, next) => {

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only"
    });
  }

  next();
};



// ================= EXPORT =================
module.exports = {
  protect,
  adminOnly
};