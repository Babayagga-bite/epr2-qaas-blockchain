// SPDX-License-Identifier: MIT
/**
 * PQC Messenger — Node-to-node post-quantum encrypted messaging + file transfer
 *
 * Architecture: end-to-end encryption performed exclusively in the browser.
 * The server stores and relays opaque ciphertext — it never decrypts messages.
 *
 * Large file protocol (≤ 1 GB):
 *   1. Client sends message JSON (text payload only) → POST /api/messenger/messages
 *   2. Client sends encrypted file binary → PUT /api/messenger/messages/:id/file
 *      Body: raw AES-256-GCM encrypted bytes (Content-Type: application/octet-stream)
 *      Headers: X-File-IV, X-File-Auth-Tag
 *   3. Recipient downloads file binary → GET /api/messenger/messages/:id/file
 *   4. Recipient decrypts file in browser with the same session key
 */
import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { db } from "@workspace/db";
import { pqcNodesTable, pqcMessagesTable } from "@workspace/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

const MSG_LIMIT_BYTES  = 10 * 1024 * 1024;    // 10 MB for text-only message JSON
const FILE_LIMIT_BYTES = 1_100_000_000;        // 1.1 GB — fits a 1 GB file + AES-GCM overhead

// ── Raw binary parser (1.1 GB) for file upload ────────────────────────────────
const rawBinary = express.raw({ type: "application/octet-stream", limit: `${FILE_LIMIT_BYTES}b` });

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messenger/nodes
// ─────────────────────────────────────────────────────────────────────────────
router.post("/nodes", async (req: Request, res: Response) => {
  const { name, kemPublicKey, dsaPublicKey } =
    req.body as { name?: string; kemPublicKey?: string; dsaPublicKey?: string };

  if (!name || !kemPublicKey || !dsaPublicKey) {
    res.status(400).json({ error: "name, kemPublicKey, dsaPublicKey required" });
    return;
  }
  if (typeof name !== "string" || name.trim().length < 1 || name.length > 64) {
    res.status(400).json({ error: "name must be 1–64 characters" });
    return;
  }
  if (!/^[0-9a-f]+$/i.test(kemPublicKey) || !/^[0-9a-f]+$/i.test(dsaPublicKey)) {
    res.status(400).json({ error: "public keys must be hex strings" });
    return;
  }

  const id = randomUUID().replace(/-/g, "");
  await db.insert(pqcNodesTable).values({
    id,
    name:         name.trim(),
    kemPublicKey: kemPublicKey.toLowerCase(),
    dsaPublicKey: dsaPublicKey.toLowerCase(),
  });

  res.status(201).json({
    node: { id, name: name.trim() },
    note: "Private keys never transmitted — store them securely in your local key store.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messenger/nodes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/nodes", async (_req: Request, res: Response) => {
  const nodes = await db
    .select({
      id:           pqcNodesTable.id,
      name:         pqcNodesTable.name,
      kemPublicKey: pqcNodesTable.kemPublicKey,
      dsaPublicKey: pqcNodesTable.dsaPublicKey,
      createdAt:    pqcNodesTable.createdAt,
    })
    .from(pqcNodesTable)
    .orderBy(desc(pqcNodesTable.createdAt));

  res.json({ nodes, count: nodes.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/messenger/nodes/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/nodes/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.delete(pqcMessagesTable).where(
    or(eq(pqcMessagesTable.fromNodeId, id), eq(pqcMessagesTable.toNodeId, id))
  );
  await db.delete(pqcNodesTable).where(eq(pqcNodesTable.id, id));
  res.json({ deleted: id });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messenger/messages
// Stores an encrypted message. File data is NOT part of this payload —
// upload file binary separately via PUT /messages/:id/file
// ─────────────────────────────────────────────────────────────────────────────
router.post("/messages", async (req: Request, res: Response) => {
  const {
    fromNodeId, toNodeId,
    kemCiphertextHex, ivHex, ciphertextHex, authTagHex, dsaSignatureHex,
    hasFile = false, fileName, fileType, fileSize,
  } = req.body as {
    fromNodeId?: string; toNodeId?: string;
    kemCiphertextHex?: string; ivHex?: string; ciphertextHex?: string;
    authTagHex?: string; dsaSignatureHex?: string;
    hasFile?: boolean; fileName?: string; fileType?: string; fileSize?: number;
  };

  if (!fromNodeId || !toNodeId || !kemCiphertextHex || !ivHex || !ciphertextHex || !authTagHex || !dsaSignatureHex) {
    res.status(400).json({ error: "fromNodeId, toNodeId, kemCiphertextHex, ivHex, ciphertextHex, authTagHex, dsaSignatureHex required" });
    return;
  }

  if (ciphertextHex.length > MSG_LIMIT_BYTES * 2) {
    res.status(413).json({ error: "Text payload too large. File data must be uploaded separately via PUT /messages/:id/file." });
    return;
  }

  const [fromNode] = await db.select({ id: pqcNodesTable.id })
    .from(pqcNodesTable).where(eq(pqcNodesTable.id, fromNodeId));
  const [toNode]   = await db.select({ id: pqcNodesTable.id })
    .from(pqcNodesTable).where(eq(pqcNodesTable.id, toNodeId));

  if (!fromNode) { res.status(404).json({ error: "Sender node not found" }); return; }
  if (!toNode)   { res.status(404).json({ error: "Recipient node not found" }); return; }

  const id = randomUUID().replace(/-/g, "");
  await db.insert(pqcMessagesTable).values({
    id,
    fromNodeId,
    toNodeId,
    kemCiphertextHex: kemCiphertextHex.toLowerCase(),
    ivHex:            ivHex.toLowerCase(),
    ciphertextHex:    ciphertextHex.toLowerCase(),
    authTagHex:       authTagHex.toLowerCase(),
    dsaSignatureHex:  dsaSignatureHex.toLowerCase(),
    hasFile:          !!hasFile,
    fileName:         hasFile && fileName ? fileName : null,
    fileType:         hasFile && fileType ? fileType : null,
    fileSize:         hasFile && fileSize ? fileSize : null,
  });

  res.status(201).json({
    id,
    uploadFileUrl: hasFile ? `/api/messenger/messages/${id}/file` : null,
    note: "Message stored encrypted. Only the recipient can decrypt it.",
    primitives: "ML-KEM-768 + AES-256-GCM + ML-DSA-65",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/messenger/messages/:id/file
// Uploads the AES-256-GCM encrypted file binary for a message.
// Body: raw encrypted bytes (Content-Type: application/octet-stream)
// Headers required:
//   X-File-IV      — hex IV (12 bytes = 24 hex chars)
//   X-File-Auth-Tag — hex auth tag (16 bytes = 32 hex chars)
// Max body size: 1.1 GB
// ─────────────────────────────────────────────────────────────────────────────
router.put("/messages/:id/file", rawBinary, async (req: Request, res: Response) => {
  const { id } = req.params;
  const fileIvHex      = (req.headers["x-file-iv"]       as string | undefined)?.toLowerCase();
  const fileAuthTagHex = (req.headers["x-file-auth-tag"] as string | undefined)?.toLowerCase();

  if (!fileIvHex || !fileAuthTagHex) {
    res.status(400).json({ error: "X-File-IV and X-File-Auth-Tag headers required" });
    return;
  }
  if (!/^[0-9a-f]{24}$/.test(fileIvHex)) {
    res.status(400).json({ error: "X-File-IV must be 24 hex chars (12-byte AES-GCM nonce)" });
    return;
  }
  if (!/^[0-9a-f]{32}$/.test(fileAuthTagHex)) {
    res.status(400).json({ error: "X-File-Auth-Tag must be 32 hex chars (16-byte auth tag)" });
    return;
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    res.status(400).json({ error: "Binary body required (Content-Type: application/octet-stream)" });
    return;
  }
  if (req.body.length > FILE_LIMIT_BYTES) {
    res.status(413).json({ error: "File too large. Maximum 1 GB." });
    return;
  }

  const [msg] = await db.select({ id: pqcMessagesTable.id, hasFile: pqcMessagesTable.hasFile })
    .from(pqcMessagesTable).where(eq(pqcMessagesTable.id, id));

  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  if (!msg.hasFile) { res.status(400).json({ error: "This message has no file attachment" }); return; }

  await db.update(pqcMessagesTable)
    .set({
      fileCiphertext:  req.body as Buffer,
      fileIvHex:       fileIvHex,
      fileAuthTagHex:  fileAuthTagHex,
    })
    .where(eq(pqcMessagesTable.id, id));

  res.json({
    id,
    bytes_stored: req.body.length,
    note: "Encrypted file stored. Only the recipient can decrypt it.",
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messenger/messages/:id/file
// Returns the raw AES-256-GCM encrypted file binary.
// Response headers:
//   X-File-IV, X-File-Auth-Tag — crypto params for client-side decryption
// ─────────────────────────────────────────────────────────────────────────────
router.get("/messages/:id/file", async (req: Request, res: Response) => {
  const { id } = req.params;

  const [msg] = await db
    .select({
      fileCiphertext: pqcMessagesTable.fileCiphertext,
      fileIvHex:      pqcMessagesTable.fileIvHex,
      fileAuthTagHex: pqcMessagesTable.fileAuthTagHex,
      fileName:       pqcMessagesTable.fileName,
      fileType:       pqcMessagesTable.fileType,
    })
    .from(pqcMessagesTable)
    .where(eq(pqcMessagesTable.id, id));

  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  if (!msg.fileCiphertext || !msg.fileIvHex || !msg.fileAuthTagHex) {
    res.status(404).json({ error: "No file uploaded for this message yet" });
    return;
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("X-File-IV",       msg.fileIvHex);
  res.setHeader("X-File-Auth-Tag", msg.fileAuthTagHex);
  res.setHeader("X-File-Name",     msg.fileName ?? "attachment");
  res.setHeader("Content-Length",  msg.fileCiphertext.length.toString());
  res.setHeader("Access-Control-Expose-Headers", "X-File-IV, X-File-Auth-Tag, X-File-Name");
  res.send(msg.fileCiphertext);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messenger/messages/:nodeId
// ─────────────────────────────────────────────────────────────────────────────
router.get("/messages/:nodeId", async (req: Request, res: Response) => {
  const { nodeId } = req.params;

  const messages = await db
    .select({
      id:               pqcMessagesTable.id,
      fromNodeId:       pqcMessagesTable.fromNodeId,
      toNodeId:         pqcMessagesTable.toNodeId,
      kemCiphertextHex: pqcMessagesTable.kemCiphertextHex,
      ivHex:            pqcMessagesTable.ivHex,
      ciphertextHex:    pqcMessagesTable.ciphertextHex,
      authTagHex:       pqcMessagesTable.authTagHex,
      dsaSignatureHex:  pqcMessagesTable.dsaSignatureHex,
      hasFile:          pqcMessagesTable.hasFile,
      fileName:         pqcMessagesTable.fileName,
      fileType:         pqcMessagesTable.fileType,
      fileSize:         pqcMessagesTable.fileSize,
      fileReady:        pqcMessagesTable.fileIvHex,
      isRead:           pqcMessagesTable.isRead,
      createdAt:        pqcMessagesTable.createdAt,
      fromName:         pqcNodesTable.name,
    })
    .from(pqcMessagesTable)
    .leftJoin(pqcNodesTable, eq(pqcMessagesTable.fromNodeId, pqcNodesTable.id))
    .where(or(
      eq(pqcMessagesTable.toNodeId,   nodeId),
      eq(pqcMessagesTable.fromNodeId, nodeId),
    ))
    .orderBy(desc(pqcMessagesTable.createdAt));

  res.json({
    messages: messages.map(m => ({ ...m, fileReady: !!m.fileReady })),
    count: messages.length,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/messenger/messages/:id/read
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/messages/:id/read", async (req: Request, res: Response) => {
  const { id } = req.params;
  await db.update(pqcMessagesTable)
    .set({ isRead: true })
    .where(eq(pqcMessagesTable.id, id));
  res.json({ id, isRead: true });
});

export default router;
