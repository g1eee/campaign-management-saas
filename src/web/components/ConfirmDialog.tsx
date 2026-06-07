/**
 * ConfirmDialog — dialog konfirmasi modal sederhana.
 *
 * Dipakai oleh alur penghapusan massal (Requirement 10.4–10.6): meminta
 * konfirmasi sebelum penghapusan dijalankan tanpa mengubah data apa pun, dan
 * dapat dibatalkan. Penghapusan hanya dilanjutkan ketika pengguna menekan
 * tombol konfirmasi (`onConfirm`); menekan Batal, latar belakang, atau Esc akan
 * memanggil `onCancel` sehingga tidak ada perubahan yang terjadi.
 *
 * _Requirements: 10.4, 10.6_
 */

import { useEffect, useRef } from "react";
import { theme } from "../theme.js";
import { text } from "../i18n.js";

interface ConfirmDialogProps {
  /** Dialog heading. */
  title: string;
  /** Explanatory body text. */
  body: string;
  /** Label of the confirming (destructive) button. */
  confirmLabel: string;
  /** Proceeds with the action (e.g. bulk delete) (Req 10.5). */
  onConfirm: () => void;
  /** Dismisses without acting, leaving data unchanged (Req 10.6). */
  onCancel: () => void;
}

/** Renders a centered modal confirmation dialog. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus the confirm button on open and wire Esc to cancel (Req 10.6).
  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        // Clicking the backdrop cancels without acting (Req 10.6).
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(35, 38, 58, 0.28)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: 420,
          maxWidth: "92vw",
          background: theme.colors.surface,
          borderRadius: theme.radius.lg,
          boxShadow: theme.shadow.pop,
          border: `1px solid ${theme.colors.border}`,
          padding: theme.spacing(5),
          display: "grid",
          gap: theme.spacing(4),
        }}
      >
        <h2 style={{ margin: 0, fontSize: theme.font.size.lg, color: theme.colors.text }}>
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: theme.font.size.base, color: theme.colors.textMuted }}>
          {body}
        </p>
        <div style={{ display: "flex", gap: theme.spacing(3), justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              background: theme.colors.surface,
              color: theme.colors.textMuted,
              padding: `${theme.spacing(2)} ${theme.spacing(4)}`,
              fontSize: theme.font.size.sm,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {text.cancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            style={{
              border: "none",
              borderRadius: theme.radius.md,
              background: theme.colors.danger,
              color: theme.colors.surface,
              padding: `${theme.spacing(2)} ${theme.spacing(4)}`,
              fontSize: theme.font.size.sm,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
