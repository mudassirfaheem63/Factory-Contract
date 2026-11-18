const { isAddress } = require("ethers");
const NFT = require("../models/NFT");
const asyncHandler = require("../utils/asyncHandler");

const listNFTs = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const [items, total] = await Promise.all([
    NFT.find().sort({ mintedAt: -1 }).skip((page - 1) * limit).limit(limit),
    NFT.countDocuments()
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

const getNFT = asyncHandler(async (req, res) => {
  const nft = await NFT.findOne({ tokenId: req.params.tokenId });
  if (!nft) return res.status(404).json({ success: false, message: "NFT not found in indexed database" });
  res.json({ success: true, data: nft });
});

const getWalletNFTs = asyncHandler(async (req, res) => {
  const walletAddress = req.params.walletAddress.toLowerCase();
  if (!isAddress(walletAddress)) {
    return res.status(400).json({ success: false, message: "Invalid wallet address" });
  }
  const items = await NFT.find({ ownerAddress: walletAddress }).sort({ mintedAt: -1 });
  res.json({ success: true, data: items });
});

module.exports = { listNFTs, getNFT, getWalletNFTs };
