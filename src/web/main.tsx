import React from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./store.js";
import { AppShell } from "./shell/AppShell.js";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <React.StrictMode>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </React.StrictMode>,
  );
}
