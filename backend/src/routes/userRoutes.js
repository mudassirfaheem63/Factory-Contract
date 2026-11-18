const router = require("express").Router();
const { body } = require("express-validator");
const { protect } = require("../middleware/authMiddleware");
const validateRequest = require("../utils/validation");
const { getMyProfile, updateMyProfile } = require("../controllers/userController");

router.get("/me", protect, getMyProfile);
router.patch("/me", protect,
  body("username").optional().isString().isLength({ max: 40 }),
  body("avatarUrl").optional().isURL(),
  validateRequest,
  updateMyProfile
);

module.exports = router;
