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
  googleId: {              // ✅ ADD THIS
  type: String
},


 password: {
  type: String
},



  // ADMIN PROFILE EXTRA FIELDS
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

  isBlocked: {
    type: Boolean,
    default: false
  },

  emailOtp: String,
  emailOtpExpiry: Date,

  resetOtp: String,
  resetOtpExpiry: Date,

  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      amount: { type: Number, required: true },
      type: {
        type: String,
        enum: ["credit", "debit"],
        required: true
      },
      reason: { type: String, required: true },
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },

  addresses: [{
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
  }]

}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
