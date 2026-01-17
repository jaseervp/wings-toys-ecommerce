require('dotenv').config(); // MUST be at the very top
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const cookieParser = require('cookie-parser');
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");









const app = express();
app.use(cookieParser());
app.use(express.urlencoded({ extended: true })); // 🔴 IMPORTANT

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use("/uploads", express.static("uploads"));



// 1. CONNECT TO DATABASE using ENV variable
const dbURI = process.env.MONGO_URI; 
mongoose.connect(dbURI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ Connection Error:", err));

// 2. API ROUTES
app.use('/api', authRoutes);
app.use("/api", categoryRoutes);
app.use("/api", productRoutes);

// 3. START SERVER using ENV variable
const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));