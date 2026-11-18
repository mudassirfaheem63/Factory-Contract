const router = require("express").Router();
const { getNonce, verifySignature } = require("../controllers/authController");

router.get("/nonce/:walletAddress", getNonce);
router.post("/verify", verifySignature);

module.exports = router;
