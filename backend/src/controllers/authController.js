const { randomBytes } = require("crypto");
const { verifyMessage, isAddress, getAddress } = require("ethers");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const getNonce = asyncHandler(async (req, res) => {
  const walletAddress = req.params.walletAddress;
  if (!isAddress(walletAddress)) {
    return res.status(400).json({ success: false, message: "Invalid wallet address" });
  }

  const normalized = getAddress(walletAddress).toLowerCase();
  const nonce = randomBytes(16).toString("hex");
  const user = await User.findOneAndUpdate(
    { walletAddress: normalized },
    { $set: { nonce } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const message = [
    "Sign in to Token-to-NFT DApp.",
    `Wallet: ${normalized}`,
    `Nonce: ${nonce}`,
    "This signature does not send a blockchain transaction."
  ].join("\n");

  res.json({ success: true, walletAddress: user.walletAddress, nonce, message });
});

const verifySignature = asyncHandler(async (req, res) => {
  const { walletAddress, signature, message } = req.body;
  if (!isAddress(walletAddress) || !signature || !message) {
    return res.status(400).json({ success: false, message: "walletAddress, signature and message are required" });
  }

  const normalized = getAddress(walletAddress).toLowerCase();
  const user = await User.findOne({ walletAddress: normalized });
  if (!user) {
    return res.status(404).json({ success: false, message: "Request a nonce first" });
  }

  const expectedMessage = [
    "Sign in to Token-to-NFT DApp.",
    `Wallet: ${normalized}`,
    `Nonce: ${user.nonce}`,
    "This signature does not send a blockchain transaction."
  ].join("\n");

  if (message !== expectedMessage) {
    return res.status(400).json({ success: false, message: "Signed message does not match the issued nonce" });
  }

  let recovered;
  try {
    recovered = verifyMessage(message, signature).toLowerCase();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid wallet signature" });
  }

  if (recovered !== normalized) {
    return res.status(401).json({ success: false, message: "Signature does not belong to this wallet" });
  }

  user.nonce = randomBytes(16).toString("hex");
  user.lastLoginAt = new Date();
  await user.save();

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    return res.status(500).json({ success: false, message: "JWT_SECRET must be configured with at least 32 characters" });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d"
  });

  res.json({
    success: true,
    message: "Wallet authenticated",
    token,
    user: {
      id: user._id,
      walletAddress: user.walletAddress,
      username: user.username
    }
  });
});

module.exports = { getNonce, verifySignature };
