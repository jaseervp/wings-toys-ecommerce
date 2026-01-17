const multer = require("multer");
const path = require("path");

/* =========================
   STORAGE CONFIG
========================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/products");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
    );
  }
});

/* =========================
   FILE FILTER (IMAGES ONLY)
========================= */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isMimeValid = allowedTypes.test(file.mimetype);
  const isExtValid = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (isMimeValid && isExtValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, webp) are allowed"), false);
  }
};

/* =========================
   MULTER CONFIG
========================= */



const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter(req, file, cb) {
    if (!file.mimetype.startsWith("image")) {
      cb(new Error("Only images allowed"));
    }
    cb(null, true);
  }
});

module.exports = upload;
