const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    fullName: { 
        type: String, 
        required: [true, "Name is required"],
        trim: true 
    },

    email: { 
        type: String, 
        required: [true, "Email is required"], 
        unique: true,
        lowercase: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 
            'Please fill a valid email address'
        ]
    },

    password: { 
        type: String, 
        required: [true, "Password is required"],
        minlength: 6 
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },


    // 🔐 FORGOT PASSWORD OTP FIELDS (NEW)
    resetOtp: {
        type: String
    },
    resetOtpExpiry: {
        type: Date
    }

}, { timestamps: true }); // Adds createdAt & updatedAt

module.exports = mongoose.model('User', UserSchema);
