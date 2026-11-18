# MALLAH Token-to-NFT Frontend

React + Vite + ethers.js frontend for the MALLAH Token-to-NFT exchange.

## 1. Install

```bash
npm install
```

## 2. Configure environment

Copy `.env.example` to `.env`:

```bat
copy .env.example .env
```

After deploying the three contracts, fill in the real Sepolia addresses:

```env
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Sepolia
VITE_TOKEN_ADDRESS=0x...
VITE_NFT_ADDRESS=0x...
VITE_EXCHANGE_ADDRESS=0x...
VITE_API_BASE_URL=http://localhost:5000/api
```

Do not add private keys or seed phrases to frontend environment variables. Vite exposes `VITE_` variables to the browser.

## 3. Run

```bash
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## 4. Build

```bash
npm run build
```

## User flow

1. Connect MetaMask.
2. Switch to Sepolia if necessary.
3. Check MLT and NFT balances.
4. Approve exactly 5 MLT.
5. Call `buyNFT()` and wait for confirmation.

The frontend calls contracts directly from the user's wallet using ethers v6. It does not store or request wallet private keys. Contract addresses remain blank until deployment.

## Important

- `NFT_PRICE` is assumed to be 5 * 10^18, matching the provided MALLAHToken's 18 decimals.
- The exchange contract must own the NFT contract before `buyNFT()` can succeed.
- The buyer needs Sepolia ETH for gas and at least 5 MLT.
- This is a development starter, not an audited production app.
