// SPDX-License-Identifier: MIT
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { apiKeysTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { generateApiKey } from "../middleware/apiKey.js";
import { authRateLimit } from "../middleware/security.js";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  const keys = await db
    .select({
      id: apiKeysTable.id,
      name: apiKeysTable.name,
      keyPrefix: apiKeysTable.keyPrefix,
      createdAt: apiKeysTable.createdAt,
      lastUsedAt: apiKeysTable.lastUsedAt,
      revoked: apiKeysTable.revoked,
    })
    .from(apiKeysTable)
    .orderBy(apiKeysTable.createdAt);
  res.json(keys);
});

router.post("/", authRateLimit, async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "name is required", code: "VALIDATION_ERROR" });
    return;
  }
  const { raw, hash, prefix } = generateApiKey();
  const [created] = await db
    .insert(apiKeysTable)
    .values({ name: name.trim(), keyHash: hash, keyPrefix: prefix })
    .returning();
  res.status(201).json({
    key: raw,
    id: created.id,
    name: created.name,
    prefix: created.keyPrefix,
    warning: "Store this key now. It will not be shown again.",
  });
});

router.post("/:id/revoke", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid key ID", code: "VALIDATION_ERROR" });
    return;
  }
  const [existing] = await db.select().from(apiKeysTable).where(eq(apiKeysTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Key not found", code: "NOT_FOUND" });
    return;
  }
  await db
    .update(apiKeysTable)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(apiKeysTable.id, id));
  res.json({ success: true, message: `Key ${id} revoked.` });
});

export default router;
