// SPDX-License-Identifier: MIT
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import app from "./app";
import { logger } from "./lib/logger";
import { oscillator, type PulseEvent } from "./macro-resonator";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// ── HTTP server wrapping Express ──────────────────────────────────────────
const server = createServer(app);

// ── WebSocket server at /ws/resonance ─────────────────────────────────────
const wss = new WebSocketServer({ server, path: "/ws/resonance" });

wss.on("connection", (ws) => {
  oscillator.addClient();
  logger.info("WebSocket client connected — resonance actuator channel open");

  // Send current state immediately
  ws.send(JSON.stringify({ type: "state", payload: oscillator.state() }));

  // Forward pulse events to this client
  const onPulse = (pulse: PulseEvent) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "pulse", payload: pulse }));
    }
  };
  oscillator.on("pulse", onPulse);

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      // Accept commands from hardware: { cmd: "ack", cycleCount: N }
      if (msg.cmd === "ack") {
        logger.debug({ cycleCount: msg.cycleCount }, "Hardware ACK received");
      }
    } catch { /* ignore malformed messages */ }
  });

  ws.on("close", () => {
    oscillator.removeClient();
    oscillator.removeListener("pulse", onPulse);
    logger.info("WebSocket client disconnected");
  });
});

oscillator.on("started", (s) => logger.info({ freqHz: s.targetFreqHz, mode: s.mode }, "Oscillator started"));
oscillator.on("stopped", ()  => logger.info("Oscillator stopped"));

// ── Self-healing: keep the process alive on unexpected errors ─────────────
// Logs the error via pino and lets the Replit workflow supervisor restart if needed.
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — process will continue");
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection");
});

// ── Graceful shutdown on SIGTERM (Replit deployment signal) ──────────────
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — closing HTTP server gracefully");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
  // Force exit after 10 s if close takes too long
  setTimeout(() => process.exit(1), 10_000).unref();
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
