const asyncHandler = require("../utils/asyncHandler");

const getMyProfile = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { username, avatarUrl } = req.body;
  if (username !== undefined) req.user.username = username;
  if (avatarUrl !== undefined) req.user.avatarUrl = avatarUrl;
  await req.user.save();
  res.json({ success: true, user: req.user });
});

module.exports = { getMyProfile, updateMyProfile };
