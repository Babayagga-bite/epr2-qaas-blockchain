/**
 * BlockchainQaaS — Quantum-as-a-Service for Blockchain
 * Interactive demo: wallet keygen, tx signing, tx verification, channel encryption.
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  Wallet, FileSignature, ShieldCheck, Lock,
  ArrowLeft, Copy, CheckCheck, Loader, ChevronRight,
  Activity, Cpu, AlertTriangle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API  = `${BASE}/api/qaas`;

type Tab = "wallet" | "sign" | "verify" | "encapsulate";

interface WalletResult {
  wallet: { address: string; network: string; createdAt: string };
  signing: { algorithm: string; publicKey: string; privateKey: string; publicKeyBytes: number };
  encryption: { algorithm: string; publicKey: string; privateKey: string; publicKeyBytes: number };
  computeMs: number;
}

interface SignResult {
  success: boolean;
  txHash: string;
  signature: string;
  algorithm: string;
  signedAt: string;
  computeMs: number;
}

interface VerifyResult {
  valid: boolean;
  txHash: string;
  algorithm: string;
  verifiedAt: string;
  computeMs: number;
  error?: string;
}

interface EncapResult {
  success: boolean;
  sessionId: string;
  algorithm: string;
  ciphertext: { kem: string; encrypted: string; iv: string; authTag: string; salt: string };
  computeMs: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="text-teal-400/50 hover:text-teal-300 transition-colors ml-2 inline-flex items-center"
      title="Copiar"
    >
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
    </button>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  const text = JSON.stringify(data, null, 2);
  return (
    <div className="relative">
      <pre className="text-[9px] leading-relaxed text-teal-300/70 bg-black/40 border border-teal-400/10 p-3 overflow-x-auto rounded-sm max-h-64 scrollbar-thin">
        {text}
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={text} />
      </div>
    </div>
  );
}

// ── Tab: Wallet Keygen ───────────────────────────────────────────────────────
function WalletTab() {
  const [network, setNetwork] = useState<"mainnet" | "testnet" | "devnet">("testnet");
  const [label, setLabel]     = useState("");
  const [result, setResult]   = useState<WalletResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const generate = useCallback(async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch(`${API}/wallet/keygen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ network, label: label || undefined }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error desconocido");
      setResult(data as WalletResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [network, label]);

  return (
    <div className="space-y-4">
      <div className="text-[8px] tracking-[0.3em] text-white/30 uppercase mb-3">
        Genera un par de claves cuántico-seguras listas para blockchain
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[7px] tracking-widest text-white/40 uppercase">Red</label>
          <select
            value={network}
            onChange={e => setNetwork(e.target.value as "mainnet" | "testnet" | "devnet")}
            className="w-full bg-black/60 border border-teal-400/20 text-teal-300 text-[9px] px-3 py-2 focus:outline-none focus:border-teal-400/40"
          >
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
            <option value="devnet">Devnet</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[7px] tracking-widest text-white/40 uppercase">Etiqueta (opcional)</label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="mi-wallet-principal"
            className="w-full bg-black/60 border border-teal-400/20 text-teal-300 text-[9px] px-3 py-2 placeholder-white/20 focus:outline-none focus:border-teal-400/40"
          />
        </div>
      </div>

      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-2 border border-teal-400/30 text-teal-300 text-[8px] tracking-widest px-5 py-2.5 hover:bg-teal-400/8 transition-all disabled:opacity-40"
      >
        {loading ? <Loader size={12} className="animate-spin" /> : <Wallet size={12} />}
        {loading ? "GENERANDO CLAVES..." : "GENERAR WALLET"}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-[8px] text-red-400/80 border border-red-400/20 bg-red-400/5 px-3 py-2">
          <AlertTriangle size={10} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="border border-teal-400/20 bg-teal-400/3 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[7px] tracking-widest text-teal-400/60 uppercase">Dirección</span>
              <span className="text-[7px] text-white/30">{result.computeMs} ms</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-teal-300 font-mono break-all">{result.wallet.address}</span>
              <CopyButton text={result.wallet.address} />
            </div>
            <div className="flex gap-3 mt-1">
              <span className="text-[7px] text-white/30">ML-DSA-65 · {result.signing.publicKeyBytes} bytes</span>
              <span className="text-[7px] text-white/30">ML-KEM-768 · {result.encryption.publicKeyBytes} bytes</span>
            </div>
          </div>

          <div className="text-[7px] tracking-widest text-amber-400/60 uppercase flex items-center gap-1">
            <AlertTriangle size={9} /> Respuesta completa (incluye claves privadas — solo para demo)
          </div>
          <JsonBlock data={result} />
        </div>
      )}
    </div>
  );
}

// ── Tab: Transaction Signing ─────────────────────────────────────────────────
function SignTab() {
  const [txJson, setTxJson] = useState(`{
  "from": "qbc1q4a8f3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7",
  "to": "qbc1q1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
  "amount": "1000000",
  "fee": "1000",
  "nonce": 42,
  "chainId": "qaas-mainnet-1"
}`);
  const [privateKey, setPrivateKey] = useState("");
  const [result, setResult]         = useState<SignResult | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  const sign = useCallback(async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const tx = JSON.parse(txJson);
      const r  = await fetch(`${API}/tx/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: tx, privateKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error desconocido");
      setResult(data as SignResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [txJson, privateKey]);

  return (
    <div className="space-y-4">
      <div className="text-[8px] tracking-[0.3em] text-white/30 uppercase mb-3">
        Firma una transacción con ML-DSA-65 (resistente a computación cuántica)
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">Payload de transacción (JSON)</label>
        <textarea
          value={txJson}
          onChange={e => setTxJson(e.target.value)}
          rows={8}
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/80 text-[9px] font-mono px-3 py-2 focus:outline-none focus:border-teal-400/40 resize-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">
          Clave privada ML-DSA-65 (hex · 4032 bytes) — obtén una desde "Wallet"
        </label>
        <input
          type="text"
          value={privateKey}
          onChange={e => setPrivateKey(e.target.value)}
          placeholder="Pega aquí el campo signing.privateKey de la wallet generada..."
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/60 text-[8px] font-mono px-3 py-2 placeholder-white/15 focus:outline-none focus:border-teal-400/40"
        />
      </div>

      <button
        onClick={sign}
        disabled={loading || !privateKey}
        className="flex items-center gap-2 border border-violet-400/30 text-violet-300 text-[8px] tracking-widest px-5 py-2.5 hover:bg-violet-400/8 transition-all disabled:opacity-40"
      >
        {loading ? <Loader size={12} className="animate-spin" /> : <FileSignature size={12} />}
        {loading ? "FIRMANDO..." : "FIRMAR TRANSACCIÓN"}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-[8px] text-red-400/80 border border-red-400/20 bg-red-400/5 px-3 py-2">
          <AlertTriangle size={10} /> {error}
        </div>
      )}

      {result?.success && (
        <div className="space-y-3">
          <div className="border border-violet-400/20 bg-violet-400/3 p-3 space-y-2">
            <div className="text-[7px] tracking-widest text-violet-400/60 uppercase">TX Hash</div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-violet-300 font-mono break-all">{result.txHash}</span>
              <CopyButton text={result.txHash} />
            </div>
            <div className="text-[7px] text-white/30">{result.algorithm} · {result.computeMs} ms</div>
          </div>
          <JsonBlock data={result} />
        </div>
      )}
    </div>
  );
}

// ── Tab: Transaction Verification ───────────────────────────────────────────
function VerifyTab() {
  const [txJson, setTxJson]       = useState(`{
  "from": "qbc1q4a8f3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7",
  "to": "qbc1q1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
  "amount": "1000000",
  "fee": "1000",
  "nonce": 42,
  "chainId": "qaas-mainnet-1"
}`);
  const [signature, setSignature] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [result, setResult]       = useState<VerifyResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const verify = useCallback(async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const tx = JSON.parse(txJson);
      const r  = await fetch(`${API}/tx/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: tx, signature, publicKey }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error");
      setResult(data as VerifyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [txJson, signature, publicKey]);

  return (
    <div className="space-y-4">
      <div className="text-[8px] tracking-[0.3em] text-white/30 uppercase mb-3">
        Verifica la firma ML-DSA-65 de una transacción blockchain
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">Payload de transacción (JSON)</label>
        <textarea
          value={txJson}
          onChange={e => setTxJson(e.target.value)}
          rows={6}
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/80 text-[9px] font-mono px-3 py-2 focus:outline-none focus:border-teal-400/40 resize-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">Firma ML-DSA-65 (hex)</label>
        <input
          type="text"
          value={signature}
          onChange={e => setSignature(e.target.value)}
          placeholder="Pega aquí el campo signature del resultado de firma..."
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/60 text-[8px] font-mono px-3 py-2 placeholder-white/15 focus:outline-none focus:border-teal-400/40"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">Clave pública ML-DSA-65 (hex)</label>
        <input
          type="text"
          value={publicKey}
          onChange={e => setPublicKey(e.target.value)}
          placeholder="Pega aquí el campo signing.publicKey de la wallet..."
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/60 text-[8px] font-mono px-3 py-2 placeholder-white/15 focus:outline-none focus:border-teal-400/40"
        />
      </div>

      <button
        onClick={verify}
        disabled={loading || !signature || !publicKey}
        className="flex items-center gap-2 border border-emerald-400/30 text-emerald-300 text-[8px] tracking-widest px-5 py-2.5 hover:bg-emerald-400/8 transition-all disabled:opacity-40"
      >
        {loading ? <Loader size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
        {loading ? "VERIFICANDO..." : "VERIFICAR FIRMA"}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-[8px] text-red-400/80 border border-red-400/20 bg-red-400/5 px-3 py-2">
          <AlertTriangle size={10} /> {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className={`border p-3 space-y-1 ${result.valid ? "border-emerald-400/30 bg-emerald-400/5" : "border-red-400/30 bg-red-400/5"}`}>
            <div className="flex items-center gap-2">
              {result.valid
                ? <ShieldCheck size={14} className="text-emerald-400" />
                : <AlertTriangle size={14} className="text-red-400" />}
              <span className={`text-[10px] tracking-widest font-semibold ${result.valid ? "text-emerald-300" : "text-red-300"}`}>
                {result.valid ? "FIRMA VÁLIDA" : "FIRMA INVÁLIDA"}
              </span>
            </div>
            {result.txHash && (
              <div className="text-[7px] text-white/40 font-mono">{result.txHash}</div>
            )}
            {result.error && (
              <div className="text-[7px] text-red-400/70">{result.error}</div>
            )}
          </div>
          <JsonBlock data={result} />
        </div>
      )}
    </div>
  );
}

// ── Tab: Channel Encapsulation ───────────────────────────────────────────────
function EncapsulateTab() {
  const [kemPubKey, setKemPubKey] = useState("");
  const [payload, setPayload]     = useState("Mensaje confidencial para wallet destino. Solo el receptor puede descifrar.");
  const [result, setResult]       = useState<EncapResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const encapsulate = useCallback(async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const r = await fetch(`${API}/channel/encapsulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientKemPublicKey: kemPubKey, payload }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Error");
      setResult(data as EncapResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [kemPubKey, payload]);

  return (
    <div className="space-y-4">
      <div className="text-[8px] tracking-[0.3em] text-white/30 uppercase mb-3">
        Cifra datos a una wallet destino con ML-KEM-768 + AES-256-GCM
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">
          Clave pública KEM del destinatario (hex · 1184 bytes) — obtén una desde "Wallet"
        </label>
        <input
          type="text"
          value={kemPubKey}
          onChange={e => setKemPubKey(e.target.value)}
          placeholder="Pega aquí el campo encryption.publicKey de la wallet generada..."
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/60 text-[8px] font-mono px-3 py-2 placeholder-white/15 focus:outline-none focus:border-teal-400/40"
        />
      </div>

      <div className="space-y-1">
        <label className="text-[7px] tracking-widest text-white/40 uppercase">Payload (≤ 64 KB)</label>
        <textarea
          value={payload}
          onChange={e => setPayload(e.target.value)}
          rows={4}
          className="w-full bg-black/60 border border-teal-400/20 text-teal-300/80 text-[9px] px-3 py-2 focus:outline-none focus:border-teal-400/40 resize-none"
        />
      </div>

      <button
        onClick={encapsulate}
        disabled={loading || !kemPubKey}
        className="flex items-center gap-2 border border-sky-400/30 text-sky-300 text-[8px] tracking-widest px-5 py-2.5 hover:bg-sky-400/8 transition-all disabled:opacity-40"
      >
        {loading ? <Loader size={12} className="animate-spin" /> : <Lock size={12} />}
        {loading ? "CIFRANDO..." : "CIFRAR PAYLOAD"}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-[8px] text-red-400/80 border border-red-400/20 bg-red-400/5 px-3 py-2">
          <AlertTriangle size={10} /> {error}
        </div>
      )}

      {result?.success && (
        <div className="space-y-3">
          <div className="border border-sky-400/20 bg-sky-400/3 p-3 space-y-1">
            <div className="text-[7px] tracking-widest text-sky-400/60 uppercase">Session ID</div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-sky-300 font-mono">{result.sessionId}</span>
              <CopyButton text={result.sessionId} />
            </div>
            <div className="text-[7px] text-white/30">{result.algorithm} · {result.computeMs} ms</div>
          </div>
          <JsonBlock data={result} />
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "wallet",      label: "Wallet Keygen",  icon: <Wallet size={11} />,        color: "teal" },
  { id: "sign",        label: "Firmar TX",       icon: <FileSignature size={11} />, color: "violet" },
  { id: "verify",      label: "Verificar TX",    icon: <ShieldCheck size={11} />,   color: "emerald" },
  { id: "encapsulate", label: "Cifrar Canal",    icon: <Lock size={11} />,          color: "sky" },
];

const TAB_COLOR: Record<string, string> = {
  teal:    "border-teal-400/50 text-teal-300 bg-teal-400/8",
  violet:  "border-violet-400/50 text-violet-300 bg-violet-400/8",
  emerald: "border-emerald-400/50 text-emerald-300 bg-emerald-400/8",
  sky:     "border-sky-400/50 text-sky-300 bg-sky-400/8",
};

const TAB_INACTIVE = "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50";

export default function BlockchainQaaS() {
  const [, navigate]  = useLocation();
  const [tab, setTab] = useState<Tab>("wallet");

  return (
    <div className="min-h-screen bg-[#050505] text-white font-mono p-6 md:p-10">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[7px] tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          <ArrowLeft size={10} /> INICIO
        </button>

        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-[7px] tracking-[0.4em] text-teal-400/50 uppercase mb-2">
              EPR-1 · QaaS BLOCKCHAIN
            </div>
            <h1 className="text-xl md:text-2xl font-light tracking-tight text-white/90">
              Quantum-as-a-Service
            </h1>
            <p className="text-[10px] text-white/40 mt-1">
              Criptografía post-cuántica como servicio · FIPS 203 / FIPS 204 · NIST Level 3
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[7px] text-emerald-400/70">
              <Activity size={8} className="animate-pulse" /> ONLINE
            </div>
            <div className="text-[7px] text-white/20">ML-KEM-768 · ML-DSA-65</div>
          </div>
        </div>

        {/* Capability pills */}
        <div className="flex flex-wrap gap-2 mt-4 mb-8">
          {[
            "Wallets cuántico-seguras",
            "Firma de transacciones FIPS 204",
            "Canal cifrado ML-KEM-768",
            "Resistente a Shor's Algorithm",
            "CNSA 2.0 compliant",
          ].map(tag => (
            <span key={tag} className="text-[6px] tracking-widest text-teal-400/50 border border-teal-400/15 px-2 py-0.5 uppercase">
              {tag}
            </span>
          ))}
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 border text-[7px] tracking-widest px-3 py-1.5 transition-all ${
                tab === t.id ? TAB_COLOR[t.color] : TAB_INACTIVE
              }`}
            >
              {t.icon}
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="border border-white/8 bg-white/2 p-5 md:p-8">
          {tab === "wallet"      && <WalletTab />}
          {tab === "sign"        && <SignTab />}
          {tab === "verify"      && <VerifyTab />}
          {tab === "encapsulate" && <EncapsulateTab />}
        </div>

        {/* Quick reference */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-white/6 p-4 space-y-2">
            <div className="flex items-center gap-2 text-[7px] tracking-widest text-white/40 uppercase mb-3">
              <Cpu size={9} /> Endpoints disponibles
            </div>
            {[
              ["GET",  "/api/qaas/status",             "Estado del servicio"],
              ["GET",  "/api/qaas/algorithms",          "Referencia de algoritmos"],
              ["GET",  "/api/qaas/metrics",             "Contadores de uso"],
              ["POST", "/api/qaas/wallet/keygen",       "Generar wallet PQC"],
              ["POST", "/api/qaas/tx/sign",             "Firmar transacción"],
              ["POST", "/api/qaas/tx/verify",           "Verificar firma"],
              ["POST", "/api/qaas/channel/encapsulate", "Cifrar payload"],
            ].map(([method, path, desc]) => (
              <div key={path} className="flex items-center gap-2">
                <span className={`text-[6px] tracking-widest min-w-[28px] ${method === "GET" ? "text-emerald-400/60" : "text-amber-400/60"}`}>
                  {method}
                </span>
                <span className="text-[7px] text-white/40 font-mono">{path}</span>
                <ChevronRight size={7} className="text-white/15 ml-auto" />
                <span className="text-[6px] text-white/25">{desc}</span>
              </div>
            ))}
          </div>

          <div className="border border-white/6 p-4 space-y-2">
            <div className="text-[7px] tracking-widest text-white/40 uppercase mb-3">Por qué PQC en blockchain</div>
            {[
              ["ECDSA vulnerable", "secp256k1 es roto por Shor's en O(n³) en un computador cuántico suficientemente grande."],
              ["HNDL Attack", "Adversarios recolectan transacciones hoy para descifrarlas en 5-10 años cuando tengan Q suficiente."],
              ["ML-DSA-65", "Firma de 3293 bytes resistente cuánticamente. Drop-in replacement para ECDSA en protocolos L1/L2."],
              ["ML-KEM-768", "Key Encapsulation para canales wallet-a-wallet. Reemplaza ECDH con seguridad post-cuántica."],
            ].map(([title, desc]) => (
              <div key={title} className="space-y-0.5">
                <div className="text-[7px] text-teal-400/60 tracking-wide">{title}</div>
                <div className="text-[7px] text-white/25 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
