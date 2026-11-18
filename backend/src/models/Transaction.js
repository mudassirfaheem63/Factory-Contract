const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true, lowercase: true, index: true },
  walletAddress: { type: String, required: true, lowercase: true, index: true },
  tokenId: { type: String, default: "" },
  amountPaid: { type: String, default: "" },
  chainId: { type: Number, default: null },
  blockNumber: { type: Number, default: null },
  status: {
    type: String,
    enum: ["confirmed", "pending", "failed"],
    default: "confirmed"
  },
  eventName: { type: String, default: "NFTPurchased" }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);
