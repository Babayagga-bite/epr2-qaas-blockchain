// SPDX-License-Identifier: MIT
import { pgTable, serial, doublePrecision, integer, boolean, timestamp, text, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * simulation_logs — persistent audit trail of every quantum simulation run.
 *
 * Columns mirror the EPR-1 due diligence requirements:
 *   timestamp, nodes_active, bit_error_rate, quantum_fidelity, causal_gain
 * plus additional physics fields for traceability.
 */
export const simulationLogsTable = pgTable("simulation_logs", {
  id: serial("id").primaryKey(),

  /** ISO timestamp of when the simulation ran (server clock, UTC). */
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),

  /** Experiment / simulation mode identifier (e.g. "riemann_routing", "er_bridge", "radiation"). */
  experimentMode: text("experiment_mode").notNull().default("general"),

  /** Number of quantum nodes active during this simulation. */
  nodesActive: integer("nodes_active").notNull().default(0),

  /** Bit-error rate [0–1] measured on the quantum channel. */
  bitErrorRate: doublePrecision("bit_error_rate").notNull().default(0),

  /** Channel fidelity [0–1]. For teleportation: (2F_link+1)/3. */
  quantumFidelity: doublePrecision("quantum_fidelity").notNull().default(0),

  /** Holevo capacity (qubits). Upper bound per HSW theorem. */
  holevoBound: doublePrecision("holevo_bound"),

  /**
   * Causal gain: ratio of quantum capacity to classical capacity on same channel.
   * causal_gain > 1 indicates quantum advantage.
   */
  causalGain: doublePrecision("causal_gain"),

  /** T₂* coherence time after radiation correction (μs). Null if not a radiation experiment. */
  t2StarUs: doublePrecision("t2_star_us"),

  /** Orbital altitude for radiation experiments (km). */
  altitudeKm: doublePrecision("altitude_km"),

  /** Surface code distance used in this run (null if no QEC applied). */
  surfaceCodeDistance: integer("surface_code_distance"),

  /** Whether a fiber-cut or obstacle was injected during this simulation. */
  obstaclInjected: boolean("obstacle_injected").notNull().default(false),

  /** Full JSON snapshot of simulation parameters and results for audit. */
  payload: jsonb("payload"),

  /**
   * ML-DSA-65 (Dilithium) detached signature over the canonical log payload.
   * Hex-encoded. Verify with the server public key exposed at GET /api/dilithium/info.
   * Null on rows written before Rev 1.1 (pre-signature era).
   */
  dilithiumSig: text("dilithium_sig"),
});

export const insertSimulationLogSchema = createInsertSchema(simulationLogsTable).omit({
  id: true,
  timestamp: true,
});

export type InsertSimulationLog = z.infer<typeof insertSimulationLogSchema>;
export type SimulationLog = typeof simulationLogsTable.$inferSelect;
