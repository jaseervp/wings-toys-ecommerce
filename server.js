require('dotenv').config(); 

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session'); 
const passport = require('./config/passport'); 

// Routes
const authRoutes = require('./routes/auth');
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const app = express();



//  BASIC MIDDLEWARE

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// =============================
// STATIC FILES
// =============================

app.use(express.static(path.join(__dirname, 'public/User')));
app.use('/admin', express.static(path.join(__dirname, 'public/Admin')));
app.use('/images', express.static(path.join(__dirname, 'public/Images')));
app.use("/uploads", express.static("uploads"));


// =============================
//  SESSION SETUP (Required for Google Auth)
// =============================
app.use(
  session({
    secret: process.env.SESSION_SECRET || "mysupersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true only in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
  })
);


// =============================
//  PASSPORT SETUP
// =============================
app.use(passport.initialize());
app.use(passport.session());


// =============================
//  DATABASE CONNECTION
// =============================
const dbURI = process.env.MONGO_URI;

mongoose.connect(dbURI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ Connection Error:", err));


// =============================
//  ROUTES
// =============================

// Google Auth Route
app.use('/api', authRoutes);



// Other API Routes
app.use('/api', categoryRoutes);
app.use('/api', productRoutes);
app.use('/api/admin', require("./routes/adminRoutes"));
app.use('/api', require("./routes/cartRoutes"));
app.use('/api', require("./routes/couponRoutes"));
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payment', require("./routes/paymentRoutes"));
app.use('/api/wishlist', require("./routes/wishlistRoutes"));
app.use('/api/admin/offers', require("./routes/offerRoutes"));
app.use('/api/offers', require("./routes/publicOfferRoutes"));
app.use('/api/wallet', require("./routes/walletRoutes"));
app.use("/api", reviewRoutes);
app.use("/api", require("./routes/contactRoutes"));


// =============================
//  START SERVER
// =============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
