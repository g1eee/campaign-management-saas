/**
 * Sidebar navigation: fixed-left, role-filtered, single active highlight.
 * Shows only the primary modules from NAV_MODULES (the domain access policy
 * still governs permissions). Tugas Saya carries a pending-count badge.
 *
 * _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.6_
 */

import { theme } from "../theme.js";
import { moduleLabels, text } from "../i18n.js";
import { ModuleId, MODULE_ORDER } from "../../domain/types.js";
import { permittedModules } from "../../domain/accessPolicy.js";
import { navigationState } from "../../domain/workflowView.js";
import { NAV_MODULES } from "../navConfig.js";
import { useApp } from "../store.js";

export function Sidebar({
  active,
  onNavigate,
}: {
  active: ModuleId;
  onNavigate: (m: ModuleId) => void;
}) {
  const { role, services, userId } = useApp();
  const permitted = permittedModules(role);

  // Only show the primary modules that are also permitted, preserving order.
  const visible = MODULE_ORDER.filter(
    (m) => NAV_MODULES.includes(m) && permitted.includes(m),
  );
  const nav = navigationState(visible, active);

  // Pending-task badge for Tugas Saya.
  const pendingTasks = services.repos.tasks
    .forUser(userId)
    .filter((t) => t.status !== "Done").length;

  const badgeFor = (module: ModuleId): number | undefined =>
    module === "TugasSaya" && pendingTasks > 0 ? pendingTasks : undefined;

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

      {nav?.entries.map((entry) => {
        const badge = badgeFor(entry.module);
        return (
          <button
            key={entry.module}
            onClick={() => onNavigate(entry.module)}
            aria-current={entry.active ? "page" : undefined}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
            <span>{moduleLabels[entry.module]}</span>
            {badge !== undefined && (
              <span
                style={{
                  background: theme.colors.danger,
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  minWidth: 18,
                  height: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 5px",
                }}
              >
                {badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
