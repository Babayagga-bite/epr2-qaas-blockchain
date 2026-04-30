# Contributing to EPR-2 QaaS Blockchain

  Thank you for your interest in making blockchain quantum-resistant!

  ## Ways to Contribute

  - **Bug reports** — open an issue with steps to reproduce
  - **New endpoints** — PRs for additional PQC primitives (ML-DSA-87, SLH-DSA, etc.)
  - **Language SDKs** — client libraries for Python, Rust, Go, Solidity
  - **Documentation** — integration guides for Ethereum, Solana, Cosmos
  - **Tests** — expand the physics and cryptography test suite

  ## Development Setup

  ```bash
  git clone https://github.com/Babayagga-bite/epr2-qaas-blockchain.git
  cd epr2-qaas-blockchain
  pnpm install
  cp .env.example .env   # set DATABASE_URL
  pnpm --filter @workspace/api-server run dev
  ```

  ## Pull Request Guidelines

  1. Fork → feature branch → PR against `main`
  2. Keep PRs focused — one concern per PR
  3. For cryptographic changes, cite the relevant NIST/IETF standard
  4. All new endpoints should follow the existing pattern in `artifacts/api-server/src/routes/qaas.ts`

  ## Code Style

  TypeScript · ESM · No `any` types · Explicit error handling

  ## Questions?

  Open a GitHub Discussion or an issue tagged `question`.
  