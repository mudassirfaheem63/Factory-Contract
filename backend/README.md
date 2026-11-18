# Token-to-NFT Backend

Express + MongoDB backend for a DApp that exchanges 5 ERC-20 tokens for 1 ERC-721 NFT.

## Requirements

- Node.js 20 or newer
- MongoDB Atlas account (or local MongoDB)
- Deployed contracts and an RPC endpoint for blockchain event indexing

## Setup on Windows

```bash
cd backend
npm install
copy .env.example .env
```

Open `.env` and configure `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN`, and (when ready) blockchain settings.

Generate a strong JWT secret rather than using the example value. Keep `.env` private; never commit it.

Start development server:

```bash
npm run dev
```

API runs at `http://localhost:5000`.

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Basic server status |
| GET | `/api/health` | Server and database health |
| GET | `/api/auth/nonce/:walletAddress` | Issue one-time wallet login message |
| POST | `/api/auth/verify` | Verify wallet signature and return JWT |
| GET | `/api/users/me` | Get authenticated profile |
| PATCH | `/api/users/me` | Update username/avatar |
| GET | `/api/nfts` | List indexed NFTs (pagination supported) |
| GET | `/api/nfts/:tokenId` | Get one indexed NFT |
| GET | `/api/nfts/wallet/:walletAddress` | List NFTs indexed for a wallet |
| GET | `/api/transactions` | List indexed purchases (optional walletAddress, page, limit) |

Authenticated endpoints require:
`Authorization: Bearer YOUR_JWT_TOKEN`

### Wallet authentication flow

1. Frontend requests `GET /api/auth/nonce/:walletAddress`.
2. Backend returns a message containing a one-time nonce.
3. User signs that exact message in MetaMask using `signMessage`.
4. Frontend posts `{ "walletAddress", "message", "signature" }` to `/api/auth/verify`.
5. Backend recovers the signer, checks the nonce, invalidates it, and returns a JWT.

A signature is not a blockchain transaction and does not spend gas.

## Blockchain event indexing

The backend does not custody wallets or submit purchases. The user approves tokens and calls `buyNFT()` from their wallet through the frontend. The smart contract enforces payment and minting.

After deploying contracts:
- Set `RPC_URL` and `CHAIN_ID`.
- Set `TOKEN_TO_NFT_CONTRACT_ADDRESS` and `NFT_CONTRACT_ADDRESS`.
- Set `ENABLE_EVENT_LISTENER=true`.

The listener watches the `NFTPurchased(address,uint256,uint256)` event and indexes purchase/NFT records in MongoDB. It assumes the event signature in your deployed TokenToNFT contract matches the ABI in `src/config/blockchain.js`.

For production, add a durable backfill/reconciliation worker: a live event listener alone can miss events while the server is offline. Also consider confirmations, reorg handling, pagination limits, monitoring, and an indexed block cursor.

## Important notes

- `NFT` and `Transaction` collections are populated by the blockchain event listener, not by trusting arbitrary frontend submissions.
- Your NFT contract should emit the expected `NFTPurchased` event from the TokenToNFT contract.
- The current sample NFT contract does not store metadata URI. Add `tokenURI`/metadata support to the Solidity NFT contract if the frontend needs images and descriptions.
- Do not put private keys, seed phrases, or wallet secrets in this backend.
- This starter is a development foundation, not a security-audited production service.
