const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
    const token = req.cookies.wingsToken;
    if (!token) {
        return res.status(401).json({ message: "Not authorized" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, role }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

exports.adminOnly = (req, res, next) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access only" });
    }
    next();
};
