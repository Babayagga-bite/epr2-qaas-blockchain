// SPDX-License-Identifier: MIT
import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export function hashKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const bytes = crypto.randomBytes(32);
  const raw = "nf_" + bytes.toString("base64url");
  const hash = hashKey(raw);
  const prefix = raw.slice(0, 10);
  return { raw, hash, prefix };
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers["x-api-key"] as string | undefined;
  if (!raw || !raw.startsWith("nf_")) {
    res.status(401).json({ error: "Missing or malformed API key. Use X-API-Key: nf_...", code: "UNAUTHORIZED" });
    return;
  }
  const hash = hashKey(raw);
  const [key] = await db
    .select()
    .from(apiKeysTable)
    .where(and(eq(apiKeysTable.keyHash, hash), eq(apiKeysTable.revoked, false)))
    .limit(1);
  if (!key) {
    res.status(401).json({ error: "Invalid or revoked API key.", code: "UNAUTHORIZED" });
    return;
  }
  db.update(apiKeysTable).set({ lastUsedAt: new Date() }).where(eq(apiKeysTable.id, key.id)).execute();
  next();
}
