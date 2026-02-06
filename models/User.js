const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true
  },

  // ✅ ADMIN PROFILE EXTRA FIELDS
  phone: String,
  dob: Date,
  location: String,
  bio: String,
  avatar: String,

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
  emailOtpExpiry: Date,

  resetOtp: String,
  resetOtpExpiry: Date

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
