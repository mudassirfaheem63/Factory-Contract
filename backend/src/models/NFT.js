const mongoose = require("mongoose");

const nftSchema = new mongoose.Schema({
  tokenId: { type: String, required: true, unique: true, index: true },
  ownerAddress: { type: String, required: true, lowercase: true, index: true },
  contractAddress: { type: String, lowercase: true, default: "" },
  name: { type: String, trim: true, default: "" },
  description: { type: String, trim: true, default: "" },
  imageUrl: { type: String, trim: true, default: "" },
  metadataUri: { type: String, trim: true, default: "" },
  mintTransactionHash: { type: String, lowercase: true, default: "" },
  mintedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model("NFT", nftSchema);
