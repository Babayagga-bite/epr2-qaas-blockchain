// SPDX-License-Identifier: MIT
import { Router } from "express";
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import type { Request, Response } from "express";

const router: Router = Router();

// ── Server keypair — generated once on startup, held in memory ──────────────
const SERVER_KEYPAIR = ml_dsa65.keygen();
const PUBLIC_KEY_HEX = Buffer.from(SERVER_KEYPAIR.publicKey).toString("hex");
const KEYGEN_TS      = new Date().toISOString();

// ── GET /pubkey — expose server public key ────────────────────────────────────
router.get("/pubkey", (_req: Request, res: Response) => {
  res.json({
    algorithm:        "ML-DSA-65",
    standard:         "FIPS 204 (CRYSTALS-Dilithium)",
    securityLevel:    "NIST Level 3 · 128-bit post-quantum",
    publicKey:        PUBLIC_KEY_HEX,
    publicKeyLength:  SERVER_KEYPAIR.publicKey.length,
    keygenTimestamp:  KEYGEN_TS,
    note:             "Server keypair regenerated on each process start.",
  });
});

// ── POST /sign — sign an arbitrary UTF-8 message ─────────────────────────────
router.post("/sign", (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "message (string) required" });
    return;
  }
  if (message.length > 4096) {
    res.status(400).json({ error: "message must be ≤ 4096 characters" });
    return;
  }

  const t0       = Date.now();
  const msgBytes = new TextEncoder().encode(message);
  const sig      = ml_dsa65.sign(msgBytes, SERVER_KEYPAIR.secretKey);
  const elapsed  = Date.now() - t0;

  res.json({
    algorithm:       "ML-DSA-65",
    standard:        "FIPS 204",
    message,
    messageBytes:    msgBytes.length,
    signature:       Buffer.from(sig).toString("hex"),
    signatureLength: sig.length,
    publicKey:       PUBLIC_KEY_HEX,
    signedAt:        new Date().toISOString(),
    computeMs:       elapsed,
  });
});

// ── POST /verify — verify a ML-DSA-65 signature ───────────────────────────────
router.post("/verify", (req: Request, res: Response) => {
  const { message, signature, publicKey } = req.body as {
    message?: string;
    signature?: string;
    publicKey?: string;
  };
  if (!message || !signature) {
    res.status(400).json({ error: "message and signature required" });
    return;
  }

  try {
    const pk     = Buffer.from(publicKey ?? PUBLIC_KEY_HEX, "hex");
    const sigBuf = Buffer.from(signature, "hex");
    const msg    = new TextEncoder().encode(message);

    const t0    = Date.now();
    const valid = ml_dsa65.verify(sigBuf, msg, pk);
    const elapsed = Date.now() - t0;

    res.json({
      valid,
      algorithm:  "ML-DSA-65",
      standard:   "FIPS 204",
      computeMs:  elapsed,
      verifiedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    res.json({
      valid:     false,
      algorithm: "ML-DSA-65",
      error:     e instanceof Error ? e.message : String(e),
    });
  }
});

// ── POST /sign-ping — sign a full gravitational ping result ───────────────────
router.post("/sign-ping", (req: Request, res: Response) => {
  const { pingId, timestamp, physics } = req.body as {
    pingId?: string;
    timestamp?: string;
    physics?: unknown;
  };
  if (!pingId || !timestamp) {
    res.status(400).json({ error: "pingId and timestamp required" });
    return;
  }

  const canonical = JSON.stringify({ pingId, timestamp, physics: physics ?? null });
  const msgBytes  = new TextEncoder().encode(canonical);
  const t0        = Date.now();
  const sig       = ml_dsa65.sign(msgBytes, SERVER_KEYPAIR.secretKey);
  const elapsed   = Date.now() - t0;

  res.json({
    algorithm:       "ML-DSA-65",
    standard:        "FIPS 204",
    pingId,
    timestamp,
    canonical,
    signature:       Buffer.from(sig).toString("hex"),
    signatureLength: sig.length,
    publicKey:       PUBLIC_KEY_HEX,
    signedAt:        new Date().toISOString(),
    computeMs:       elapsed,
  });
});

/**
 * Sign an arbitrary UTF-8 string with the server ML-DSA-65 key.
 * Returns a hex-encoded detached signature.
 * Used internally by telemetry.ts to stamp every persisted simulation log.
 */
export function dilithiumSign(message: string): string {
  const msgBytes = new TextEncoder().encode(message);
  const sig = ml_dsa65.sign(msgBytes, SERVER_KEYPAIR.secretKey);
  return Buffer.from(sig).toString("hex");
}

// ── GET /stats — count of simulation_logs rows with Dilithium signature ───────
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const { db } = await import("@workspace/db");
    const { simulationLogsTable } = await import("@workspace/db/schema");
    const { sql: drizzleSql } = await import("drizzle-orm");

    const rows = await db
      .select({
        total:  drizzleSql<number>`cast(count(*) as int)`,
        signed: drizzleSql<number>`cast(count(${simulationLogsTable.dilithiumSig}) as int)`,
      })
      .from(simulationLogsTable);

    const row = rows[0] ?? { total: 0, signed: 0 };
    res.json({
      algorithm:           "ML-DSA-65",
      standard:            "FIPS 204",
      total_simulation_logs: row.total,
      signed_simulation_logs: row.signed,
      unsigned_simulation_logs: row.total - row.signed,
      coverage_pct:        row.total > 0 ? Math.round((row.signed / row.total) * 10000) / 100 : 0,
      public_key:          PUBLIC_KEY_HEX,
      note:                "Rows signed since Rev 1.1 (ML-DSA implementation). Older rows have null signature.",
    });
  } catch (err) {
    res.status(500).json({ error: "Stats query failed", detail: String(err) });
  }
});

export { SERVER_KEYPAIR, PUBLIC_KEY_HEX };
export default router;
