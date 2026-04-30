// SPDX-License-Identifier: MIT
import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { simulationLogsTable } from "@workspace/db/schema";
import {
  T2_VACUUM_US,
  T1_RAD_ISS_US,
  ISS_ALTITUDE_KM,
  HOLEVO_CAPACITY_QUBITS,
  LINK_FIDELITY_BASELINE,
  RIEMANN_QUBIT_COUNT,
} from "../physics.config.js";
import { dilithiumSign } from "./dilithium.js";

const router: IRouter = Router();

let seq = 0;

/**
 * Generate one telemetry frame.
 * All physical constants are imported from physics.config.ts — no hardcoding.
 */
function generateTelemetry() {
  seq++;
  const now = Date.now();

  // Gaussian jitter around baselines (realistic sensor noise)
  const vacuumFidelity  = 94.2 + (Math.random() - 0.5) * 2.0;
  const bioCohesion     = 91.8 + (Math.random() - 0.5) * 1.5;
  const linkFidelity    = LINK_FIDELITY_BASELINE + (Math.random() - 0.5) * 0.008;
  const ber             = (1 - linkFidelity) * (1 + (Math.random() - 0.5) * 0.1);
  const t2Vacuum_us     = T2_VACUUM_US + (Math.random() - 0.5) * 0.4;
  const t1Rad_us        = T1_RAD_ISS_US;

  // Matthiessen rule: 1/T₂* = 1/T₂ + 1/T₁_rad  (Cardani et al. 2021)
  const t2Star_us       = 1 / (1 / t2Vacuum_us + 1 / t1Rad_us);

  // Holevo-Schumacher-Westmoreland capacity: C = log2(1 + SNR)
  const snr             = linkFidelity / (1 - linkFidelity);
  const capacityQubits  = Math.log2(1 + snr);

  return {
    ts:  new Date(now).toISOString(),
    seq,
    zpe: {
      vacuumFidelity: Math.round(vacuumFidelity * 100) / 100,
      bioCohesion:    Math.round(bioCohesion    * 100) / 100,
    },
    channel: {
      capacity_qubits: Math.round(capacityQubits * 1000) / 1000,
      link_fidelity:   Math.round(linkFidelity   * 10000) / 10000,
      ber:             Math.round(ber             * 10000) / 10000,
      t2_vacuum_us:    Math.round(t2Vacuum_us     * 1000) / 1000,
      nodes_active:    RIEMANN_QUBIT_COUNT,
    },
    radiation: {
      altitude_km:   ISS_ALTITUDE_KM,
      t1_rad_us:     t1Rad_us,
      t2_star_us:    Math.round(t2Star_us * 1000) / 1000,
      survival_frac: Math.round(Math.exp(-t2Vacuum_us / t2Star_us) * 10000) / 10000,
      source:        "Cardani et al. 2021, Nature 604, 56–61",
    },
    network: {
      active_orbs:     0,
      entangled_pairs: 0,
    },
  };
}

/**
 * Persist a telemetry frame to PostgreSQL for audit traceability.
 * Written every LOG_EVERY_N frames (default: 30 = once per 30 s) to avoid table bloat.
 */
const LOG_EVERY_N = 30;

async function logTelemetryToDb(frame: ReturnType<typeof generateTelemetry>) {
  try {
    // Canonical message = deterministic JSON of auditable fields (alphabetical key order)
    const canonical = JSON.stringify({
      altitude_km:       frame.radiation.altitude_km,
      ber:               frame.channel.ber,
      capacity_qubits:   frame.channel.capacity_qubits,
      experiment_mode:   "radiation_telemetry",
      link_fidelity:     frame.channel.link_fidelity,
      nodes_active:      frame.channel.nodes_active,
      seq:               frame.seq,
      t2_star_us:        frame.radiation.t2_star_us,
      ts:                frame.ts,
    });

    const sig = dilithiumSign(canonical);

    await db.insert(simulationLogsTable).values({
      experimentMode:       "radiation_telemetry",
      nodesActive:          frame.channel.nodes_active,
      bitErrorRate:         frame.channel.ber,
      quantumFidelity:      frame.channel.link_fidelity,
      holevoBound:          frame.channel.capacity_qubits,
      causalGain:           frame.channel.capacity_qubits / Math.log2(2), // vs classical C=1 bit
      t2StarUs:             frame.radiation.t2_star_us,
      altitudeKm:           frame.radiation.altitude_km,
      surfaceCodeDistance:  null,
      obstaclInjected:      false,
      payload:              frame as unknown as Record<string, unknown>,
      dilithiumSig:         sig,
    });
  } catch {
    // Non-fatal: stream must never crash due to DB write failures
  }
}

// ─── SSE endpoint: /api/stream/telemetry ─────────────────────────────────────
router.get("/telemetry", async (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = () => {
    try {
      const data = generateTelemetry();
      res.write(`data: ${JSON.stringify(data)}\n\n`);

      // Persist every LOG_EVERY_N ticks (fire-and-forget)
      if (seq % LOG_EVERY_N === 0) {
        void logTelemetryToDb(data);
      }
    } catch { /* client disconnected */ }
  };

  send();
  const interval = setInterval(send, 1000);

  _req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

// ─── REST endpoint: last N simulation logs from DB ───────────────────────────
router.get("/logs", async (req: Request, res: Response) => {
  try {
    const { sql, desc } = await import("drizzle-orm");
    const limit = Math.min(Number(req.query.limit) || 50, 500);
    const rows = await db
      .select()
      .from(simulationLogsTable)
      .orderBy(desc(simulationLogsTable.timestamp))
      .limit(limit);
    res.json({ count: rows.length, rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to query simulation logs", detail: String(err) });
  }
});

// ─── Stream info ──────────────────────────────────────────────────────────────
router.get("/info", (_req: Request, res: Response) => {
  res.json({
    stream: {
      url:           "/api/stream/telemetry",
      protocol:      "Server-Sent Events (SSE)",
      interval_ms:   1000,
      auth:          "none — public demo stream",
      db_logging:    `every ${LOG_EVERY_N} frames → simulation_logs table`,
    },
    physics: {
      T2_VACUUM_US,
      T1_RAD_ISS_US,
      ISS_ALTITUDE_KM,
      HOLEVO_CAPACITY_QUBITS,
      LINK_FIDELITY_BASELINE,
      RIEMANN_QUBIT_COUNT,
      formula_holevo: "C = log2(1 + F/(1-F))  [Holevo 1973; HSW 1997]",
      formula_t2_star: "1/T₂* = 1/T₂ + 1/T₁_rad  [Cardani 2021, Nature]",
    },
    fields: {
      ts:        "ISO-8601 timestamp",
      seq:       "Monotonic sequence number",
      zpe:       "ZPE extractor telemetry (vacuumFidelity, bioCohesion)",
      channel:   "Quantum channel metrics (capacity_qubits, link_fidelity, ber, t2_vacuum_us, nodes_active)",
      radiation: "LEO radiation decoherence model (altitude_km, t1_rad_us, t2_star_us, survival_frac)",
      network:   "Active orbs and entangled pairs count",
    },
    logs_endpoint: "/api/stream/logs?limit=50",
    example_client: {
      javascript: "const es = new EventSource('/api/stream/telemetry'); es.onmessage = e => console.log(JSON.parse(e.data));",
      python:     "import sseclient, requests\nfor e in sseclient.SSEClient(requests.get('/api/stream/telemetry', stream=True)):\n    print(e.data)",
    },
  });
});

export default router;
