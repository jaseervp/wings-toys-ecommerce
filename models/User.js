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
 addresses: [
    {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        addressLine: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        pincode: { type: String, required: true },
        isDefault: { type: Boolean, default: false }
    }
],

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isVerified: {
    type: Boolean,
    default: false
},
emailOtp: String,
emailOtpExpiry: Date
,

    // 🔐 FORGOT PASSWORD OTP FIELDS (NEW)
    resetOtp: {
        type: String
    },
    resetOtpExpiry: {
        type: Date
    }

}, { timestamps: true }); // Adds createdAt & updatedAt

module.exports = mongoose.model('User', UserSchema);
