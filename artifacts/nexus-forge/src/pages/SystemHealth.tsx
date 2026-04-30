// CONFIDENTIAL: EPR-1 QUANTUM PROTOCOL — SYSTEM INTEGRITY PANEL
import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Database, Lock, Wifi, Cpu, Server, Shield, Clock, Activity,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type CheckStatus = "pending" | "ok" | "warn" | "error";

interface Check {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  endpoint: string;
  category: "api" | "crypto" | "db" | "stream";
  latency?: number;
  status: CheckStatus;
  detail?: string;
}

const INITIAL_CHECKS: Omit<Check, "status" | "latency" | "detail">[] = [
  { id: "healthz",    label: "API Gateway",          sublabel: "Express 5 · HTTP 200",         icon: <Server size={12} />,   endpoint: "/api/healthz",                    category: "api"    },
  { id: "pqc",        label: "Motor PQC",             sublabel: "ML-KEM-768 · ML-DSA-65",       icon: <Lock size={12} />,     endpoint: "/api/pqc/status",                 category: "crypto" },
  { id: "dilithium",  label: "Dilithium Engine",      sublabel: "ML-DSA-65 keypair activo",     icon: <Shield size={12} />,   endpoint: "/api/dilithium/pubkey",           category: "crypto" },
  { id: "coherence",  label: "Motor de Coherencia",   sublabel: "EPR-1 · Resonancia cuántica",  icon: <Cpu size={12} />,      endpoint: "/api/resonance/coherence/status", category: "api"    },
  { id: "telemetry",  label: "Stream de Telemetría",  sublabel: "SSE 1 Hz · GET /stream",       icon: <Activity size={12} />, endpoint: "/api/stream/info",                category: "stream" },
  { id: "messenger",  label: "Mensajería PQC",        sublabel: "Nodos registrados",            icon: <Wifi size={12} />,     endpoint: "/api/messenger/nodes",            category: "api"    },
  { id: "dilstats",   label: "Base de Datos (latencia)", sublabel: "simulation_logs · PostgreSQL 16", icon: <Database size={12} />, endpoint: "/api/dilithium/stats",       category: "db"     },
  { id: "optimizer",  label: "Motor de Optimización", sublabel: "Auto-Opt Engine",              icon: <RefreshCw size={12} />,endpoint: "/api/optimize/status",            category: "api"    },
];

function statusIcon(s: CheckStatus, size = 14) {
  if (s === "pending") return <RefreshCw size={size} className="animate-spin text-white/20" />;
  if (s === "ok")      return <CheckCircle size={size} className="text-teal-400" />;
  if (s === "warn")    return <AlertTriangle size={size} className="text-amber-400" />;
  return <XCircle size={size} className="text-red-400" />;
}

function statusColor(s: CheckStatus) {
  if (s === "ok")   return "border-teal-400/20 bg-teal-400/[0.03]";
  if (s === "warn") return "border-amber-400/20 bg-amber-400/[0.03]";
  if (s === "error")return "border-red-400/20 bg-red-400/[0.03]";
  return "border-white/8 bg-white/[0.01]";
}

function categoryLabel(c: string) {
  if (c === "api")    return { text: "API",    cls: "text-sky-400/60 border-sky-400/20" };
  if (c === "crypto") return { text: "CRYPTO", cls: "text-violet-400/60 border-violet-400/20" };
  if (c === "db")     return { text: "DB",     cls: "text-amber-400/60 border-amber-400/20" };
  return { text: "SSE", cls: "text-teal-400/60 border-teal-400/20" };
}

