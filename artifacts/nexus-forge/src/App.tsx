// SPDX-License-Identifier: MIT
/**
 * Nexus-Forge QaaS — App Router
 * © Manuel Alexander Roca González · EPR-1 Protocol
 * Prohibida su reproducción sin NDA firmado.
 */
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing       from "@/pages/Landing";
import Dashboard     from "@/pages/Dashboard";
import Nft           from "@/pages/Nft";
import AuditAccess   from "@/pages/AuditAccess";
import SecuritySpecs   from "@/pages/SecuritySpecs";
import PQCLab          from "@/pages/PQCLab";
import PQCMessenger    from "@/pages/PQCMessenger";
import SystemHealth    from "@/pages/SystemHealth";
import ThreatSimulator from "@/pages/ThreatSimulator";
import Legal           from "@/pages/Legal";
import BlockchainQaaS  from "@/pages/BlockchainQaaS";
import NotFound        from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});


interface EBState { hasError: boolean; message: string }

class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false, message: "" };

  static getDerivedStateFromError(err: unknown): EBState {
    const msg = err instanceof Error ? err.message : String(err);
    // Stale-chunk error: the deployed chunk no longer exists — reload to get fresh HTML
    const isChunkError =
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Importing a module script failed") ||
      msg.includes("error loading dynamically imported module");
    if (isChunkError) {
      window.location.reload();
      return { hasError: true, message: "ACTUALIZANDO — recargando la aplicación…" };
    }
    return { hasError: true, message: msg };
  }

  componentDidCatch(err: unknown, info: ErrorInfo) {
    console.error("[ErrorBoundary] Render crash:", err, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      const isReloading = this.state.message.startsWith("ACTUALIZANDO");
      return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono p-8">
          <div className="max-w-lg w-full border border-red-500/20 bg-red-500/5 p-6 space-y-4">
            <div className="text-[7px] tracking-[0.35em] text-red-400/60 uppercase">
              {isReloading ? "ACTUALIZANDO APLICACIÓN" : "ERROR DE RENDERIZADO"}
            </div>
            <div className="text-[9px] text-white/60 leading-relaxed break-all">
              {this.state.message || "Error inesperado en la interfaz."}
            </div>
            {!isReloading && (
              <button
                onClick={this.handleRetry}
                className="border border-teal-400/30 text-teal-300/70 text-[7px] tracking-widest px-4 py-2 hover:bg-teal-400/8 transition-all"
              >
                REINTENTAR
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/nft" component={Nft} />
      <Route path="/audit-access" component={AuditAccess} />
      <Route path="/security" component={SecuritySpecs} />
      <Route path="/pqc"       component={PQCLab} />
      <Route path="/messenger" component={PQCMessenger} />
      <Route path="/health"    component={SystemHealth} />
      <Route path="/threats"   component={ThreatSimulator} />
      <Route path="/legal"       component={Legal} />
      <Route path="/blockchain"  component={BlockchainQaaS} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
