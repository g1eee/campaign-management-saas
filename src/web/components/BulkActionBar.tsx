/**
 * BulkActionBar — toolbar Layanan_Aksi_Massal (Requirement 10).
 *
 * Muncul ketika satu atau lebih Kartu_Campaign terpilih. Menyediakan tiga aksi
 * massal atas seleksi saat ini:
 * - Ubah Campaign_Category serempak (Req 10.1) lewat `onSetCategory`.
 * - Pindahkan Campaign_Status (Req 10.2, 10.3) lewat `onMove`; hanya transisi
 *   yang valid yang akan diterapkan, sisanya dilaporkan sebagai keberhasilan
 *   parsial oleh induk.
 * - Hapus terpilih (Req 10.4) lewat `onRequestDelete`, yang membuka alur
 *   konfirmasi pada induk—toolbar sendiri tidak mengubah data apa pun di sini.
 *
 * Komponen ini presentasional: seluruh efek (panggilan `BoardService`,
 * rebuild, pelaporan hasil) dikelola oleh induk (`Board`).
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.4_
 */

import { useState } from "react";
import { theme } from "../theme.js";
import { categoryLabels, statusLabels, text } from "../i18n.js";
import {
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  CampaignCategory,
  CampaignStatus,
} from "../../domain/types.js";

interface BulkActionBarProps {
  /** Number of currently selected Kartu_Campaign. */
  count: number;
  /** Applies one Campaign_Category to every selected Campaign (Req 10.1). */
  onSetCategory: (category: CampaignCategory) => void;
  /** Applies a status move to every valid selected Campaign (Req 10.2, 10.3). */
  onMove: (toStatus: CampaignStatus) => void;
  /** Opens the delete confirmation flow on the parent (Req 10.4). */
  onRequestDelete: () => void;
  /** Clears the current selection without changing any Campaign. */
  onClear: () => void;
}

/** Sentinel select value representing "no choice yet". */
const NONE = "__none__";

const controlStyle = {
  background: theme.colors.surface,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.md,
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  fontSize: theme.font.size.sm,
  color: theme.colors.text,
} as const;

const buttonStyle = {
  border: "none",
  borderRadius: theme.radius.md,
  padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
  fontSize: theme.font.size.sm,
  fontWeight: 600,
  cursor: "pointer",
} as const;

/**
 * Renders the bulk-action toolbar. Each category/status applies immediately on
 * selection (then resets the picker) so a single choice triggers exactly one
 * bulk action.
 */
export function BulkActionBar({
  count,
  onSetCategory,
  onMove,
  onRequestDelete,
  onClear,
}: BulkActionBarProps) {
  const [categoryChoice, setCategoryChoice] = useState<string>(NONE);
  const [statusChoice, setStatusChoice] = useState<string>(NONE);

  return (
    <div
      role="toolbar"
      aria-label={text.bulkSelectedCount(count)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: theme.spacing(3),
        flexWrap: "wrap",
        background: theme.colors.primarySoft,
        border: `1px solid ${theme.colors.borderStrong}`,
        borderRadius: theme.radius.lg,
        padding: theme.spacing(3),
      }}
    >
      <span style={{ fontWeight: 700, color: theme.colors.text, fontSize: theme.font.size.md }}>
        {text.bulkSelectedCount(count)}
      </span>

      <label style={{ display: "flex", alignItems: "center", gap: theme.spacing(1) }}>
        <span style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>
          {text.bulkSetCategory}
        </span>
        <select
          aria-label={text.bulkSetCategory}
          value={categoryChoice}
          onChange={(e) => {
            const value = e.target.value;
            setCategoryChoice(NONE);
            if (value !== NONE) {
              onSetCategory(value as CampaignCategory);
            }
          }}
          style={controlStyle}
        >
          <option value={NONE}>{text.bulkChoosePlaceholder}</option>
          {CAMPAIGN_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat] ?? cat}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: theme.spacing(1) }}>
        <span style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>
          {text.bulkMove}
        </span>
        <select
          aria-label={text.bulkMove}
          value={statusChoice}
          onChange={(e) => {
            const value = e.target.value;
            setStatusChoice(NONE);
            if (value !== NONE) {
              onMove(value as CampaignStatus);
            }
          }}
          style={controlStyle}
        >
          <option value={NONE}>{text.bulkChoosePlaceholder}</option>
          {CAMPAIGN_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={onRequestDelete}
        style={{
          ...buttonStyle,
          background: theme.colors.danger,
          color: theme.colors.surface,
        }}
      >
        {text.bulkDelete}
      </button>

      <button
        type="button"
        onClick={onClear}
        style={{
          ...buttonStyle,
          background: theme.colors.surface,
          color: theme.colors.textMuted,
          border: `1px solid ${theme.colors.border}`,
          marginLeft: "auto",
        }}
      >
        {text.bulkClear}
      </button>
    </div>
  );
}