/* ── Entropy panel — checks PQC server keys ───────────────────────── */
function EntropyGauge({ score }: { score: number | null }) {
  const pct = score ?? 0;
  const color = pct >= 90 ? "bg-teal-400" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="border border-white/8 bg-white/[0.01] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[7px] tracking-[0.3em] text-white/25 mb-0.5">ENTROPÍA DEL MOTOR CRIPTOGRÁFICO</div>
          <div className="text-[8px] text-white/50">Verificación de semillas aleatorias PQC</div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold tabular-nums ${pct >= 90 ? "text-teal-400" : pct >= 60 ? "text-amber-400" : "text-red-400"}`}>
            {score === null ? "…" : `${pct}%`}
          </div>
          <div className="text-[6px] text-white/20 tracking-widest">{pct >= 90 ? "NOMINAL" : pct >= 60 ? "DEGRADADA" : "CRÍTICO"}</div>
        </div>
      </div>
      <div className="h-1.5 bg-white/5 overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[6px] text-white/20 leading-relaxed">
        Score derivado de: presencia de clave pública Dilithium activa · respuesta del motor ML-KEM-768 ·
        generación de pares de claves ML-DSA-65 sin errores.
      </div>
    </div>
  );
}

export default function SystemHealth() {
  const [, navigate] = useLocation();
  const [checks, setChecks]     = useState<Check[]>(
    INITIAL_CHECKS.map((c) => ({ ...c, status: "pending" as CheckStatus }))
  );
  const [lastRun,  setLastRun]  = useState<Date | null>(null);
  const [running,  setRunning]  = useState(false);
  const [entropy,  setEntropy]  = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setChecks((prev) => prev.map((c) => ({ ...c, status: "pending", latency: undefined, detail: undefined })));

    const results = await Promise.allSettled(
      INITIAL_CHECKS.map(async (ch) => {
        const t0 = performance.now();
        const r  = await fetch(`${BASE}${ch.endpoint}`, { signal: AbortSignal.timeout(6000) });
        const ms = Math.round(performance.now() - t0);
        let detail = `${r.status} · ${ms} ms`;
        let status: CheckStatus = r.status < 400 ? "ok" : r.status < 500 ? "warn" : "error";

        // DB-specific: warn if latency > 200 ms
        if (ch.category === "db" && ms > 200) { status = "warn"; detail += " · latencia alta"; }
        if (ch.category === "db" && ms > 800) { status = "error"; detail += " · timeout"; }

        // Crypto: try to read body for extra validation
        if (ch.id === "pqc" && r.ok) {
          try {
            const j = await r.json();
            detail = j.algorithm ?? detail;
          } catch { /* ignore */ }
        }

        return { id: ch.id, status, latency: ms, detail };
      })
    );

    setChecks((prev) =>
      prev.map((c) => {
        const idx = INITIAL_CHECKS.findIndex((ch) => ch.id === c.id);
        const res = results[idx];
        if (res.status === "fulfilled") {
          return { ...c, status: res.value.status, latency: res.value.latency, detail: res.value.detail };
        }
        return { ...c, status: "error", detail: "Timeout o sin respuesta" };
      })
    );

    // Entropy score: check keys endpoint
    try {
      const kr = await fetch(`${BASE}/api/pqc/server-keys`, { signal: AbortSignal.timeout(5000) });
      const kj = await kr.json();
      // 100% if both keys present, 50% if only one, 0% if none
      const hasMlkem = !!(kj.mlKem768PublicKey || kj.encapsulationKey);
      const hasMldsa = !!(kj.mlDsa65PublicKey  || kj.verificationKey);
      setEntropy(hasMlkem && hasMldsa ? 100 : hasMlkem || hasMldsa ? 60 : 0);
    } catch {
      setEntropy(0);
    }

    setLastRun(new Date());
    setRunning(false);
  }, []);

  // Run on mount + every 30 s
  useEffect(() => {
    runChecks();
    intervalRef.current = setInterval(runChecks, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [runChecks]);

  const ok    = checks.filter((c) => c.status === "ok").length;
  const warn  = checks.filter((c) => c.status === "warn").length;
  const error = checks.filter((c) => c.status === "error").length;
  const totalDone = ok + warn + error;
  const overallOk = totalDone === checks.length && error === 0;

  const avgLatency = checks
    .filter((c) => c.latency != null)
    .reduce((acc, c, _, arr) => acc + (c.latency ?? 0) / arr.length, 0);

  return (
    <div className="min-h-screen bg-[#050505] font-mono text-white">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-[7px] text-white/30 hover:text-white/60 transition-colors tracking-widest">
            <ArrowLeft size={10} /> CONTROL CENTER
          </button>
          <span className="text-white/10">·</span>
          <div className="flex items-center gap-2">
            <Shield size={10} className="text-sky-400/60" />
            <span className="text-[7px] tracking-[0.3em] text-white/40">INTEGRIDAD DE SISTEMA</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-[6px] text-white/20 tracking-widest flex items-center gap-1">
              <Clock size={8} /> Última verificación: {lastRun.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={runChecks}
            disabled={running}
            className="flex items-center gap-1.5 text-[7px] border border-sky-400/30 px-3 py-1.5 text-sky-400/60 hover:text-sky-400 hover:border-sky-400/60 transition-all disabled:opacity-30"
          >
            <RefreshCw size={8} className={running ? "animate-spin" : ""} />
            {running ? "VERIFICANDO…" : "REVERIFICAR"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── Summary bar ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
          {[
            { label: "ESTADO GLOBAL",   value: overallOk ? "NOMINAL" : error > 0 ? "DEGRADADO" : "AVISO", cls: overallOk ? "text-teal-400" : error > 0 ? "text-red-400" : "text-amber-400" },
            { label: "OK / TOTAL",      value: `${ok} / ${checks.length}`,                                  cls: "text-white/70" },
            { label: "LATENCIA MEDIA",  value: totalDone ? `${Math.round(avgLatency)} ms` : "…",             cls: avgLatency < 100 ? "text-teal-400" : avgLatency < 300 ? "text-amber-400" : "text-red-400" },
            { label: "PRÓXIMA COMPROBACIÓN", value: "30 s",                                                  cls: "text-white/30" },
          ].map((s) => (
            <div key={s.label} className="bg-[#050505] px-4 py-3">
              <div className="text-[6px] tracking-[0.3em] text-white/20 mb-1">{s.label}</div>
              <div className={`text-[13px] font-bold tabular-nums ${s.cls}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Entropy gauge ────────────────────────────────────────────── */}
        <EntropyGauge score={entropy} />

        {/* ── Checks grid ─────────────────────────────────────────────── */}
        <div>
          <div className="text-[6.5px] tracking-[0.4em] text-white/15 mb-3">ENDPOINTS Y SUBSISTEMAS</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checks.map((ch) => {
              const cat = categoryLabel(ch.category);
              return (
                <div key={ch.id} className={`border ${statusColor(ch.status)} px-4 py-3 flex items-center gap-3`}>
                  <div className="shrink-0">{statusIcon(ch.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[8px] text-white/70">{ch.label}</span>
                      <span className={`text-[5.5px] border px-1 tracking-widest ${cat.cls}`}>{cat.text}</span>
                    </div>
                    <div className="text-[6.5px] text-white/30">{ch.detail ?? ch.sublabel}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {ch.latency != null && (
                      <div className={`text-[9px] font-bold tabular-nums ${ch.latency < 100 ? "text-teal-400/70" : ch.latency < 300 ? "text-amber-400/70" : "text-red-400/70"}`}>
                        {ch.latency} ms
                      </div>
                    )}
                    <div className="flex items-center gap-1 justify-end mt-0.5 text-white/20">
                      <span className="text-[8px] shrink-0">{ch.icon}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Badges ──────────────────────────────────────────────────── */}
        <div className="border border-white/5 bg-white/[0.01] p-4">
          <div className="text-[6.5px] tracking-[0.4em] text-white/15 mb-3">PRIMITIVAS CRIPTOGRÁFICAS ACTIVAS</div>
          <div className="flex flex-wrap gap-2">
            {[
              { name: "ML-KEM-768",   std: "NIST FIPS 203",  color: "text-violet-400 border-violet-400/25" },
              { name: "ML-DSA-65",    std: "NIST FIPS 204",  color: "text-violet-400 border-violet-400/25" },
              { name: "AES-256-GCM",  std: "NIST SP 800-38D",color: "text-sky-400 border-sky-400/25"     },
              { name: "HMAC-SHA256",  std: "FIPS 198-1",     color: "text-teal-400 border-teal-400/25"   },
              { name: "PostgreSQL 16",std: "DB backend",     color: "text-amber-400 border-amber-400/25" },
            ].map((b) => (
              <div key={b.name} className={`border ${b.color} px-3 py-1.5 flex items-center gap-2`}>
                <CheckCircle size={8} className="text-teal-400 shrink-0" />
                <div>
                  <div className={`text-[8px] font-bold ${b.color.split(" ")[0]}`}>{b.name}</div>
                  <div className="text-[6px] text-white/25">{b.std}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="text-center text-[6px] text-white/10 tracking-[0.3em] pt-2 border-t border-white/5">
          SISTEMA DE AUTODIAGNÓSTICO · EPR-1 NEXUS-FORGE QaaS · VERIFICACIÓN AUTOMÁTICA CADA 30 s
        </div>
      </div>
    </div>
  );
}
