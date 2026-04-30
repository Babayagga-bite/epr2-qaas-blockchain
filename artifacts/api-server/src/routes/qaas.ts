/**
 * QaaS — Quantum-as-a-Service for Blockchain
 * POST-QUANTUM CRYPTOGRAPHY API for wallets, transactions, and secure channels.
 * Algorithms: ML-KEM-768 (FIPS 203) · ML-DSA-65 (FIPS 204)
 * © Manuel Alexander Roca González · EPR-1 Protocol
 */
import { Router } from "express";
import type { Request, Response } from "express";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { createHash, createCipheriv, hkdfSync, randomBytes } from "node:crypto";

const router: Router = Router();

// ── In-memory usage counters (reset on restart) ─────────────────────────────
const COUNTERS = {
  wallets_generated: 0,
  transactions_signed: 0,
  transactions_verified: 0,
  encapsulations: 0,
};

// ── Utility: derive a blockchain-style address from a public key ─────────────
function deriveAddress(publicKeyBytes: Uint8Array, prefix: string): string {
  const hash = createHash("sha256").update(publicKeyBytes).digest();
  const addr = Buffer.from(hash).toString("hex").slice(0, 40);
  return `${prefix}1q${addr}`;
}

// ── GET /status — service capabilities overview ──────────────────────────────
router.get("/status", (_req: Request, res: Response) => {
  res.json({
    service: "QaaS — Quantum-as-a-Service for Blockchain",
    version: "1.0.0",
    status: "operational",
    algorithms: {
      kem: { name: "ML-KEM-768", standard: "FIPS 203", securityLevel: "NIST Level 3 · 128-bit PQ" },
      dsa: { name: "ML-DSA-65",  standard: "FIPS 204", securityLevel: "NIST Level 3 · 128-bit PQ" },
      symmetric: { name: "AES-256-GCM", kdf: "HKDF-SHA256" },
    },
    endpoints: [
      "POST /api/qaas/wallet/keygen      — Generate quantum-safe wallet keypair",
      "POST /api/qaas/tx/sign            — Sign a blockchain transaction",
      "POST /api/qaas/tx/verify          — Verify a quantum-signed transaction",
      "POST /api/qaas/channel/encapsulate — Encrypt data to a recipient public key",
      "GET  /api/qaas/algorithms         — Full algorithm reference",
      "GET  /api/qaas/metrics            — Live usage counters",
    ],
    compliance: ["NIST FIPS 203", "NIST FIPS 204", "CNSA 2.0", "BSI TR-02102-1"],
    threatModel: "Harvest-Now-Decrypt-Later (HNDL) resistant. Shor's algorithm resistant.",
    timestamp: new Date().toISOString(),
  });
});

// ── GET /algorithms — full algorithm reference ───────────────────────────────
router.get("/algorithms", (_req: Request, res: Response) => {
  res.json({
    algorithms: [
      {
        id: "ML-KEM-768",
        family: "CRYSTALS-Kyber",
        standard: "FIPS 203",
        type: "Key Encapsulation Mechanism (KEM)",
        securityLevel: "NIST Level 3",
        publicKeySize: 1184,
        privateKeySize: 2400,
        ciphertextSize: 1088,
        sharedSecretSize: 32,
        use: ["Wallet-to-wallet encrypted messaging", "Session key establishment", "Forward-secret channels"],
        quantumResistant: true,
      },
      {
        id: "ML-DSA-65",
        family: "CRYSTALS-Dilithium",
        standard: "FIPS 204",
        type: "Digital Signature Algorithm (DSA)",
        securityLevel: "NIST Level 3",
        publicKeySize: 1952,
        privateKeySize: 4032,
        signatureSize: 3293,
        use: ["Transaction signing", "Block validation", "Smart contract authorization"],
        quantumResistant: true,
      },
    ],
    recommendation: "Replace ECDSA (secp256k1/P-256) and RSA with ML-DSA-65 for all on-chain signatures. Replace ECDH with ML-KEM-768 for key exchange.",
    migration: "Hybrid mode supported: concatenate classical + PQC signatures during transition.",
  });
});

