/**
 * App shell: sidebar + topbar + main content area. Renders exactly one module
 * at a time and handles module-load errors.
 *
 * _Requirements: 3.3, 3.5, 23.1, 23.2_
 */

import React, { useState } from "react";
import { theme } from "../theme.js";
import { text } from "../i18n.js";
import { ModuleId, MODULE_ORDER, Role } from "../../domain/types.js";
import { permittedModules } from "../../domain/accessPolicy.js";
import { NAV_MODULES } from "../navConfig.js";
import { useApp } from "../store.js";
import { Sidebar } from "./Sidebar.js";
import { NotificationBell } from "./NotificationBell.js";
import { ModuleRouter } from "./ModuleRouter.js";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, color: theme.colors.danger }}>
          Modul tidak dapat dimuat.
        </div>
      );
    }
    return this.props.children;
  }
}

export function AppShell() {
  const { role, setRole, version } = useApp();
  // Papan_Campaign is the default landing view after authentication (Req 13.4).
  // The active module is held in state so it persists across navigation within
  // the session (Req 13.5); navigating elsewhere and back is non-destructive.
  const [active, setActive] = useState<ModuleId>("Campaign");

  // Visible nav = primary modules that are also permitted for the role.
  const permitted = permittedModules(role);
  const visible = MODULE_ORDER.filter(
    (m) => NAV_MODULES.includes(m) && permitted.includes(m),
  );
  const current = visible.includes(active) ? active : visible[0];

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: theme.colors.bg,
        fontFamily: theme.font.family,
        color: theme.colors.text,
      }}
    >
      <Sidebar active={current} onNavigate={setActive} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: `${theme.spacing(4)} ${theme.spacing(6)}`,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(8px)",
            borderBottom: `1px solid ${theme.colors.border}`,
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {text.greeting}, {role === "SPV" ? "Supervisor" : "Admin"}!
            </div>
            <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
              Berikut ringkasan aktivitas hari ini.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <NotificationBell />
            <label style={{ fontSize: 13, color: theme.colors.textMuted }}>Peran:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              style={{
                padding: "8px 10px",
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.border}`,
                fontSize: 13,
              }}
            >
              <option value="SPV">Supervisor (SPV)</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </header>
        <main style={{ padding: theme.spacing(6), flex: 1 }}>
          <ErrorBoundary key={`${current}-${role}-${version}`}>
            <ModuleRouter module={current} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
