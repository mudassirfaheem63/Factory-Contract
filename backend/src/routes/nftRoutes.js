const router = require("express").Router();
const { listNFTs, getNFT, getWalletNFTs } = require("../controllers/nftController");

router.get("/", listNFTs);
router.get("/wallet/:walletAddress", getWalletNFTs);
router.get("/:tokenId", getNFT);

module.exports = router;
