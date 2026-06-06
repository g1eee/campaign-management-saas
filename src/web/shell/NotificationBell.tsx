/**
 * Notification bell (top-right header).
 *
 * Shows the unread count and a dropdown panel with the user's notifications,
 * most-recent-first, with mark-as-read. Replaces Notifikasi as a sidebar item.
 *
 * _Requirements: 17.5, 17.6, 17.7_
 */

import { useState } from "react";
import { theme } from "../theme.js";
import { useApp } from "../store.js";

export function NotificationBell() {
  const { services, userId, refresh } = useApp();
  const [open, setOpen] = useState(false);

  const notifs = services.notifications.list(userId);
  const unread = services.notifications.unreadCount(userId);

  return (
    <div style={{ position: "relative" }}>
      <button
        aria-label="Notifikasi"
        onClick={() => setOpen((o) => !o)}
        style={{
          position: "relative",
          width: 40,
          height: 40,
          borderRadius: theme.radius.md,
          border: `1px solid ${theme.colors.border}`,
          background: theme.colors.surface,
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -6,
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
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 48,
            width: 320,
            maxHeight: 420,
            overflowY: "auto",
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.card,
            zIndex: 20,
            padding: theme.spacing(3),
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: theme.spacing(2),
            }}
          >
            <strong style={{ fontSize: 14 }}>Notifikasi</strong>
            <span style={{ fontSize: 12, color: theme.colors.textMuted }}>
              {unread} belum dibaca
            </span>
          </div>

          {notifs.length === 0 ? (
            <div style={{ padding: theme.spacing(4), textAlign: "center", color: theme.colors.textMuted, fontSize: 13 }}>
              Belum ada notifikasi.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {notifs.map((n) => (
                <li
                  key={n.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 0",
                    borderBottom: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: n.state === "unread" ? 700 : 400 }}>
                    {n.message}
                  </span>
                  {n.state === "unread" && (
                    <button
                      onClick={() => {
                        services.notifications.markRead(userId, n.id);
                        refresh();
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: theme.colors.primary,
                        cursor: "pointer",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Tandai
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
