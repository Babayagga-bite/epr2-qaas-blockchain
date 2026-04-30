// SPDX-License-Identifier: MIT
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health.js";
import memoryCellsRouter from "./memoryCells.js";
import zpeRouter from "./zpe.js";
import exportRouter       from "./exportRoutes.js";
import orchestratorRouter from "./orchestrator.js";
import pqcChannelRouter   from "./pqcChannel.js";
import resonanceRouter from "./resonance.js";
import apiKeysRouter from "./apiKeys.js";
import telemetryRouter from "./telemetry.js";
import pitchRouter from "./pitch.js";
import adminSetupGuideRouter from "./adminSetupGuide.js";
import manifestoRouter from "./manifesto.js";
import whitepaperRouter from "./whitepaper.js";
import ipTransferRouter from "./ipTransfer.js";
import projectZipRouter from "./projectZip.js";
import fiscalZipRouter from "./fiscalZip.js";
import dossierRouter from "./dossier.js";
import dilithiumRouter from "./dilithium.js";
import ownerAnalyticsRouter from "./ownerAnalytics.js";
import optimizerRouter from "./optimizer.js";
import messengerRouter  from "./messenger.js";
import qaasRouter        from "./qaas.js";
import { simulationRateLimit } from "../middleware/security.js";

// ── Owner-only guard (ADMIN_MASTER_KEY header required) ──────────────────────
function requireAdminKey(req: Request, res: Response, next: NextFunction) {
  const masterKey = process.env["ADMIN_MASTER_KEY"];
  const provided  = req.headers["x-admin-key"] as string | undefined;
  if (!masterKey) {
    res.status(503).json({ error: "Owner analytics not configured. Set ADMIN_MASTER_KEY." });
    return;
  }
  if (!provided || provided !== masterKey) {
    res.status(401).json({ error: "Invalid or missing X-Admin-Key.", code: "UNAUTHORIZED" });
    return;
  }
  next();
}

const router: IRouter = Router();

router.use(healthRouter);
router.use("/keys",         apiKeysRouter);
router.use("/stream",       telemetryRouter);
router.use("/pitch",        pitchRouter);
router.use("/admin",        adminSetupGuideRouter);
router.use("/pitch",        manifestoRouter);
router.use("/pitch",        whitepaperRouter);
router.use("/pitch",        ipTransferRouter);
router.use("/memory-cells", memoryCellsRouter);
router.use("/export",       exportRouter);
router.use("/export",       projectZipRouter);
router.use("/export",       dossierRouter);

// ── Compute-heavy routes — stricter rate limit (60 req/min per IP) ────────────
router.use("/zpe",          simulationRateLimit, zpeRouter);
router.use("/resonance",    simulationRateLimit, resonanceRouter);
router.use("/dilithium",    simulationRateLimit, dilithiumRouter);

// ── Auto-Optimization Engine — public read-only ──────────────────────────────
router.use("/optimize",        optimizerRouter);
router.use("/optimize/orchestrator", orchestratorRouter);
router.use("/pqc",                   pqcChannelRouter);
router.use("/messenger",             messengerRouter);
router.use("/qaas",                  qaasRouter);

// ── Owner-private route — requires ADMIN_MASTER_KEY header ───────────────────
router.use("/owner/analytics", requireAdminKey, ownerAnalyticsRouter);
router.use("/export",          fiscalZipRouter);

export default router;
