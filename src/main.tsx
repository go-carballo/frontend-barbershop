import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "@/app/app";
import { ErrorBoundary } from "@/app/error-boundary";
import { AppProviders } from "@/app/providers";
import { initMonitoring } from "@/lib/monitoring";
import "@/styles.css";

void initMonitoring();

const enableMocking = async () => {
  // The mock layer stays on even with a real backend configured: only the routes
  // listed in REAL_API_ROUTES are sent to the backend, the rest is served locally
  // by MSW. Set VITE_ENABLE_MOCK_API=false to go fully real.
  if (import.meta.env.VITE_ENABLE_MOCK_API === "false") return;
  const { worker } = await import("@/mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
  });
};

void enableMocking().then(() => {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element #root was not found in the document.");
  }
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppProviders>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppProviders>
    </React.StrictMode>,
  );
});
