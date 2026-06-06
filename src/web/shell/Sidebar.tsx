/**
 * Sidebar navigation: fixed-left, role-filtered, single active highlight.
 * Consumes the pure navigationState + permittedModules derivations.
 *
 * _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.6_
 */

import { theme } from "../theme.js";
import { moduleLabels, text } from "../i18n.js";
import { ModuleId } from "../../domain/types.js";
import { permittedModules } from "../../domain/accessPolicy.js";
import { navigationState } from "../../domain/workflowView.js";
import { useApp } from "../store.js";

export function Sidebar({
  active,
  onNavigate,
}: {
  active: ModuleId;
  onNavigate: (m: ModuleId) => void;
}) {
  const { role } = useApp();
  const permitted = permittedModules(role);
  const nav = navigationState(permitted, active);

  return (
    <nav
      aria-label="Navigasi utama"
      style={{
        width: 232,
        minWidth: 232,
        background: theme.colors.surface,
        borderRight: `1px solid ${theme.colors.border}`,
        height: "100vh",
        position: "sticky",
        top: 0,
        padding: theme.spacing(4),
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(1),
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: theme.spacing(5) }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: theme.radius.md,
            background: theme.colors.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 800,
          }}
        >
          C
        </div>
        <div>
          <div style={{ fontWeight: 800, color: theme.colors.text }}>{text.appName}</div>
          <div style={{ fontSize: 11, color: theme.colors.textMuted }}>{text.appTagline}</div>
        </div>
      </div>

      {nav?.entries.map((entry) => (
        <button
          key={entry.module}
          onClick={() => onNavigate(entry.module)}
          aria-current={entry.active ? "page" : undefined}
          style={{
            textAlign: "left",
            border: "none",
            cursor: "pointer",
            borderRadius: theme.radius.sm,
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: entry.active ? 700 : 500,
            background: entry.active ? theme.colors.primarySoft : "transparent",
            color: entry.active ? theme.colors.primary : theme.colors.text,
          }}
        >
          {moduleLabels[entry.module]}
        </button>
      ))}
    </nav>
  );
}
