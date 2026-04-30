// SPDX-License-Identifier: MIT
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Activity, Lock, MessageSquare, Shield, Database, BookOpen,
  CheckCircle, XCircle, Loader, ExternalLink, ChevronRight,
  Cpu, Zap, Radio, BarChart3,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/* ─── Types ─────────────────────────────────────────────────────────── */
type Status = "ok" | "error" | "checking";

interface ModuleCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  route?: string;
  href?: string;
  healthEndpoint: string;
  color: "teal" | "amber" | "violet" | "sky" | "rose" | "emerald";
}

/* ─── Module definitions ─────────────────────────────────────────────── */
const MODULES: ModuleCard[] = [
  {
    id: "dashboard",
    icon: <Activity size={18} />,
    title: "EPR-1 Live Dashboard",
    subtitle: "Telemetría cuántica en tiempo real",
    description:
      "Stream SSE a 1 Hz con métricas de coherencia, fidelidad de canal, radiación ionizante, topología de red de 9 orbs y log de eventos físicos. Todos los números son physics-honest.",
    tags: ["SSE · 1 Hz", "9 orbs · 27 qubits", "Cardani 2021"],
    route: "/dashboard",
    healthEndpoint: "/api/resonance/coherence/status",
    color: "teal",
  },
  {
    id: "pqc",
    icon: <Lock size={18} />,
    title: "PQC Lab",
    subtitle: "Post-Quantum Cryptography",
    description:
      "Demo interactivo de ML-KEM-768 (encapsulación) y ML-DSA-65 (firma). Snippets listos curl / JS / Python. Tabla de cumplimiento NIST FIPS 203/204, CNSA 2.0, BSI TR-02102, ENISA PQC.",
    tags: ["ML-KEM-768", "ML-DSA-65", "NIST FIPS 203"],
    route: "/pqc",
    healthEndpoint: "/api/pqc/status",
    color: "violet",
  },
  {
    id: "messenger",
    icon: <MessageSquare size={18} />,
    title: "Mensajería PQC",
    subtitle: "Cifrado extremo a extremo post-cuántico",
    description:
      "Mensajería nodo-a-nodo con ML-KEM-768 + AES-256-GCM + ML-DSA-65. Clave privada solo en localStorage del navegador. Transferencia de archivos cifrados hasta 1 GB.",
    tags: ["E2E · sin servidor", "Archivos ≤ 1 GB", "ML-DSA-65 firma"],
    route: "/messenger",
    healthEndpoint: "/api/messenger/nodes",
    color: "emerald",
  },
  {
    id: "security",
    icon: <Shield size={18} />,
    title: "Security Specs",
    subtitle: "Especificaciones de seguridad",
    description:
      "Análisis de amenazas STRIDE, arquitectura de defensa en profundidad, 18 cabeceras Helmet.js, HSTS, CSP, autenticación HMAC-SHA256 con prefijo nf_, rate limiting 3-tier.",
    tags: ["STRIDE model", "18 headers", "OpenAPI 3.1"],
    route: "/security",
    healthEndpoint: "/api/healthz",
    color: "amber",
  },
  {
    id: "audit",
    icon: <Database size={18} />,
    title: "Data Room",
    subtitle: "Auditoría técnica y documental",
    description:
      "Acceso al repositorio de auditoría: métricas de cobertura de tests, arquitectura del sistema, especificaciones del protocolo EPR-1 y documentación legal de transferencia de IP.",
    tags: ["26/26 tests", "IP Transfer docs", "Arquitectura"],
    route: "/audit-access",
    healthEndpoint: "/api/healthz",
    color: "sky",
  },
  {
    id: "health",
    icon: <Activity size={18} />,
    title: "Integridad de Sistema",
    subtitle: "Health Check Avanzado",
    description:
      "Panel de autodiagnóstico en tiempo real. Verifica latencia de la base de datos, estado del motor criptográfico (Entropy Check), disponibilidad de todos los endpoints y primitivas PQC activas.",
    tags: ["8 checks", "Entropy gauge", "Auto 30 s"],
    route: "/health",
    healthEndpoint: "/api/healthz",
    color: "sky",
  },
  {
    id: "threats",
    icon: <Shield size={18} />,
    title: "Simulación de Amenazas",
    subtitle: "Threat Scenario Simulator",
    description:
      "Simula ataques cuánticos reales: Intercepción Cuántica, Inyección de Ruido, Algoritmo de Shor, Algoritmo de Grover. Visualiza cómo el protocolo EPR-1 mantiene coherencia y seguridad bajo ataque.",
    tags: ["4 escenarios", "EPR-1 vs ataque", "Demo de venta"],
    route: "/threats",
    healthEndpoint: "/api/pqc/status",
    color: "amber",
  },
  {
    id: "blockchain-qaas",
    icon: <Zap size={18} />,
    title: "QaaS Blockchain",
    subtitle: "Quantum-as-a-Service para cadenas de bloques",
    description:
      "API de criptografía post-cuántica para blockchain: genera wallets cuántico-seguras (ML-KEM-768 + ML-DSA-65), firma transacciones resistentes al Algoritmo de Shor, verifica firmas y cifra canales wallet-a-wallet. FIPS 203/204 · CNSA 2.0.",
    tags: ["ML-KEM-768", "ML-DSA-65", "FIPS 203/204"],
    route: "/blockchain",
    healthEndpoint: "/api/qaas/status",
    color: "teal",
  },
  {
    id: "api",
    icon: <BookOpen size={18} />,
    title: "API Docs",
    subtitle: "Swagger UI · OpenAPI 3.1",
    description:
      "Documentación interactiva de todos los endpoints. Prueba las llamadas directamente desde el navegador: telemetría, resonancia, PQC, mensajería, optimizador y más.",
    tags: ["Try-it-out", "Auth opcional", "REST · SSE"],
    href: `${BASE}/api/docs`,
    healthEndpoint: "/api/healthz",
    color: "rose",
  },
];

