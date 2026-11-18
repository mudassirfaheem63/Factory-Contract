# MALLAH Token-to-NFT — Hardhat project

This is a self-contained Hardhat 3 subproject intended to live inside your existing
`backend` folder. It does not replace or modify the backend's `package.json`.

## Folder placement

Extract this folder as:

```text
C:\token-nft-project\backend\blockchain\
```

The resulting structure:

```text
backend/
  src/                 # your existing Express backend
  package.json         # your existing backend package
  .env                 # your existing backend environment
  blockchain/
    contracts/
    ignition/modules/
    hardhat.config.ts
    package.json
    .env
```

## Requirements

Hardhat 3 requires Node.js 22.13.0 or later. Your reported Node.js 26.13.0 meets this requirement.

## 1. Install

Open a NEW terminal (leave the backend server terminal running if you want):

```bat
cd C:\token-nft-project\backend\blockchain
npm install
```

## 2. Compile without deploying

```bat
npm run compile
```

This compiles all three contracts and checks their OpenZeppelin imports. Compilation does not deploy anything and does not spend test ETH.

## 3. Configure Sepolia

Copy the example environment file:

```bat
copy .env.example .env
```

Open `blockchain\.env` and set:

- `SEPOLIA_RPC_URL`: an RPC endpoint from a provider you trust.
- `SEPOLIA_PRIVATE_KEY`: private key of a NEW test-only wallet funded with Sepolia ETH.

Never put a mainnet wallet private key here. Never share the private key, seed phrase, or `.env` file. The `.env` file is ignored by Git.

Get Sepolia test ETH from a reputable faucet. Testnet funds have no real monetary value.

## 4. Deploy to Sepolia

```bat
npm run deploy:sepolia
```

Hardhat Ignition deploys in this order:
1. MALLAHToken with 10,000 MLT initial supply.
2. MALLAHNFT with the deployer as initial owner.
3. TokenToNFT with the token and NFT addresses.
4. Transfers NFT ownership to TokenToNFT.

The command prints the deployed contract addresses. Save all three addresses.

## 5. Put addresses into your existing backend .env

Open the existing file:

`C:\token-nft-project\backend\.env`

Add/update these variables with the real addresses printed by deployment:

```env
CHAIN_ID=11155111
TOKEN_CONTRACT_ADDRESS=0x_REAL_TOKEN_ADDRESS
NFT_CONTRACT_ADDRESS=0x_REAL_NFT_ADDRESS
TOKEN_TO_NFT_CONTRACT_ADDRESS=0x_REAL_EXCHANGE_ADDRESS
ENABLE_EVENT_LISTENER=true
```

Only enable the backend event listener after the addresses and RPC_URL in the backend `.env` are correctly configured. The backend's RPC_URL should point to Sepolia too.

Do not put private keys in the backend `.env` for user purchases. Users approve and purchase from their own wallets.

## Purchase flow after deployment

1. Send some MLT from the deployer wallet to a buyer wallet using the ERC-20 `transfer` function.
2. From the buyer wallet, call ERC-20 `approve(TokenToNFTAddress, 5 * 10^18)`.
3. From the buyer wallet, call `buyNFT()` on TokenToNFT.
4. Check the buyer's NFT balance and `ownerOf(1)` (or the next token ID).

## Important notes

- The price is exactly 5 MLT and assumes the payment token has 18 decimals. The included MALLAHToken uses OpenZeppelin's default 18 decimals.
- `buyNFT()` is atomic: if the NFT mint fails, the ERC-20 transfer in that same transaction also reverts.
- `withdrawTokens` is controlled by the TokenToNFT owner (the deployer).
- This is a learning/testnet starter, not an audited production system. Do not deploy to mainnet or handle valuable funds without independent review and tests.
- The Hardhat local simulated network is temporary. For persistent, shared contract addresses use Sepolia or another persistent network.
