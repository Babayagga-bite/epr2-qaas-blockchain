// SPDX-License-Identifier: MIT
/**
 * PQC Communications Lab — Public testing environment for enterprise buyers.
 * Demonstrates the full ML-KEM-768 + AES-256-GCM + ML-DSA-65 channel.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import PQCChannelPanel from "@/components/dashboard/PQCChannelPanel";
import { ShieldCheck, Terminal, FileText, ArrowLeft, Copy, CheckCheck } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ── Code snippets ─────────────────────────────────────────────────────────────
const SNIPPETS = {
  curl: `# 1. Obtener claves públicas del servidor
curl ${window?.location?.origin ?? "https://nexus-forge-control.replit.app"}${BASE}/api/pqc/server-keys

# 2. Ejecutar demo completa (un solo round-trip)
curl -X POST \\
  ${window?.location?.origin ?? "https://nexus-forge-control.replit.app"}${BASE}/api/pqc/demo \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Mensaje confidencial para cifrar con PQC"}'

# 3. Estado del canal y sesiones activas
curl ${window?.location?.origin ?? "https://nexus-forge-control.replit.app"}${BASE}/api/pqc/status

# 4. Informe de compliance (NIST FIPS 203/204, CNSA 2.0, BSI, ENISA)
curl ${window?.location?.origin ?? "https://nexus-forge-control.replit.app"}${BASE}/api/pqc/compliance-report`,

  js: `// npm install @noble/post-quantum
import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { ml_dsa65  } from "@noble/post-quantum/ml-dsa.js";
import { createCipheriv, hkdfSync, randomBytes } from "node:crypto";

const API = "${window?.location?.origin ?? "https://nexus-forge-control.replit.app"}${BASE}";

// ── 1. Obtener clave pública del servidor ─────────────────────────────────────
const { kem } = await fetch(\`\${API}/api/pqc/server-keys\`).then(r => r.json());
const serverPub = new Uint8Array(Buffer.from(kem.public_key, "hex"));

// ── 2. Encapsular — genera secreto compartido ─────────────────────────────────
const { cipherText, sharedSecret } = ml_kem768.encapsulate(serverPub);

// ── 3. Handshake — servidor decapsula y devuelve sessionId firmado ────────────
const { sessionId } = await fetch(\`\${API}/api/pqc/handshake\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ kemCiphertextHex: Buffer.from(cipherText).toString("hex") }),
}).then(r => r.json());

// ── 4. Derivar clave AES-256 con HKDF-SHA256 ─────────────────────────────────
const aesKey = Buffer.from(
  hkdfSync("sha256", Buffer.from(sharedSecret), Buffer.from(sessionId),
           Buffer.from("EPR-1-PQC-v1"), 32)
);

// ── 5. Cifrar mensaje con AES-256-GCM ────────────────────────────────────────
const iv     = randomBytes(12);
const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
const ct     = Buffer.concat([cipher.update("Mi mensaje secreto", "utf8"), cipher.final()]);

// ── 6. Firmar con ML-DSA-65 (clave efímera del cliente) ──────────────────────
const clientDsa = ml_dsa65.keygen();
const signature = ml_dsa65.sign(ct, clientDsa.secretKey);

// ── 7. Enviar al servidor para descifrar y verificar ─────────────────────────
const result = await fetch(\`\${API}/api/pqc/send\`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId,
    ivHex:           iv.toString("hex"),
    ciphertextHex:   ct.toString("hex"),
    authTagHex:      cipher.getAuthTag().toString("hex"),
    mldsaSignatureHex: Buffer.from(signature).toString("hex"),
    mldsaPublicKeyHex: Buffer.from(clientDsa.publicKey).toString("hex"),
  }),
}).then(r => r.json());

console.log("Texto recuperado:", result.plaintext);
console.log("Firma válida:",     result.signatureValid); // true`,

  python: `# pip install requests pycryptodome
import requests, json
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
import hashlib, hmac

API = "${window?.location?.origin ?? "https://nexus-forge-control.replit.app"}${BASE}"

# Opción más simple — demo en un solo round-trip (sin cliente PQC en Python)
resp = requests.post(f"{API}/api/pqc/demo",
    json={"message": "Mensaje cifrado con ML-KEM-768 + AES-256-GCM + ML-DSA-65"})

data = resp.json()
print(f"Protocolo completado en {data['summary']['total_duration_ms']:.1f} ms")
print(f"NIST Compliant:    {data['summary']['nist_compliant']}")
print(f"Forward Secrecy:   {data['summary']['forward_secrecy']}")
print(f"Quantum Resistant: {data['summary']['quantum_resistant']}")
print(f"Firma verificada:  {data['step6_signature']['verified']}")
print(f"Session ID:        {data['step4_key_derivation']['session_id']}")
print(f"Ciphertext (hex):  {data['step5_encryption']['ciphertext_hex'][:32]}...")`
};

type Lang = keyof typeof SNIPPETS;

function CodeBlock({ code, lang }: { code: string; lang: Lang }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="relative bg-black/60 border border-white/8">
      <button
        onClick={copy}
        className="absolute top-2 right-2 flex items-center gap-1 text-[6.5px] text-white/25 hover:text-white/60 transition-colors border border-white/8 px-2 py-1"
      >
        {copied ? <CheckCheck size={8} className="text-teal-400" /> : <Copy size={8} />}
        <span>{copied ? "COPIADO" : "COPIAR"}</span>
      </button>
      <pre className="overflow-x-auto p-4 text-[7.5px] font-mono text-white/55 leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

const PRIMITIVES = [
  { id: "ML-KEM-768",  std: "NIST FIPS 203",     role: "Intercambio de claves",  detail: "Resistente a Shor · IND-CCA2 · 1184 bytes clave pública" },
  { id: "HKDF-SHA256", std: "NIST SP 800-56C",   role: "Derivación de clave",   detail: "32 bytes AES desde secreto compartido · label EPR-1-PQC-v1" },
  { id: "AES-256-GCM", std: "NIST SP 800-38D",   role: "Cifrado autenticado",   detail: "AEAD · 128-bit PQ tras Grover · aprobado NSA/CNSA 2.0" },
  { id: "ML-DSA-65",   std: "NIST FIPS 204",     role: "Firma digital",         detail: "Resistente a Shor · EUF-CMA · 3309 bytes firma" },
];

const THREATS = [
  {
    threat: "Harvest Now, Decrypt Later",
    classical: "CRÍTICO — RSA/ECDH vulnerables",
    epr1: "INMUNE — MLWE no tiene speedup cuántico conocido",
    ok: true,
  },
  {
    threat: "Algoritmo de Shor",
    classical: "Rompe RSA-2048 con ~4.000 qubits lógicos",
    epr1: "INMUNE — ML-KEM y ML-DSA basados en MLWE/MSIS",
    ok: true,
  },
  {
    threat: "Algoritmo de Grover",
    classical: "Reduce clave AES-256 a 128-bit equivalente",
    epr1: "MITIGADO — 128-bit PQ mantenido (NIST Level 3)",
    ok: true,
  },
  {
    threat: "Man-in-the-Middle",
    classical: "Sin firma → suplantación posible",
    epr1: "BLOQUEADO — ML-DSA-65 firma cada sesión y payload",
    ok: true,
  },
];

export default function PQCLab() {
  const [, navigate] = useLocation();
  const [activeLang, setActiveLang] = useState<Lang>("curl");

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono">

      {/* ── TOP BANNER ── */}
      <div className="border-b border-white/5 bg-black px-6 py-2 flex items-center justify-center gap-3">
        <div className="w-1 h-1 rounded-full bg-teal-400/60 animate-pulse" />
        <span className="text-[8px] tracking-[0.4em] text-white/40 uppercase">
          EPR-1 · PQC Communications Lab · NIST FIPS 203 / 204 · Testing Environment
        </span>
        <div className="w-1 h-1 rounded-full bg-teal-400/60 animate-pulse" />
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/95 backdrop-blur-sm px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[8px] text-white/30 hover:text-white/70 transition-colors"
          >
            <ArrowLeft size={11} />
            <span className="tracking-widest">VOLVER</span>
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-teal-400/70" />
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/80">PQC LAB</span>
            <span className="text-[7px] border border-teal-400/25 px-2 py-0.5 text-teal-400/50 tracking-widest">TESTING</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`${BASE}/api/pqc/compliance-report`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 text-[8px] text-white/30 hover:text-white/60 transition-colors"
          >
            <FileText size={10} />
            <span className="tracking-widest">COMPLIANCE REPORT ↗</span>
          </a>
          <button
            onClick={() => navigate("/messenger")}
            className="hidden md:block text-[8px] border border-teal-400/20 text-teal-400/50 hover:border-teal-400/50 hover:text-teal-400/80 px-3 py-1.5 transition-all tracking-widest"
          >
            MENSAJERÍA PQC ↗
          </button>
          <a
            href={`${BASE}/api/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[8px] border border-white/15 text-white/40 hover:border-white/40 hover:text-white/70 px-3 py-1.5 transition-all tracking-widest"
          >
            API DOCS ↗
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-16">

        {/* ── HERO ── */}
        <section className="space-y-6">
          <div className="text-[8px] tracking-[0.5em] text-white/20 uppercase">
            EPR-1 · Laboratorio de Comunicaciones Post-Cuánticas
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Canal seguro post-cuántico<br />
            <span className="text-white/35">listo para integrar en sus sistemas.</span>
          </h1>
          <p className="text-[9px] text-white/40 leading-relaxed max-w-2xl">
            Testee en tiempo real el protocolo completo: intercambio de claves ML-KEM-768
            resistente a computadores cuánticos, cifrado AES-256-GCM con HKDF, y firma
            digital ML-DSA-65. Todo conforme NIST FIPS 203/204, CNSA 2.0, BSI TR-02102 y ENISA.
          </p>

          {/* Primitive badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-white/8">
            {PRIMITIVES.map((p) => (
              <div key={p.id} className="py-4 px-3 border-r border-white/8 last:border-r-0 space-y-1.5">
                <div className="text-[5.5px] tracking-widest text-teal-400/40 uppercase">{p.role}</div>
                <div className="text-[9px] font-bold font-mono text-teal-300/80">{p.id}</div>
                <div className="text-[6px] text-white/20 tracking-wide">{p.std}</div>
                <div className="text-[6px] text-white/15 leading-relaxed">{p.detail}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── LIVE DEMO ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[8px] tracking-[0.4em] text-white/20 uppercase mb-1">Demo Interactiva</div>
              <h2 className="text-lg font-bold">Ejecute el protocolo completo ahora</h2>
            </div>
            <div className="flex items-center gap-1.5 border border-teal-400/20 px-3 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-teal-400/70 animate-pulse" />
              <span className="text-[7px] text-teal-400/60 tracking-widest">API EN VIVO</span>
            </div>
          </div>
          <p className="text-[8px] text-white/30 leading-relaxed">
            Escriba cualquier mensaje y ejecute el handshake ML-KEM-768 completo contra el servidor real.
            Cada paso muestra los artefactos criptográficos reales — clave pública, ciphertext KEM,
            secreto compartido, clave AES derivada, IV, ciphertext cifrado y firma DSA verificada.
          </p>
          <PQCChannelPanel />
        </section>

        {/* ── INTEGRATION CODE ── */}
        <section className="space-y-4">
          <div className="text-[8px] tracking-[0.4em] text-white/20 uppercase mb-1">Integración</div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Terminal size={16} className="text-white/40" />
            Conecte sus sistemas en minutos
          </h2>
          <p className="text-[8px] text-white/30 leading-relaxed">
            La API acepta JSON estándar. No requiere SDK propietario — cualquier cliente HTTP puede hacer el handshake.
            Use <code className="text-teal-300/60">/api/pqc/demo</code> para demos de una llamada, o el flujo de tres pasos
            (server-keys → handshake → send) para integración real con Perfect Forward Secrecy.
          </p>

          {/* Language tabs */}
          <div className="flex gap-0 border border-white/8 w-fit">
            {(["curl", "js", "python"] as Lang[]).map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-5 py-2 text-[8px] tracking-widest transition-all border-r border-white/8 last:border-r-0 ${
                  activeLang === l
                    ? "bg-teal-400/10 text-teal-300/80 border-b border-b-teal-400/30"
                    : "text-white/25 hover:text-white/50 hover:bg-white/5"
                }`}
              >
                {l === "js" ? "JavaScript" : l.toUpperCase()}
              </button>
            ))}
          </div>

          <CodeBlock code={SNIPPETS[activeLang]} lang={activeLang} />

          <div className="grid md:grid-cols-3 gap-0 border border-white/5 text-center">
            {[
              { label: "Endpoints disponibles", value: "5", sub: "server-keys · handshake · send · demo · status" },
              { label: "Autenticación requerida", value: "NO", sub: "demo y status son públicos" },
              { label: "Tiempo de integración", value: "< 1h", sub: "con @noble/post-quantum (npm)" },
            ].map((s, i) => (
              <div key={i} className="py-6 px-4 border-r border-white/5 last:border-r-0">
                <div className="text-[7px] text-white/20 tracking-widest uppercase mb-2">{s.label}</div>
                <div className="text-2xl font-bold text-teal-400">{s.value}</div>
                <div className="text-[6.5px] text-white/20 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── THREAT MODEL ── */}
        <section className="space-y-4">
          <div className="text-[8px] tracking-[0.4em] text-white/20 uppercase mb-1">Modelo de amenaza</div>
          <h2 className="text-lg font-bold">Por qué RSA/ECDH no son suficientes</h2>
          <p className="text-[8px] text-white/30 leading-relaxed max-w-2xl">
            Un ordenador cuántico con ~4.000 qubits lógicos rompe RSA-2048 y ECDH P-256 con el algoritmo de Shor.
            Adversarios estatales ya recopilan tráfico cifrado hoy para descifrarlo en 2030–2035.
            El canal EPR-1 elimina este riesgo con primitivas basadas en retículos (MLWE), inmunes a Shor y Grover.
          </p>
          <div className="border border-white/8 overflow-hidden">
            <div className="grid grid-cols-3 bg-white/[0.03] border-b border-white/8">
              {["Amenaza", "Criptografía clásica", "Canal EPR-1 (PQC)"].map((h) => (
                <div key={h} className="px-4 py-2 text-[7px] tracking-[0.25em] text-white/25 uppercase">{h}</div>
              ))}
            </div>
            {THREATS.map((t, i) => (
              <div key={i} className="grid grid-cols-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors">
                <div className="px-4 py-3 text-[7.5px] font-bold text-white/60">{t.threat}</div>
                <div className="px-4 py-3 text-[7px] text-red-400/60">{t.classical}</div>
                <div className="px-4 py-3 text-[7px] text-teal-300/70 flex items-start gap-1.5">
                  <span className="text-teal-400 shrink-0 mt-0.5">✓</span>
                  {t.epr1}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── COMPLIANCE ── */}
        <section className="border border-white/8 p-6 space-y-4 bg-white/[0.01]">
          <div className="text-[8px] tracking-[0.4em] text-white/20 uppercase">Marcos regulatorios</div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { body: "NIST (USA)",    doc: "FIPS 203 + FIPS 204",          status: "IMPLEMENTADO", detail: "Estándares finalizados agosto 2024. ML-KEM + ML-DSA implementados directamente, sin wrappers." },
              { body: "NSA / CNSA 2.0", doc: "Commercial NSA Suite 2.0",   status: "ALINEADO",      detail: "NSA exige ML-KEM y ML-DSA para National Security Systems desde 2025–2033. EPR-1 cumple Level 3." },
              { body: "BSI (Alemania)", doc: "TR-02102-1 v2024-01",         status: "ALINEADO",      detail: "BSI recomienda explícitamente Kyber (ML-KEM) y Dilithium (ML-DSA) — exactamente lo que implementa EPR-1." },
              { body: "ENISA (UE)",     doc: "Post-Quantum Cryptography 2021", status: "ALINEADO",   detail: "ENISA recomienda capa PQ + clásica para sistemas de alta seguridad. EPR-1 implementa la capa PQ completamente." },
            ].map((c) => (
              <div key={c.body} className="space-y-1.5 border border-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-bold text-white/60">{c.body}</span>
                  <span className="text-[6px] border border-teal-400/25 text-teal-400/50 px-2 py-0.5 tracking-widest">{c.status}</span>
                </div>
                <div className="text-[6.5px] text-white/25 tracking-wide">{c.doc}</div>
                <div className="text-[7px] text-white/35 leading-relaxed">{c.detail}</div>
              </div>
            ))}
          </div>
          <a
            href={`${BASE}/api/pqc/compliance-report`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-[8px] text-teal-400/50 hover:text-teal-400/80 transition-colors tracking-widest"
          >
            <FileText size={10} />
            VER INFORME DE COMPLIANCE COMPLETO (JSON) ↗
          </a>
        </section>

        {/* ── CTA ── */}
        <section className="border border-teal-800/20 bg-teal-950/5 p-8 text-center space-y-4">
          <div className="text-[8px] tracking-[0.4em] text-teal-400/30 uppercase">Adquisición</div>
          <h2 className="text-xl font-bold">¿Listo para integrar el canal PQC en su infraestructura?</h2>
          <p className="text-[8px] text-white/30 max-w-lg mx-auto leading-relaxed">
            El código fuente completo (API + frontend + Docker + documentación) está disponible
            como activo tecnológico por transferencia. Contacte para dossier técnico completo.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <a
              href="mailto:alexcanarioroca@gmail.com?subject=Dossier PQC - EPR-1"
              className="px-6 py-2.5 border border-teal-400/40 bg-teal-400/8 hover:bg-teal-400/15 text-teal-300/80 hover:text-teal-300 text-[9px] tracking-widest transition-all"
            >
              SOLICITAR DOSSIER TÉCNICO ↗
            </a>
            <button
              onClick={() => navigate("/dashboard")}
              className="px-6 py-2.5 border border-white/10 text-white/40 hover:border-white/30 hover:text-white/70 text-[9px] tracking-widest transition-all"
            >
              PANEL DE CONTROL EN VIVO ↗
            </button>
          </div>
          <div className="text-[6.5px] text-white/15 font-mono">
            alexcanarioroca@gmail.com · Jurisdicción: Las Palmas de Gran Canaria · Derecho español
          </div>
        </section>

      </div>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-6 px-6 text-center">
        <div className="text-[6.5px] text-white/10 font-mono tracking-widest">
          EPR-1 PQC Lab v1.0 · @noble/post-quantum (MIT) · NIST FIPS 203/204 · SP 800-38D/56C ·
          © Manuel Alexander Roca González · Todos los derechos reservados
        </div>
      </footer>
    </div>
  );
}
