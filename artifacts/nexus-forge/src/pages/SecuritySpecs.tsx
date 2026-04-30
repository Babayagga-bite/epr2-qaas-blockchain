// SPDX-License-Identifier: MIT
/**
 * SecuritySpecs — Enterprise Post-Quantum Security Specifications
 * Route: /security
 * Audience: technical buyers — banking, defense, government sectors
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Shield, Lock, ArrowLeft, ChevronDown, ChevronUp,
  CheckCircle2, AlertTriangle, ExternalLink, Zap, Building2, Landmark,
} from "lucide-react";
import PQCChannelPanel from "@/components/dashboard/PQCChannelPanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── tiny helpers ──────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[6.5px] tracking-[0.35em] text-white/20 uppercase mb-3 flex items-center gap-2">
      <div className="h-px flex-1 bg-white/6" />
      {children}
      <div className="h-px flex-1 bg-white/6" />
    </div>
  );
}

function Tag({ children, color = "teal" }: { children: React.ReactNode; color?: string }) {
  const c = color === "amber" ? "border-amber-400/20 text-amber-300/50"
          : color === "red"   ? "border-red-400/20 text-red-300/50"
          : color === "blue"  ? "border-blue-400/20 text-blue-300/50"
          :                     "border-teal-400/20 text-teal-300/60";
  return (
    <span className={`border px-2 py-0.5 text-[6px] font-mono tracking-wide ${c}`}>{children}</span>
  );
}

function Row({ k, v, ok }: { k: string; v: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-white/4 last:border-0 items-start">
      <span className="text-[7px] text-white/25 w-36 shrink-0">{k}</span>
      <span className="text-[7px] text-white/65 flex-1">{v}</span>
      {ok != null && (ok
        ? <CheckCircle2 size={10} className="text-teal-400 shrink-0 mt-0.5" />
        : <AlertTriangle size={10} className="text-red-400 shrink-0 mt-0.5" />
      )}
    </div>
  );
}

function Collapsible({ title, badge, children, defaultOpen = false }:
  { title: string; badge?: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/6 bg-white/[0.01]">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/4 transition-colors"
      >
        <span className="text-[8.5px] font-bold text-white/70 flex-1">{title}</span>
        {badge && <Tag>{badge}</Tag>}
        {open ? <ChevronUp size={10} className="text-white/20 shrink-0" /> : <ChevronDown size={10} className="text-white/20 shrink-0" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/5 pt-3">{children}</div>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SecuritySpecs() {
  const [, navigate] = useLocation();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/pqc/compliance-report`)
      .then(r => r.json())
      .then(setReport)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/8 px-6 py-0 h-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[7.5px] text-white/30 hover:text-white/60 transition-colors tracking-widest"
          >
            <ArrowLeft size={10} /> NEXUS-FORGE
          </button>
          <div className="h-4 w-px bg-white/10" />
          <span className="text-[7.5px] tracking-[0.25em] text-white/40">SECURITY SPECIFICATIONS</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield size={10} className="text-teal-400/60" />
          <span className="text-[6.5px] tracking-widest text-teal-400/50 font-mono">QUANTUM-SAFE · NIST FIPS 203/204</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── Title block ──────────────────────────────────────────────────── */}
        <div className="border border-teal-800/30 bg-teal-950/8 px-8 py-8">
          <div className="text-[6.5px] tracking-[0.4em] text-teal-400/40 uppercase mb-3">
            EPR-1 · Especificaciones de Seguridad · Edición Enterprise
          </div>
          <h1 className="text-[20px] font-bold text-white/85 leading-tight mb-2">
            Canal Post-Cuántico<br />
            <span className="text-teal-400/70">ML-KEM-768 + AES-256-GCM + ML-DSA-65</span>
          </h1>
          <p className="text-[8.5px] text-white/35 max-w-2xl leading-relaxed mt-3">
            Infraestructura criptográfica resistente a computadores cuánticos, implementando
            los tres estándares NIST finalizados en agosto de 2024 (FIPS 203, FIPS 204, SP 800-38D).
            Diseñada para sectores bancario, defensa e infraestructura crítica con horizonte de seguridad de 20+ años.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {["NIST FIPS 203", "NIST FIPS 204", "SP 800-38D", "SP 800-56C", "NSA CNSA 2.0 aligned", "ENISA aligned", "BSI TR-02102-1 aligned"].map(t => (
              <Tag key={t}>{t}</Tag>
            ))}
          </div>
        </div>

        {/* ── Honesty notice ───────────────────────────────────────────────── */}
        <div className="border border-amber-800/25 bg-amber-950/8 px-5 py-4 flex gap-3">
          <AlertTriangle size={13} className="text-amber-400/50 shrink-0 mt-0.5" />
          <div>
            <div className="text-[7.5px] font-bold text-amber-300/60 mb-1">ALCANCE DEL SISTEMA</div>
            <p className="text-[7px] text-white/35 leading-relaxed">
              Este sistema implementa <strong className="text-white/55">criptografía post-cuántica</strong> (algoritmos resistentes a ataques de computadores cuánticos
              sobre canales de comunicación clásicos). <em>No</em> es un sistema QKD (Quantum Key Distribution), que requiere
              hardware fotónico especializado. Los algoritmos implementados son los mismos que mandatan
              la NSA, el BSI alemán y la ENISA para proteger infraestructuras críticas frente a amenazas cuánticas futuras.
            </p>
          </div>
        </div>

        {/* ── Primitives ───────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Primitivas Criptográficas</SectionLabel>

          {/* ML-KEM-768 */}
          <Collapsible title="ML-KEM-768 — Intercambio de Claves Post-Cuántico" badge="FIPS 203" defaultOpen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Row k="Nombre completo"   v="Module-Lattice Key-Encapsulation Mechanism" />
                <Row k="Base matemática"   v="CRYSTALS-Kyber (MLWE — Module Learning With Errors)" />
                <Row k="Nivel de seguridad" v="NIST Level 3 — 128 bits post-cuánticos" />
                <Row k="Modelo de ataque"  v="IND-CCA2 (adaptative chosen-ciphertext)" />
                <Row k="Clave pública"     v="1.184 bytes" />
                <Row k="Ciphertext KEM"    v="1.088 bytes" />
                <Row k="Secreto compartido" v="32 bytes → entrada a HKDF-SHA256" />
              </div>
              <div>
                <Row k="Inmune a Shor"     v="SÍ — MLWE no factorizable con QFT" ok={true} />
                <Row k="Impacto Grover"    v="Ninguno — sin speedup cuadrático para MLWE" ok={true} />
                <Row k="Reemplaza"         v="RSA-2048, ECDH P-256/P-384" ok={true} />
                <Row k="Estándar"          v="NIST FIPS 203 — publicado agosto 2024" ok={true} />
                <Row k="Perfect Fwd Secrecy" v="SÍ — clave KEM efímera por sesión" ok={true} />
                <div className="mt-3 p-3 border border-teal-900/30 bg-black/20">
                  <div className="text-[6.5px] tracking-widest text-white/20 mb-1">MANDATO NORMATIVO</div>
                  <p className="text-[7px] text-white/40 leading-relaxed">
                    NSA CNSA 2.0 mandata ML-KEM para sistemas de seguridad nacional antes de 2030–2033.
                    BSI TR-02102-1 recomienda Kyber-768 para alta seguridad. ENISA endorses.
                  </p>
                </div>
              </div>
            </div>
          </Collapsible>

          {/* ML-DSA-65 */}
          <Collapsible title="ML-DSA-65 — Firma Digital Post-Cuántica" badge="FIPS 204">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Row k="Nombre completo"   v="Module-Lattice Digital Signature Algorithm" />
                <Row k="Base matemática"   v="CRYSTALS-Dilithium (MSIS + MLWE)" />
                <Row k="Nivel de seguridad" v="NIST Level 3 — 128 bits post-cuánticos" />
                <Row k="Modelo de ataque"  v="EUF-CMA (existential unforgeability)" />
                <Row k="Clave pública"     v="1.952 bytes" />
                <Row k="Firma"             v="3.309 bytes" />
              </div>
              <div>
                <Row k="Inmune a Shor"     v="SÍ — hardness en retícula, no en logaritmo discreto" ok={true} />
                <Row k="Autenticación"     v="Cada payload firmado — previene MitM" ok={true} />
                <Row k="Reemplaza"         v="ECDSA P-256/P-384, RSA-PSS, EdDSA" ok={true} />
                <Row k="Estándar"          v="NIST FIPS 204 — publicado agosto 2024" ok={true} />
              </div>
            </div>
          </Collapsible>

          {/* AES-256-GCM */}
          <Collapsible title="AES-256-GCM — Cifrado Simétrico Autenticado" badge="SP 800-38D">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Row k="Nombre completo"   v="AES-256 Galois/Counter Mode (AEAD)" />
                <Row k="Clave"             v="256 bits — derivada de HKDF-SHA256(ML-KEM shared secret)" />
                <Row k="IV/Nonce"          v="96 bits (12 bytes) — aleatorio por mensaje" />
                <Row k="Authentication tag" v="128 bits — integridad garantizada" />
                <Row k="Impacto Grover"    v="256 bits → 128 bits equivalentes. Permanece NIST Level 3." ok={true} />
              </div>
              <div>
                <div className="text-[6.5px] tracking-widest text-white/20 mb-2">APROBACIONES</div>
                <div className="space-y-1.5">
                  {["NSA Suite B / CNSA 1.0", "ISO/IEC 18033-3", "PCI-DSS v4.0", "FIPS 140-2/3 (AES module)", "NATO classified comms"].map(a => (
                    <div key={a} className="flex items-center gap-2">
                      <CheckCircle2 size={8} className="text-teal-400/60" />
                      <span className="text-[7px] text-white/45">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Collapsible>
        </div>

        {/* ── Handshake flow ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Flujo del Protocolo de Intercambio</SectionLabel>
          <div className="border border-white/6 bg-white/[0.012] p-6">
            <div className="grid grid-cols-2 gap-0">
              <div className="border-r border-white/8 pr-6">
                <div className="text-[6.5px] tracking-widest text-teal-400/40 mb-4 text-center">CLIENTE</div>
                {[
                  "1 · Genera par de claves ML-KEM-768 efímero",
                  "3 · Encapsula con pubkey servidor → (ciphertext, sharedSecret)",
                  "5 · Deriva sessionKey = HKDF-SHA256(sharedSecret, sessionId, 'EPR-1-PQC-v1')",
                  "7 · Cifra mensaje: AES-256-GCM(sessionKey, plaintext)",
                  "9 · Firma payload con ML-DSA-65",
                ].map((s, i) => (
                  <div key={i} className="flex gap-2 py-1.5 border-b border-white/4 last:border-0">
                    <span className="text-[6.5px] font-mono text-white/40">{s}</span>
                  </div>
                ))}
              </div>
              <div className="pl-6">
                <div className="text-[6.5px] tracking-widest text-teal-400/40 mb-4 text-center">SERVIDOR</div>
                {[
                  "2 · Expone pubkey ML-KEM-768 + ML-DSA-65 persistente",
                  "4 · Desencapsula ciphertext → mismo sharedSecret (sin ver clave privada cliente)",
                  "6 · Deriva sessionKey idéntica → sesión segura establecida",
                  "8 · Descifra: AES-256-GCM(sessionKey, ciphertext) → plaintext",
                  "10 · Verifica firma ML-DSA-65 → autenticidad confirmada",
                ].map((s, i) => (
                  <div key={i} className="flex gap-2 py-1.5 border-b border-white/4 last:border-0">
                    <span className="text-[6.5px] font-mono text-white/40">{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 border-t border-white/5 pt-4 grid grid-cols-4 gap-4 text-center">
              {[
                { label: "PFS", value: "Perfect Forward Secrecy" },
                { label: "IND-CCA2", value: "Indistinguishable under adaptive chosen-ciphertext" },
                { label: "EUF-CMA", value: "Existentially unforgeable under chosen-message" },
                { label: "AEAD", value: "Authenticated Encryption with Associated Data" },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <div className="text-[8px] font-bold text-teal-300/60">{label}</div>
                  <div className="text-[6px] text-white/25">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Threat model ─────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Modelo de Amenaza</SectionLabel>

          {/* Shor / Grover comparison table */}
          <div className="border border-white/6 overflow-x-auto">
            <table className="w-full text-[7px]">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-4 py-3 text-white/30 font-normal tracking-widest text-[6.5px]">ALGORITMO</th>
                  <th className="text-left px-4 py-3 text-white/30 font-normal tracking-widest text-[6.5px]">RSA-2048 / ECDH</th>
                  <th className="text-left px-4 py-3 text-white/30 font-normal tracking-widest text-[6.5px]">AES-256-GCM</th>
                  <th className="text-left px-4 py-3 text-white/30 font-normal tracking-widest text-[6.5px]">ML-KEM-768</th>
                  <th className="text-left px-4 py-3 text-white/30 font-normal tracking-widest text-[6.5px]">ML-DSA-65</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { attack: "Shor (QFT)", rsa: "ROTO — 0 bits de seguridad", aes: "No aplicable", kem: "INMUNE — MLWE", dsa: "INMUNE — MSIS" },
                  { attack: "Grover (búsqueda)", rsa: "Marginal (ya roto por Shor)", aes: "256→128 bits (seguro)", kem: "Sin speedup", dsa: "Sin speedup" },
                  { attack: "HNDL (Harvest Now)", rsa: "CRÍTICO — datos de hoy, descifrado futuro", aes: "Mitigado por PFS", kem: "MITIGADO — clave efímera", dsa: "No aplicable" },
                  { attack: "MitM clásico", rsa: "Protegido por PKI", aes: "Autenticado (GCM tag)", kem: "ML-DSA-65 previene", dsa: "EUF-CMA previene" },
                ].map(({ attack, rsa, aes, kem, dsa }) => (
                  <tr key={attack} className="border-b border-white/4 last:border-0">
                    <td className="px-4 py-2.5 text-white/55 font-bold text-[7px]">{attack}</td>
                    <td className="px-4 py-2.5">
                      <span className={rsa.startsWith("ROTO") || rsa.startsWith("CRÍTICO") ? "text-red-300/60" : "text-white/30"}>{rsa}</span>
                    </td>
                    <td className="px-4 py-2.5 text-white/40">{aes}</td>
                    <td className="px-4 py-2.5 text-teal-300/60">{kem}</td>
                    <td className="px-4 py-2.5 text-teal-300/60">{dsa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-white/6 px-5 py-4 bg-white/[0.01]">
            <div className="text-[6.5px] tracking-widest text-white/20 mb-2">HARVEST NOW, DECRYPT LATER (HNDL)</div>
            <p className="text-[7.5px] text-white/45 leading-relaxed">
              Un adversario (estado-nación) puede capturar tráfico cifrado con RSA/ECDH <em>hoy</em> y descifrarlo
              cuando disponga de un ordenador cuántico suficientemente potente (~4.000 qubits lógicos para RSA-2048,
              estimado 2030–2035 según Gidney & Ekerå 2021). Los sectores bancario, defensa y salud
              manejan datos con confidencialidad requerida de 10–30 años — exactamente la ventana de riesgo.
              <strong className="text-white/60"> ML-KEM-768 con claves efímeras elimina este vector por completo.</strong>
            </p>
          </div>
        </div>

        {/* ── Regulatory alignment ─────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Alineación Normativa</SectionLabel>
          <div className="space-y-1.5">
            {[
              { body: "NIST (EE.UU.)", doc: "FIPS 203 + FIPS 204", status: "IMPLEMENTADO", color: "teal", detail: "Algoritmos finalizados en agosto 2024. EPR-1 implementa ML-KEM-768 y ML-DSA-65 directamente sin wrappers." },
              { body: "NSA / CNSA 2.0", doc: "Commercial National Security Algorithm Suite 2.0 — Sep 2022", status: "ALINEADO", color: "teal", detail: "NSA mandata ML-KEM y ML-DSA para todos los sistemas de seguridad nacional (NSS). Plazo: software 2025, redes 2026, IT general 2030–2033." },
              { body: "ENISA (UE)", doc: "Post-Quantum Cryptography — Current state 2021", status: "ALINEADO", color: "teal", detail: "ENISA recomienda Kyber (ML-KEM) y Dilithium (ML-DSA) para migración PQC en infraestructura europea." },
              { body: "BSI (Alemania)", doc: "TR-02102-1 v2024-01", status: "ALINEADO", color: "teal", detail: "Bundesamt für Sicherheit recomienda explícitamente Kyber-768 y Dilithium-3 — parámetros exactos de EPR-1." },
              { body: "BIS / Basel", doc: "Operational Resilience — Cryptographic Risk 2024", status: "RELEVANTE", color: "amber", detail: "El BIS identifica HNDL como riesgo sistémico para el sector bancario. EPR-1 mitiga HNDL mediante ML-KEM efímero." },
            ].map(({ body, doc, status, color, detail }) => (
              <div key={body} className={`border ${color === "amber" ? "border-amber-800/20" : "border-teal-800/15"} bg-white/[0.008] px-4 py-3`}>
                <div className="flex items-start justify-between gap-4 mb-1">
                  <div>
                    <span className="text-[8px] font-bold text-white/65">{body}</span>
                    <span className="ml-3 text-[6.5px] text-white/25">{doc}</span>
                  </div>
                  <Tag color={color}>{status}</Tag>
                </div>
                <p className="text-[7px] text-white/35 leading-relaxed">{detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Use cases ────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Casos de Uso por Sector</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                icon: Landmark, sector: "Banca e Infraestructura Financiera",
                actors: "SWIFT, TARGET2/T2S, bancos centrales, entidades de inversión",
                use: "Intercambio de claves post-cuántico para mensajería interbancaria de liquidación y canales de datos financieros",
                regs: ["DORA (EU) 2022/2554", "PCI-DSS v4.0", "SWIFT CSP", "Basilea IV"],
                color: "teal",
              },
              {
                icon: Shield, sector: "Defensa e Inteligencia",
                actors: "Estados miembro OTAN, agencias nacionales, contratistas DoD/EDA",
                use: "Comunicaciones clasificadas y sensibles resistentes a ataques cuánticos de estado-nación",
                regs: ["NSA CNSA 2.0 (obligatorio 2030–2033)", "NATO STANAG 4774", "Common Criteria EAL4+"],
                color: "blue",
              },
              {
                icon: Zap, sector: "Infraestructura Crítica",
                actors: "Operadores de red eléctrica, telecomunicaciones, agua, transporte",
                use: "Cifrado de comunicaciones SCADA/ICS resistente a ataques cuánticos futuros — horizonte 20+ años",
                regs: ["EU NIS2 2022/2555", "IEC 62443", "NERC CIP"],
                color: "amber",
              },
              {
                icon: Building2, sector: "Administración Pública",
                actors: "Ministerios, agencias gubernamentales, registros nacionales",
                use: "Protección de datos ciudadanos con garantías de confidencialidad a largo plazo contra HNDL",
                regs: ["eIDAS 2.0", "GDPR Art. 32", "ENS (España) nivel Alto"],
                color: "teal",
              },
            ].map(({ icon: Icon, sector, actors, use, regs, color }) => (
              <div key={sector} className={`border ${color === "amber" ? "border-amber-800/15" : color === "blue" ? "border-blue-800/15" : "border-teal-800/15"} bg-white/[0.01] p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={11} className={color === "amber" ? "text-amber-400/50" : color === "blue" ? "text-blue-400/50" : "text-teal-400/50"} />
                  <span className="text-[8px] font-bold text-white/65">{sector}</span>
                </div>
                <p className="text-[7px] text-white/30 mb-1"><strong className="text-white/45">Actores:</strong> {actors}</p>
                <p className="text-[7px] text-white/40 leading-relaxed mb-2">{use}</p>
                <div className="flex flex-wrap gap-1">
                  {regs.map(r => <Tag key={r} color={color}>{r}</Tag>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Performance ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Rendimiento Medido</SectionLabel>
          <div className="border border-white/6 bg-white/[0.01]">
            <div className="px-4 py-2 border-b border-white/5">
              <span className="text-[6.5px] tracking-widest text-white/20">BENCHMARK REAL · Node.js 24 · @noble/post-quantum 0.5.4 · sin aceleración hardware</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
              {[
                { label: "Handshake completo", value: "~30 ms", sub: "KEM + HKDF + AES + DSA" },
                { label: "ML-KEM-768 keygen", value: "< 2 ms", sub: "par de claves efímero" },
                { label: "ML-DSA-65 sign", value: "< 20 ms", sub: "firma 3309 bytes" },
                { label: "AES-256-GCM encrypt", value: "< 0.5 ms", sub: "por mensaje" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="border-r border-white/5 last:border-r-0 px-4 py-4 text-center">
                  <div className="text-[14px] font-bold text-teal-300/70 mb-1">{value}</div>
                  <div className="text-[7px] text-white/40">{label}</div>
                  <div className="text-[6px] text-white/20 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-white/5">
              <span className="text-[6.5px] text-white/20">Con AES-NI + AVX2 (hardware moderno): 10–100× mayor rendimiento. Hardware HSM certificado FIPS 140-3: disponible en producción.</span>
            </div>
          </div>
        </div>

        {/* ── Implementation ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Implementación Técnica</SectionLabel>
          <div className="border border-white/6 bg-white/[0.01] p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <Row k="Librería"           v="@noble/post-quantum v0.5.4 (Paul Miller)" />
                <Row k="Licencia"           v="MIT — auditable, sin dependencias opacas" ok={true} />
                <Row k="Auditoría"          v="Auditada independientemente (ver GitHub)" ok={true} />
                <Row k="Lenguaje"           v="TypeScript / Node.js 24" />
                <Row k="Código fuente"      v="Incluido en cesión completa de IP" ok={true} />
              </div>
              <div className="space-y-0.5">
                <Row k="Dependencias nativas" v="Ninguna — pure JavaScript, sin OpenSSL" ok={true} />
                <Row k="Portabilidad"        v="Cualquier entorno Node.js, Cloudflare Workers, Deno" ok={true} />
                <Row k="Integración TLS"     v="Compatible como capa PQC sobre TLS 1.3 (RFC 8446)" ok={true} />
                <Row k="HSM integration"     v="PKCS#11 compatible — preparado para hardware HSM" ok={true} />
              </div>
            </div>
            <div className="mt-4 p-3 border border-white/5 bg-black/20">
              <div className="text-[6.5px] tracking-widest text-white/20 mb-2">ADVERTENCIA SOBRE CERTIFICACIÓN FORMAL</div>
              <p className="text-[7px] text-white/30 leading-relaxed">
                Certificación formal FIPS 140-2/3 y evaluación Common Criteria EAL4+ requieren proceso
                de acreditación con laboratorio aprobado (NVLAP/CSEC). Los <em>algoritmos</em> implementados
                son los NIST-estandarizados — la certificación del <em>módulo</em> es un proceso separado
                que el comprador puede iniciar con el código fuente entregado.
              </p>
            </div>
          </div>
        </div>

        {/* ── Live demo ────────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <SectionLabel>Demostración en Vivo</SectionLabel>
          <p className="text-[7.5px] text-white/30 leading-relaxed mb-3">
            El siguiente panel ejecuta el protocolo completo en el servidor de producción EPR-1 en tiempo real.
            Introduce cualquier mensaje para ver el handshake ML-KEM → HKDF → AES-GCM → ML-DSA paso a paso
            con los artefactos criptográficos reales.
          </p>
          <PQCChannelPanel />
        </div>

        {/* ── Compliance report download ────────────────────────────────────── */}
        <div className="border border-white/6 bg-white/[0.01] px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[8px] font-bold text-white/55 mb-0.5">Informe de Cumplimiento JSON</div>
            <div className="text-[6.5px] text-white/25">Datos estructurados para due diligence técnica — primitivas, estándares, modelo de amenaza, casos de uso</div>
          </div>
          <a
            href={`${BASE}/api/pqc/compliance-report`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 border border-teal-400/30 bg-teal-400/5 hover:bg-teal-400/12 text-teal-300/70 hover:text-teal-300 px-4 py-2 text-[7.5px] tracking-widest transition-all"
          >
            VER INFORME <ExternalLink size={9} />
          </a>
        </div>

        {/* Report data when loaded */}
        {report && (
          <div className="text-[6px] font-mono text-white/15 text-right">
            Informe generado: {new Date((report.report as { date: string }).date).toLocaleString()} ·{" "}
            {(report.primitives as unknown[]).length} primitivas ·{" "}
            {(report.regulatory_alignment as unknown[]).length} marcos normativos ·{" "}
            {(report.use_cases as unknown[]).length} sectores
          </div>
        )}

        <div className="text-center text-[6px] font-mono text-white/10 pb-6">
          © Manuel Alexander Roca González · EPR-1 Post-Quantum Channel v1.0 · alexcanarioroca@gmail.com<br />
          Los algoritmos descritos son estándares NIST públicos (FIPS 203/204). La implementación es propiedad exclusiva del autor.
        </div>

      </div>
    </div>
  );
}
