const multer = require("multer");
const path = require("path");
const fs = require("fs");

/* =========================
   ENSURE DIRECTORY EXISTS
========================= */
const uploadDir = "uploads/profiles";
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
        // timestamp-random.ext
        cb(
            null,
            Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
        );
    }
});

/* =========================
   MULTER CONFIG
========================= */
const uploadProfile = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB Limit
    fileFilter(req, file, cb) {
        if (!file.mimetype.startsWith("image")) {
            return cb(new Error("Only images are allowed"));
        }
        cb(null, true);
    }
});

module.exports = uploadProfile;
