const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please provide your name"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Please provide your email"],
        lowercase: true,
        trim: true
    },
    subject: {
        type: String,
        required: [true, "Please provide a subject"]
    },
    message: {
        type: String,
        required: [true, "Please provide a message"]
    },
    status: {
        type: String,
        enum: ["unread", "read"],
        default: "unread"
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("Contact", contactSchema);