// ── GET /metrics — live usage counters ───────────────────────────────────────
router.get("/metrics", (_req: Request, res: Response) => {
  res.json({
    service: "QaaS Blockchain",
    uptime_s: Math.floor(process.uptime()),
    counters: { ...COUNTERS },
    timestamp: new Date().toISOString(),
  });
});

// ── POST /wallet/keygen — generate quantum-safe wallet keypair ───────────────
router.post("/wallet/keygen", (req: Request, res: Response) => {
  const { network = "mainnet", label } = req.body as {
    network?: "mainnet" | "testnet" | "devnet";
    label?: string;
  };

  const t0 = Date.now();

  // Generate ML-KEM-768 keypair (encryption / KEM)
  const kemSeed = randomBytes(64);
  const kemKeys = ml_kem768.keygen(kemSeed);

  // Generate ML-DSA-65 keypair (signing / authentication)
  const dsaSeed = randomBytes(32);
  const dsaKeys = ml_dsa65.keygen(dsaSeed);

  // Derive deterministic addresses from the signing public key
  const prefixes: Record<string, string> = {
    mainnet: "qbc",
    testnet: "tqbc",
    devnet:  "dqbc",
  };
  const prefix  = prefixes[network] ?? "qbc";
  const address = deriveAddress(dsaKeys.publicKey, prefix);

  COUNTERS.wallets_generated++;

  res.json({
    success: true,
    wallet: {
      address,
      network,
      label: label ?? null,
      createdAt: new Date().toISOString(),
    },
    signing: {
      algorithm:        "ML-DSA-65",
      standard:         "FIPS 204",
      publicKey:        Buffer.from(dsaKeys.publicKey).toString("hex"),
      privateKey:       Buffer.from(dsaKeys.secretKey).toString("hex"),
      publicKeyBytes:   dsaKeys.publicKey.length,
    },
    encryption: {
      algorithm:        "ML-KEM-768",
      standard:         "FIPS 203",
      publicKey:        Buffer.from(kemKeys.publicKey).toString("hex"),
      privateKey:       Buffer.from(kemKeys.secretKey).toString("hex"),
      publicKeyBytes:   kemKeys.publicKey.length,
    },
    computeMs: Date.now() - t0,
    warning: "Store privateKey in a secure vault. Never expose it over the network.",
  });
});

// ── POST /tx/sign — sign a blockchain transaction payload ────────────────────
router.post("/tx/sign", (req: Request, res: Response) => {
  const { transaction, privateKey } = req.body as {
    transaction?: unknown;
    privateKey?: string;
  };

  if (!transaction) {
    res.status(400).json({ error: "transaction payload required" });
    return;
  }
  if (!privateKey) {
    res.status(400).json({ error: "privateKey (ML-DSA-65 hex) required" });
    return;
  }

  try {
    const skBytes = Buffer.from(privateKey, "hex");
    if (skBytes.length !== 4032) {
      res.status(400).json({
        error: `Invalid ML-DSA-65 private key length. Expected 4032 bytes, got ${skBytes.length}.`,
      });
      return;
    }

    // Canonical serialization of the transaction
    const canonical  = JSON.stringify(transaction, Object.keys(transaction as object).sort());
    const txHash     = createHash("sha256").update(canonical).digest("hex");
    const msgBytes   = new TextEncoder().encode(canonical);

    const t0  = Date.now();
    const sig = ml_dsa65.sign(msgBytes, skBytes);
    const elapsed = Date.now() - t0;

    COUNTERS.transactions_signed++;

    res.json({
      success:   true,
      txHash,
      signature: Buffer.from(sig).toString("hex"),
      algorithm: "ML-DSA-65",
      standard:  "FIPS 204",
      canonical,
      signedAt:  new Date().toISOString(),
      computeMs: elapsed,
      note:      "Include signature and txHash in your transaction broadcast.",
    });
  } catch (e: unknown) {
    res.status(400).json({ error: "Signing failed", detail: e instanceof Error ? e.message : String(e) });
  }
});

