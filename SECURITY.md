# Security Policy

  ## Supported Versions

  | Version | Supported |
  |---------|-----------|
  | 2.x     | ✅ Yes    |
  | < 2.0   | ❌ No     |

  ## Cryptographic Algorithms

  This project implements NIST-standardized post-quantum algorithms via [`@noble/post-quantum`](https://github.com/paulmillr/noble-post-quantum):

  - **ML-KEM-768** (FIPS 203) — audited implementation
  - **ML-DSA-65** (FIPS 204) — audited implementation

  Do **not** use this API to store private keys server-side in production. The `/wallet/keygen` endpoint is intended for demo and integration testing. In production, key generation should happen client-side.

  ## Reporting a Vulnerability

  Please **do not** open a public issue for security vulnerabilities.

  Email: alexcanarioroca@gmail.com with subject line `[SECURITY] EPR-2 QaaS`.

  Expected response time: 48 hours.

  We follow responsible disclosure — we will coordinate a fix and credit you in the release notes.
  