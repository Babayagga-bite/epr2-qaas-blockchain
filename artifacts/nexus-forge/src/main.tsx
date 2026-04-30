// SPDX-License-Identifier: MIT
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ── Stale-chunk recovery ──────────────────────────────────────────────────────
// After a new deployment, Vite generates new asset hashes. If the user still
// has the old HTML cached their browser will try to load chunk URLs that no
// longer exist on the CDN. The `vite:preloadError` event fires before React
// sees the error — we intercept it, reload once, and the fresh HTML brings
// the correct chunk URLs.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();   // suppress Vite's default unhandled-rejection
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
