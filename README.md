# EPR-2 QaaS Blockchain

**Quantum-as-a-Service for Blockchain** — Post-quantum cryptography API to protect wallets, transactions, and communication channels against quantum computer attacks.

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](./LICENSE)
[![NIST FIPS 203](https://img.shields.io/badge/NIST-FIPS%20203-blue)](https://csrc.nist.gov/publications/detail/fips/203/final)
[![NIST FIPS 204](https://img.shields.io/badge/NIST-FIPS%20204-blue)](https://csrc.nist.gov/publications/detail/fips/204/final)
[![CNSA 2.0](https://img.shields.io/badge/CNSA-2.0-green)](https://media.defense.gov/2022/Sep/07/2003071834/-1/-1/0/CSA_CNSA_2.0_ALGORITHMS_.PDF)

---

## What is this?

ECDSA (secp256k1) — the signature algorithm used by Bitcoin, Ethereum, and most blockchains — is vulnerable to [Shor's algorithm](https://en.wikipedia.org/wiki/Shor%27s_algorithm) on a sufficiently large quantum computer. The **EPR-2 QaaS** provides NIST-standardized post-quantum cryptographic primitives as a REST API, ready to integrate into any blockchain stack.

### Threat Model

| Attack | Classical Defense | Post-Quantum Defense (this project) |
|--------|-----------------|--------------------------------------|
| Signature forgery | ECDSA / secp256k1 | ML-DSA-65 (FIPS 204) |
| Harvest Now Decrypt Later (HNDL) | ECDH | ML-KEM-768 (FIPS 203) |
| Wallet key recovery | ECC 256-bit | ML-DSA-65 (4032-byte secret key) |

---

## Algorithms

| Algorithm | Standard | Type | Security Level | Use case |
|-----------|----------|------|---------------|----------|
| **ML-KEM-768** | FIPS 203 | Key Encapsulation | NIST Level 3 · 128-bit PQ | Wallet-to-wallet encrypted channels |
| **ML-DSA-65** | FIPS 204 | Digital Signature | NIST Level 3 · 128-bit PQ | Transaction signing, block validation |
| AES-256-GCM | NIST | Symmetric AEAD | 256-bit classical | Payload encryption |
| HKDF-SHA256 | RFC 5869 | Key Derivation | — | Session key derivation from KEM output |

---

## API Endpoints

All endpoints are under `/api/qaas/`.

### Status & Reference

```bash
# Service status and capabilities
GET /api/qaas/status

# Algorithm reference (key sizes, use cases)
GET /api/qaas/algorithms

# Live usage counters
GET /api/qaas/metrics
```

### Wallet Key Generation

Generates a complete quantum-safe wallet: a blockchain address + ML-DSA-65 signing keypair + ML-KEM-768 encryption keypair.

```bash
curl -X POST https://your-instance/api/qaas/wallet/keygen \
  -H "Content-Type: application/json" \
  -d '{"network": "mainnet", "label": "my-wallet"}'
```

**Response:**
```json
{
  "wallet": {
    "address": "qbc1q4a8f3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7",
    "network": "mainnet"
  },
  "signing": {
    "algorithm": "ML-DSA-65",
    "publicKey": "...",
    "privateKey": "...",
    "publicKeyBytes": 1952
  },
  "encryption": {
    "algorithm": "ML-KEM-768",
    "publicKey": "...",
    "privateKey": "...",
    "publicKeyBytes": 1184
  },
  "computeMs": 12
}
```

### Transaction Signing

Sign any blockchain transaction payload with ML-DSA-65.

```bash
curl -X POST https://your-instance/api/qaas/tx/sign \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "from": "qbc1q...",
      "to": "qbc1q...",
      "amount": "1000000",
      "nonce": 42,
      "chainId": "qaas-mainnet-1"
    },
    "privateKey": "<ML-DSA-65 private key hex>"
  }'
```

### Transaction Verification

```bash
curl -X POST https://your-instance/api/qaas/tx/verify \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": { ... },
    "signature": "<hex>",
    "publicKey": "<ML-DSA-65 public key hex>"
  }'
```

### Wallet-to-Wallet Encrypted Channel

Encrypt any payload to a recipient wallet using ML-KEM-768 + AES-256-GCM. Only the recipient can decapsulate with their private key.

```bash
curl -X POST https://your-instance/api/qaas/channel/encapsulate \
  -H "Content-Type: application/json" \
  -d '{
    "recipientKemPublicKey": "<ML-KEM-768 public key hex>",
    "payload": "Confidential transaction memo"
  }'
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 16+

### Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/epr2-qaas-blockchain.git
cd epr2-qaas-blockchain

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — set your DATABASE_URL

# Run database migrations
pnpm --filter @workspace/db run migrate

# Start development servers
pnpm --filter @workspace/api-server run dev   # API on :8080
pnpm --filter @workspace/nexus-forge run dev  # Dashboard on :5173
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_MASTER_KEY` | No | Secret key for owner analytics routes |
| `PORT` | No | API server port (default: 8080) |

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 LTS |
| API | Express 5 + TypeScript |
| PQC Library | `@noble/post-quantum` |
| Frontend | React 19 + Vite 7 + Tailwind CSS 4 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
epr2-qaas-blockchain/
├── artifacts/
│   ├── api-server/          # Express API — PQC engine
│   │   └── src/routes/
│   │       ├── qaas.ts      # QaaS Blockchain endpoints ← core module
│   │       ├── pqcChannel.ts
│   │       └── dilithium.ts
│   └── nexus-forge/         # React dashboard
│       └── src/pages/
│           └── BlockchainQaaS.tsx  # Interactive QaaS demo UI
├── lib/
│   ├── db/                  # PostgreSQL schema + Drizzle ORM
│   └── api-spec/            # OpenAPI 3.1 definition
└── LICENSE
```

---

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/pqc-improvement`)
3. Commit your changes
4. Push and open a PR

---

## Author

**Manuel Alexander Roca González**
EPR-2 Protocol · QaaS Blockchain

---

## Donations

If this project is useful to you, consider supporting its development with Bitcoin:

**Bitcoin (Native SegWit · Bech32m)**

```
bc1par0jrcht3ahefa0puftt8mpfk9y4aqltvlhttp3fs44cpxh3hqxsrkfdhr
```

> Send only **BTC** via the **Bitcoin network** to the address above.

---

## License

[MIT](./LICENSE) — free to use, modify, and distribute.