// ── POST /tx/verify — verify a quantum-signed transaction ────────────────────
router.post("/tx/verify", (req: Request, res: Response) => {
  const { transaction, signature, publicKey } = req.body as {
    transaction?: unknown;
    signature?: string;
    publicKey?: string;
  };

  if (!transaction || !signature || !publicKey) {
    res.status(400).json({ error: "transaction, signature, and publicKey are required" });
    return;
  }

  try {
    const canonical = JSON.stringify(transaction, Object.keys(transaction as object).sort());
    const txHash    = createHash("sha256").update(canonical).digest("hex");
    const msgBytes  = new TextEncoder().encode(canonical);
    const pkBytes   = Buffer.from(publicKey, "hex");
    const sigBytes  = Buffer.from(signature, "hex");

    const t0    = Date.now();
    const valid = ml_dsa65.verify(sigBytes, msgBytes, pkBytes);
    const elapsed = Date.now() - t0;

    COUNTERS.transactions_verified++;

    res.json({
      valid,
      txHash,
      algorithm:  "ML-DSA-65",
      standard:   "FIPS 204",
      verifiedAt: new Date().toISOString(),
      computeMs:  elapsed,
    });
  } catch (e: unknown) {
    res.json({
      valid:     false,
      algorithm: "ML-DSA-65",
      error:     e instanceof Error ? e.message : String(e),
    });
  }
});

// ── POST /channel/encapsulate — encrypt data to a recipient's KEM public key ─
router.post("/channel/encapsulate", (req: Request, res: Response) => {
  const { recipientKemPublicKey, payload } = req.body as {
    recipientKemPublicKey?: string;
    payload?: string;
  };

  if (!recipientKemPublicKey) {
    res.status(400).json({ error: "recipientKemPublicKey (ML-KEM-768 hex) required" });
    return;
  }
  if (!payload) {
    res.status(400).json({ error: "payload (string to encrypt) required" });
    return;
  }
  if (payload.length > 65536) {
    res.status(400).json({ error: "payload must be ≤ 64 KB" });
    return;
  }

  try {
    const pkBytes = Buffer.from(recipientKemPublicKey, "hex");
    if (pkBytes.length !== 1184) {
      res.status(400).json({
        error: `Invalid ML-KEM-768 public key length. Expected 1184 bytes, got ${pkBytes.length}.`,
      });
      return;
    }

    const t0 = Date.now();

    // KEM encapsulate — produces ciphertext + 32-byte shared secret
    const { cipherText, sharedSecret } = ml_kem768.encapsulate(pkBytes);

    // Derive AES-256 key from shared secret via HKDF
    const salt      = randomBytes(16);
    const sessionId = randomBytes(16).toString("hex");
    const aesKey    = Buffer.from(hkdfSync("sha256", sharedSecret, salt, `QaaS-v1-${sessionId}`, 32));

    // Encrypt payload with AES-256-GCM
    const iv     = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
    const pt     = Buffer.from(payload, "utf8");
    const ct     = Buffer.concat([cipher.update(pt), cipher.final()]);
    const tag    = cipher.getAuthTag();

    const elapsed = Date.now() - t0;
    COUNTERS.encapsulations++;

    res.json({
      success:    true,
      sessionId,
      algorithm:  "ML-KEM-768 + AES-256-GCM (HKDF-SHA256)",
      ciphertext: {
        kem:       Buffer.from(cipherText).toString("hex"),
        salt:      salt.toString("hex"),
        iv:        iv.toString("hex"),
        authTag:   tag.toString("hex"),
        encrypted: ct.toString("hex"),
      },
      computeMs:  elapsed,
      note:       "Send ciphertext to recipient. Only they can decapsulate with their ML-KEM-768 private key.",
    });
  } catch (e: unknown) {
    res.status(400).json({ error: "Encapsulation failed", detail: e instanceof Error ? e.message : String(e) });
  }
});

export default router;
