const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: { type: String, trim: true, maxlength: 40, default: "" },
  avatarUrl: { type: String, trim: true, default: "" },
  nonce: { type: String, required: true },
  lastLoginAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
