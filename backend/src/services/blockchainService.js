const { getPurchaseContract } = require("../config/blockchain");
const NFT = require("../models/NFT");
const Transaction = require("../models/Transaction");

function startPurchaseListener() {
  try {
    const contract = getPurchaseContract();

    contract.on("NFTPurchased", async (buyer, tokenId, amountPaid, event) => {
      try {
        const txHash = event.log.transactionHash.toLowerCase();
        const blockNumber = Number(event.log.blockNumber);
        const buyerAddress = buyer.toLowerCase();

        await Transaction.updateOne(
          { txHash },
          {
            $setOnInsert: {
              txHash,
              walletAddress: buyerAddress,
              tokenId: tokenId.toString(),
              amountPaid: amountPaid.toString(),
              chainId: Number(process.env.CHAIN_ID) || null,
              blockNumber,
              status: "confirmed",
              eventName: "NFTPurchased"
            }
          },
          { upsert: true }
        );

        await NFT.updateOne(
          { tokenId: tokenId.toString() },
          {
            $set: {
              tokenId: tokenId.toString(),
              ownerAddress: buyerAddress,
              contractAddress: (process.env.NFT_CONTRACT_ADDRESS || "").toLowerCase(),
              mintTransactionHash: txHash,
              mintedAt: new Date()
            }
          },
          { upsert: true }
        );

        console.log(`Indexed NFT purchase: ${txHash}`);
      } catch (error) {
        console.error("Failed to index NFTPurchased event:", error.message);
      }
    });

    console.log("NFTPurchased event listener started");
  } catch (error) {
    console.error("Blockchain listener not started:", error.message);
  }
}

module.exports = { startPurchaseListener };
