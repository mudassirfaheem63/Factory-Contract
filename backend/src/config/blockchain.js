const { JsonRpcProvider, Contract, isAddress } = require("ethers");

const PURCHASE_ABI = [
  "event NFTPurchased(address indexed buyer, uint256 indexed tokenId, uint256 amountPaid)"
];

function getProvider() {
  if (!process.env.RPC_URL) throw new Error("RPC_URL is not configured");
  return new JsonRpcProvider(
    process.env.RPC_URL,
    process.env.CHAIN_ID ? Number(process.env.CHAIN_ID) : undefined
  );
}

function getPurchaseContract() {
  const address = process.env.TOKEN_TO_NFT_CONTRACT_ADDRESS;
  if (!address || !isAddress(address)) {
    throw new Error("A valid TOKEN_TO_NFT_CONTRACT_ADDRESS is required");
  }
  return new Contract(address, PURCHASE_ABI, getProvider());
}

module.exports = { getProvider, getPurchaseContract, PURCHASE_ABI };
