const multer = require("multer");
const path = require("path");
const fs = require('fs');

// Ensure directory exists
const uploadDir = 'uploads/offers';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   STORAGE CONFIG
========================= */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(
            null,
            "offer-" + Date.now() + path.extname(file.originalname)
        );
    }
});

/* =========================
   MULTER CONFIG
========================= */
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for banners
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith("image")) {
            cb(new Error("Only images allowed"));
        }
        cb(null, true);
    }
});

module.exports = upload;
