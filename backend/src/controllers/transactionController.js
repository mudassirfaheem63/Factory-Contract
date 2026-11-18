const { isAddress } = require("ethers");
const Transaction = require("../models/Transaction");
const asyncHandler = require("../utils/asyncHandler");

const getTransactions = asyncHandler(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
  const filter = {};
  if (req.query.walletAddress) {
    if (!isAddress(req.query.walletAddress)) {
      return res.status(400).json({ success: false, message: "Invalid wallet address" });
    }
    filter.walletAddress = req.query.walletAddress.toLowerCase();
  }

  const [items, total] = await Promise.all([
    Transaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Transaction.countDocuments(filter)
  ]);
  res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

module.exports = { getTransactions };