/* ─── Color map ──────────────────────────────────────────────────────── */
const COLOR: Record<string, { border: string; bg: string; text: string; dot: string; tag: string }> = {
  teal:    { border: "border-teal-400/25",   bg: "bg-teal-400/[0.04]",   text: "text-teal-400",   dot: "bg-teal-400",   tag: "border-teal-400/20 text-teal-400/50"   },
  violet:  { border: "border-violet-400/25", bg: "bg-violet-400/[0.04]", text: "text-violet-400", dot: "bg-violet-400", tag: "border-violet-400/20 text-violet-400/50" },
  emerald: { border: "border-emerald-400/25",bg: "bg-emerald-400/[0.04]",text: "text-emerald-400",dot: "bg-emerald-400",tag: "border-emerald-400/20 text-emerald-400/50"},
  amber:   { border: "border-amber-400/25",  bg: "bg-amber-400/[0.04]",  text: "text-amber-400",  dot: "bg-amber-400",  tag: "border-amber-400/20 text-amber-400/50"  },
  sky:     { border: "border-sky-400/25",    bg: "bg-sky-400/[0.04]",    text: "text-sky-400",    dot: "bg-sky-400",    tag: "border-sky-400/20 text-sky-400/50"      },
  rose:    { border: "border-rose-400/25",   bg: "bg-rose-400/[0.04]",   text: "text-rose-400",   dot: "bg-rose-400",   tag: "border-rose-400/20 text-rose-400/50"    },
};

/* ─── Status dot ─────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: Status }) {
  if (status === "checking") return <Loader size={10} className="text-white/30 animate-spin" />;
  if (status === "ok")       return <CheckCircle size={10} className="text-teal-400" />;
  return <XCircle size={10} className="text-red-400/70" />;
}

/* ─── Live metrics strip (SSE) — reconexión con backoff exponencial ─── */
function LiveMetrics() {
  const [fidelity,    setFidelity]    = useState<number | null>(null);
  const [capacity,    setCapacity]    = useState<number | null>(null);
  const [t2star,      setT2star]      = useState<number | null>(null);
  const [seq,         setSeq]         = useState<number | null>(null);
  const [connState,   setConnState]   = useState<"connecting" | "ok" | "reconnecting">("connecting");
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const esRef      = useRef<EventSource | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function openStream() {
      if (!mountedRef.current) return;
      if (esRef.current) { try { esRef.current.close(); } catch { /* ignore */ } }
      if (!mountedRef.current) return;
      setConnState(retryCount.current === 0 ? "connecting" : "reconnecting");

      const es = new EventSource(`${BASE}/api/stream/telemetry`);
      esRef.current = es;

      es.onopen = () => {
        if (!mountedRef.current) return;
        retryCount.current = 0;
        setConnState("ok");
      };

      es.onerror = () => {
        if (!mountedRef.current) return;
        try { es.close(); } catch { /* ignore */ }
        const delay = Math.min(1000 * 2 ** retryCount.current, 30_000);
        retryCount.current += 1;
        setConnState("reconnecting");
        retryRef.current = setTimeout(openStream, delay);
      };

      es.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const f = JSON.parse(e.data);
          if (f?.zpe?.vacuumFidelity)      setFidelity(f.zpe.vacuumFidelity);
          if (f?.channel?.capacity_qubits) setCapacity(f.channel.capacity_qubits);
          if (f?.radiation?.t2_star_us)    setT2star(f.radiation.t2_star_us);
          if (f?.seq != null)              setSeq(f.seq);
          setConnState("ok");
        } catch { /* ignore */ }
      };
    }

    openStream();

    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (esRef.current) { try { esRef.current.close(); } catch { /* ignore */ } }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = [
    { icon: <Zap size={9} />,       label: "GATE FIDELITY",  value: fidelity != null ? `${fidelity.toFixed(2)}%`      : "…", sub: "Krantz 2019"  },
    { icon: <Cpu size={9} />,       label: "HSW CAPACITY",   value: capacity != null ? `${capacity.toFixed(3)} qb`    : "…", sub: "Holevo 1973"  },
    { icon: <Radio size={9} />,     label: "T₂* COHERENCE",  value: t2star   != null ? `${t2star.toFixed(2)} μs`      : "…", sub: "Cardani 2021" },
    { icon: <BarChart3 size={9} />, label: "FRAME SEQ",      value: seq      != null ? `#${seq.toLocaleString()}`     : "…", sub: "SSE · 1 Hz"   },
  ];

  const connDot =
    connState === "ok"           ? <span className="w-1 h-1 rounded-full bg-teal-400 animate-pulse inline-block" /> :
    connState === "reconnecting" ? <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping  inline-block" /> :
                                   <span className="w-1 h-1 rounded-full bg-white/20 animate-pulse inline-block" />;
  const connLabel =
    connState === "ok"           ? null :
    connState === "reconnecting" ? <span className="text-[5.5px] text-amber-400/60 tracking-widest ml-1">RECONECTANDO…</span> :
                                   <span className="text-[5.5px] text-white/20 tracking-widest ml-1">CONECTANDO…</span>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
      {metrics.map((m) => (
        <div key={m.label} className="bg-[#050505] px-4 py-3 flex items-center gap-3">
          <div className="text-white/20">{m.icon}</div>
          <div className="min-w-0">
            <div className="text-[6px] tracking-[0.3em] text-white/25 mb-0.5 flex items-center gap-1.5">
              {m.label}
              {connDot}
              {connLabel}
            </div>
            <div className="text-[11px] font-bold tabular-nums text-white/80">{m.value}</div>
            <div className="text-[6px] text-white/20">{m.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Module card ────────────────────────────────────────────────────── */
function ModuleCard({ mod, status }: { mod: ModuleCard; status: Status }) {
  const [, navigate] = useLocation();
  const c = COLOR[mod.color];

  const handleOpen = () => {
    if (mod.href) { window.open(mod.href, "_blank"); return; }
    if (mod.route) navigate(mod.route);
  };

  return (
    <div
      className={`border ${c.border} ${c.bg} flex flex-col gap-4 p-5 cursor-pointer group
        hover:border-opacity-50 hover:bg-opacity-10 transition-all duration-200`}
      onClick={handleOpen}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className={`${c.text} opacity-70 group-hover:opacity-100 transition-opacity`}>
          {mod.icon}
        </div>
        <div className="flex items-center gap-1.5">
          <StatusDot status={status} />
          {status === "ok" && <span className="text-[6px] text-white/20 tracking-widest">EN LÍNEA</span>}
          {status === "error" && <span className="text-[6px] text-red-400/50 tracking-widest">OFFLINE</span>}
          {status === "checking" && <span className="text-[6px] text-white/20 tracking-widest">VERIFICANDO</span>}
        </div>
      </div>

      {/* Title */}
      <div>
        <div className={`text-[10px] font-bold tracking-[0.15em] ${c.text} uppercase mb-0.5`}>
          {mod.title}
        </div>
        <div className="text-[7.5px] text-white/35 tracking-widest">{mod.subtitle}</div>
      </div>

      {/* Description */}
      <p className="text-[7.5px] text-white/45 leading-relaxed flex-1">{mod.description}</p>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {mod.tags.map((tag) => (
          <span key={tag} className={`border ${c.tag} text-[5.5px] tracking-widest px-1.5 py-0.5`}>
            {tag}
          </span>
        ))}
      </div>

      {/* CTA */}
      <div className={`flex items-center gap-1 text-[7px] font-bold tracking-[0.2em] ${c.text} opacity-60 group-hover:opacity-100 transition-opacity`}>
        {mod.href ? (
          <><ExternalLink size={9} /> ABRIR EN NUEVA PESTAÑA</>
        ) : (
          <><ChevronRight size={9} /> ABRIR MÓDULO</>
        )}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────────────────── */
export default function Landing() {
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(MODULES.map((m) => [m.id, "checking"]))
  );
  const [apiAlive, setApiAlive] = useState<boolean | null>(null);

  /* Check all module endpoints in parallel */
  useEffect(() => {
    const checked = new Set<string>();

    MODULES.forEach((mod) => {
      const ep = mod.healthEndpoint;
      if (checked.has(ep)) {
        // reuse result once available — handled by shared state below
        return;
      }
      checked.add(ep);

      fetch(`${BASE}${ep}`, { method: "GET", signal: AbortSignal.timeout(5000) })
        .then((r) => {
          const ok = r.status < 500;
          // Mark all modules that share this endpoint
          setStatuses((prev) => {
            const next = { ...prev };
            MODULES.forEach((m) => { if (m.healthEndpoint === ep) next[m.id] = ok ? "ok" : "error"; });
            return next;
          });
          if (ep === "/api/healthz") setApiAlive(ok);
        })
        .catch(() => {
          setStatuses((prev) => {
            const next = { ...prev };
            MODULES.forEach((m) => { if (m.healthEndpoint === ep) next[m.id] = "error"; });
            return next;
          });
          if (ep === "/api/healthz") setApiAlive(false);
        });
    });

    // healthz for global indicator
    fetch(`${BASE}/api/healthz`, { signal: AbortSignal.timeout(5000) })
      .then((r) => setApiAlive(r.status < 500))
      .catch(() => setApiAlive(false));
  }, []);

  const okCount = Object.values(statuses).filter((s) => s === "ok").length;

  return (
    <div className="min-h-screen bg-[#050505] font-mono text-white flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-5 py-2 flex items-center justify-between gap-4 text-[6.5px] tracking-[0.25em] text-white/25">
        <div className="flex items-center gap-3">
          <span className="text-white/50 font-bold">NEXUS-FORGE QaaS</span>
          <span>·</span>
          <span>EPR-1 UNIVERSAL QUANTUM SYNCHRONIZATION PROTOCOL</span>
          <span>·</span>
          <span className="text-white/15">v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          {apiAlive === null && <Loader size={7} className="animate-spin text-white/20" />}
          {apiAlive === true  && <><span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /><span className="text-teal-400/50">API EN LÍNEA</span></>}
          {apiAlive === false && <><span className="w-1.5 h-1.5 rounded-full bg-red-400" /><span className="text-red-400/50">API OFFLINE</span></>}
        </div>
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-6 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="text-[7px] tracking-[0.45em] text-white/25 mb-2 uppercase">Entorno de testeo completo</div>
          <h1 className="text-xl md:text-2xl font-bold text-white/90 tracking-tight">
            Control Center
          </h1>
          <p className="text-[8px] text-white/30 mt-1 tracking-widest">
            Accede y prueba cada módulo del protocolo EPR-1 desde aquí
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[7px] tracking-widest text-white/20 mb-1">MÓDULOS</div>
            <div className="text-lg font-bold text-white/70">{MODULES.length}</div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <div className="text-[7px] tracking-widest text-white/20 mb-1">EN LÍNEA</div>
            <div className={`text-lg font-bold ${okCount === MODULES.length ? "text-teal-400" : okCount > 0 ? "text-amber-400" : "text-red-400"}`}>
              {okCount}/{MODULES.length}
            </div>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <div className="text-[7px] tracking-widest text-white/20 mb-1">CONTACTO</div>
            <a
              href="mailto:alexcanarioroca@gmail.com?subject=Nexus-Forge%20EPR-1"
              className="text-[8px] text-teal-400/60 hover:text-teal-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              alexcanarioroca@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* ── Live metrics ────────────────────────────────────────────── */}
      <LiveMetrics />

      {/* ── Module grid ─────────────────────────────────────────────── */}
      <div className="flex-1 p-6">
        <div className="text-[6.5px] tracking-[0.4em] text-white/15 mb-4 uppercase">
          Módulos disponibles — haz clic para abrir
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {MODULES.map((mod) => (
            <ModuleCard key={mod.id} mod={mod} status={statuses[mod.id]} />
          ))}
        </div>
      </div>

      {/* ── System info strip ───────────────────────────────────────── */}
      <div className="border-t border-white/5 px-6 py-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "PROTOCOLO",   value: "EPR-1 · ER=EPR" },
          { label: "API AUTH",    value: "HMAC-SHA256 · nf_*" },
          { label: "PQC ESTÁNDAR",value: "NIST FIPS 203/204" },
          { label: "DB",          value: "PostgreSQL 16" },
        ].map((item) => (
          <div key={item.label}>
            <div className="text-[5.5px] tracking-[0.35em] text-white/15 mb-0.5">{item.label}</div>
            <div className="text-[7.5px] text-white/40">{item.value}</div>
          </div>
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
        <div className="text-[6px] text-white/15 tracking-[0.3em]">
          © NEXUS-FORGE QaaS · EPR-1 UNIVERSAL QUANTUM SYNCHRONIZATION PROTOCOL
        </div>
        <div className="flex items-center gap-4 text-[6px] text-white/15 tracking-[0.3em]">
          <span>CONFIDENTIALITY · INTEGRITY · AVAILABILITY</span>
          <span className="text-white/10">·</span>
          <a
            href={`${BASE}/legal`}
            className="text-teal-400/40 hover:text-teal-400/70 transition-colors tracking-[0.3em]"
          >
            IP REGISTRADA · SAFE CREATIVE 2604235375735
          </a>
        </div>
      </footer>
    </div>
  );
}
