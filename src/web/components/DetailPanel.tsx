/**
 * Panel_Detail — non-modal side panel for viewing and inline-editing a single
 * Campaign without leaving the Papan_Campaign (Requirements 4, 5).
 *
 * Rendering (Req 5.1): when a Kartu_Campaign is selected, the panel shows the
 * Campaign fields — nama, Campaign_Category, tanggal mulai, tanggal selesai,
 * daftar Toko target, dan daftar Opsi_Promo — alongside the board, never
 * hiding it. A close control returns to the full board (Req 5.8).
 *
 * Inline editing (Req 4, 5.2, 5.3): each editable field saves on blur or Enter
 * via `BoardService.editField`. A value that passes validation is persisted and
 * the board is refreshed (Req 4.1, 5.2). A value that violates a field
 * constraint (nama kosong, nama > 100, tanggal selesai mendahului mulai) is
 * rejected, the previous value is restored, and a validation message naming the
 * offending field is shown (Req 4.4, 5.3).
 *
 * Opsi_Promo (Req 5.4-5.6): a discount in 0..100 (integer) is appended up to
 * the 20-option limit via `BoardService.addPromoOption`; an over-limit or
 * out-of-range/non-integer discount is rejected with a message and the existing
 * options are preserved.
 *
 * Save indicators (Req 4.2, 4.3, 4.5, 5.7): the panel surfaces a
 * menyimpan/tersimpan/gagal indicator. A save that does not complete within
 * 10 seconds, or that fails for an already-validated value, is treated as
 * failed; the entered value is kept and a retry control is offered (Req 4.5,
 * 5.7).
 *
 * _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
 */

import { useEffect, useMemo, useState } from "react";
import { theme } from "../theme.js";
import { useApp, NOW } from "../store.js";
import { categoryLabels, text } from "../i18n.js";
import { isPermitted } from "../../domain/accessPolicy.js";
import { SchemePatch, Violation } from "../../domain/validation.js";
import {
  Campaign,
  CampaignCategory,
  CAMPAIGN_CATEGORIES,
  EpochMillis,
} from "../../domain/types.js";

/** Maximum time a single autosave may take before it is treated as failed (Req 4.5). */
const SAVE_TIMEOUT_MS = 10_000;

/** Lifecycle of the most recent autosave, surfaced as a visual indicator. */
type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "failed"; retry: () => void };

interface DetailPanelProps {
  /** Id of the selected Campaign whose detail is shown. */
  campaignId: string;
  /** Closes the panel and returns to the full board (Req 5.8). */
  onClose: () => void;
  /** Notifies the board that the Campaign changed so it can refresh (Req 5.2). */
  onSaved: () => void;
}

/** Converts an epoch-millis timestamp to a `yyyy-mm-dd` value for date inputs. */
function toDateInput(ts: EpochMillis | null): string {
  if (ts == null) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

/** Parses a `yyyy-mm-dd` date input into UTC epoch millis, or null when empty. */
function fromDateInput(value: string): EpochMillis | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

/** Picks the most specific reason for a field from an API failure result. */
function reasonFor(
  field: string,
  violations: Violation[] | undefined,
  fallback: string,
): string {
  const match = violations?.find((v) => v.field === field);
  return match?.reason ?? fallback;
}

/** Runs the synchronous save under a timeout so a stalled save is treated as failed (Req 4.5). */
function withTimeout<T>(run: () => T, ms: number): Promise<T> {
  return Promise.race([
    Promise.resolve().then(run),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

/** Small status pill reflecting the current save lifecycle (Req 4.2, 4.3, 5.7). */
function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "idle") {
    return <span style={{ minHeight: 18, display: "inline-block" }} />;
  }
  if (state.kind === "saving") {
    return (
      <span
        role="status"
        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.sm }}
      >
        {text.saving}
      </span>
    );
  }
  if (state.kind === "saved") {
    return (
      <span
        role="status"
        style={{ color: theme.colors.success, fontSize: theme.font.size.sm, fontWeight: 600 }}
      >
        ✓ {text.saved}
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: theme.spacing(2), alignItems: "center" }}>
      <span
        role="alert"
        style={{ color: theme.colors.danger, fontSize: theme.font.size.sm, fontWeight: 600 }}
      >
        {text.saveFailed}
      </span>
      <button
        type="button"
        onClick={state.retry}
        style={{
          background: theme.colors.dangerSoft,
          color: theme.colors.danger,
          border: `1px solid ${theme.colors.danger}`,
          borderRadius: theme.radius.sm,
          padding: "2px 10px",
          fontSize: theme.font.size.sm,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {text.retry}
      </button>
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: theme.font.size.sm,
  fontWeight: 600,
  color: theme.colors.textMuted,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: theme.colors.surface,
  border: `1px solid ${theme.colors.borderStrong}`,
  borderRadius: theme.radius.md,
  padding: theme.spacing(2),
  fontSize: theme.font.size.md,
  color: theme.colors.text,
};

/**
 * Non-modal detail/edit panel for a single Campaign. Holds a local editable
 * copy of the Campaign's scheme fields, seeded from persistence and re-seeded
 * whenever the selection changes, so a rejected edit can safely revert to the
 * previously persisted value (Req 4.4, 5.3).
 */
export function DetailPanel({ campaignId, onClose, onSaved }: DetailPanelProps) {
  const { services, role } = useApp();
  const canEdit = isPermitted(role, "EditCampaign");

  // Latest persisted Campaign for this selection.
  const [campaign, setCampaign] = useState<Campaign | null>(
    () => services.repos.campaigns.get(campaignId) ?? null,
  );

  // Editable field values (re-seeded when the selection or persisted value changes).
  const [name, setName] = useState("");
  const [startStr, setStartStr] = useState("");
  const [endStr, setEndStr] = useState("");
  const [discountStr, setDiscountStr] = useState("");

  // Per-field validation messages and the shared save indicator.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  // (Re)seed the panel from persistence whenever the selected Campaign changes.
  useEffect(() => {
    const current = services.repos.campaigns.get(campaignId) ?? null;
    setCampaign(current);
    setName(current?.scheme.name ?? "");
    setStartStr(toDateInput(current?.scheme.timelineStart ?? null));
    setEndStr(toDateInput(current?.scheme.timelineEnd ?? null));
    setDiscountStr("");
    setFieldErrors({});
    setSaveState({ kind: "idle" });
  }, [campaignId, services]);

  const stores = useMemo(() => services.repos.stores.all(), [services]);
  const storeName = (id: string) =>
    stores.find((s) => s.id === id)?.name ?? id;

  if (!campaign) {
    return null;
  }
  const scheme = campaign.scheme;

  /**
   * Persists a field patch with the save lifecycle. A validation failure
   * reverts the edited value and shows a field message without offering retry;
   * a thrown error or timeout is treated as a save failure with retry (Req 4.5,
   * 5.7). On success the panel and board reflect the new value (Req 4.2, 5.2).
   */
  const saveField = async (
    field: string,
    patch: SchemePatch,
    revert: () => void,
  ) => {
    setFieldErrors((e) => ({ ...e, [field]: "" }));

    const attempt = async () => {
      setSaveState({ kind: "saving" });
      try {
        const result = await withTimeout(
          () => services.board.editField(role, campaignId, patch, NOW),
          SAVE_TIMEOUT_MS,
        );
        if (!result.ok) {
          // Field constraint violated: keep the previous value (Req 4.4, 5.3).
          revert();
          setFieldErrors((e) => ({
            ...e,
            [field]: reasonFor(field, result.violations, result.reason),
          }));
          setSaveState({ kind: "idle" });
          return;
        }
        // Saved: reflect the persisted value and refresh the board (Req 4.2, 5.2).
        setCampaign(result.value);
        setSaveState({ kind: "saved" });
        onSaved();
      } catch {
        // System failure or timeout: keep the entered value, offer retry (Req 4.5, 5.7).
        setSaveState({ kind: "failed", retry: () => void attempt() });
      }
    };

    await attempt();
  };

  /** Saves the name field, reverting to the persisted name on rejection (Req 5.3). */
  const commitName = () => {
    if (name === scheme.name) return;
    void saveField("name", { name }, () => setName(scheme.name));
  };

  /** Saves the category selection (Req 5.2). */
  const commitCategory = (category: CampaignCategory) => {
    void saveField("category", { category }, () => undefined);
  };

  /** Saves the start date, reverting on rejection. */
  const commitStart = () => {
    const next = fromDateInput(startStr);
    if (next === scheme.timelineStart) return;
    void saveField("timelineStart", { timelineStart: next }, () =>
      setStartStr(toDateInput(scheme.timelineStart)),
    );
  };

  /** Saves the end date; a date before the start is rejected (Req 5.3). */
  const commitEnd = () => {
    const next = fromDateInput(endStr);
    if (next === scheme.timelineEnd) return;
    void saveField("timelineEnd", { timelineEnd: next }, () =>
      setEndStr(toDateInput(scheme.timelineEnd)),
    );
  };

  /** Removes one target Toko from the scheme (Req 5.2). */
  const removeStore = (storeId: string) => {
    const next = scheme.targetStoreIds.filter((id) => id !== storeId);
    void saveField("targetStoreIds", { targetStoreIds: next }, () => undefined);
  };

  /** Adds one target Toko to the scheme (Req 5.2). */
  const addStore = (storeId: string) => {
    if (!storeId || scheme.targetStoreIds.includes(storeId)) return;
    const next = [...scheme.targetStoreIds, storeId];
    void saveField("targetStoreIds", { targetStoreIds: next }, () => undefined);
  };

  /**
   * Adds one Opsi_Promo (Req 5.4-5.6). The discount must be an integer 0..100
   * and the scheme must hold fewer than 20 options; otherwise the addition is
   * rejected with a message and the existing options are preserved.
   */
  const addPromo = async () => {
    const discount = Number(discountStr);
    setFieldErrors((e) => ({ ...e, promo: "" }));
    setSaveState({ kind: "saving" });
    try {
      const result = await withTimeout(
        () => services.board.addPromoOption(role, campaignId, discount, NOW),
        SAVE_TIMEOUT_MS,
      );
      if (!result.ok) {
        setFieldErrors((e) => ({ ...e, promo: result.reason }));
        setSaveState({ kind: "idle" });
        return;
      }
      setCampaign(result.value);
      setDiscountStr("");
      setSaveState({ kind: "saved" });
      onSaved();
    } catch {
      setSaveState({ kind: "failed", retry: () => void addPromo() });
    }
  };

  const fieldError = (field: string) =>
    fieldErrors[field] ? (
      <div
        role="alert"
        style={{ color: theme.colors.danger, fontSize: theme.font.size.sm }}
      >
        {fieldErrors[field]}
      </div>
    ) : null;

  const availableStores = stores.filter(
    (s) => !scheme.targetStoreIds.includes(s.id),
  );

  return (
    <aside
      aria-label={text.detailTitle}
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: 380,
        maxWidth: "92vw",
        background: theme.colors.surface,
        borderLeft: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadow.pop,
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: theme.spacing(4),
          borderBottom: `1px solid ${theme.colors.border}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: theme.font.size.lg, color: theme.colors.text }}>
          {text.detailTitle}
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: theme.spacing(3) }}>
          <SaveIndicator state={saveState} />
          <button
            type="button"
            aria-label={text.close}
            onClick={onClose}
            style={{
              background: theme.colors.surfaceAlt,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.sm,
              padding: "4px 12px",
              fontSize: theme.font.size.sm,
              fontWeight: 600,
              color: theme.colors.textMuted,
              cursor: "pointer",
            }}
          >
            {text.close}
          </button>
        </div>
      </header>

      <div
        style={{
          padding: theme.spacing(4),
          display: "grid",
          gap: theme.spacing(4),
          overflowY: "auto",
        }}
      >
        {/* Nama (Req 5.1, 5.3) */}
        <div style={{ display: "grid", gap: theme.spacing(2) }}>
          <label style={labelStyle} htmlFor="detail-name">
            {text.fieldName}
          </label>
          <input
            id="detail-name"
            type="text"
            value={name}
            disabled={!canEdit}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            style={inputStyle}
          />
          {fieldError("name")}
        </div>

        {/* Kategori (Req 5.1, 5.2) */}
        <div style={{ display: "grid", gap: theme.spacing(2) }}>
          <label style={labelStyle} htmlFor="detail-category">
            {text.fieldCategory}
          </label>
          <select
            id="detail-category"
            value={scheme.category ?? ""}
            disabled={!canEdit}
            onChange={(e) => commitCategory(e.target.value as CampaignCategory)}
            style={inputStyle}
          >
            {CAMPAIGN_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
          {fieldError("category")}
        </div>

        {/* Tanggal mulai & selesai (Req 5.1, 5.3) */}
        <div style={{ display: "flex", gap: theme.spacing(3) }}>
          <div style={{ flex: 1, display: "grid", gap: theme.spacing(2) }}>
            <label style={labelStyle} htmlFor="detail-start">
              {text.fieldStart}
            </label>
            <input
              id="detail-start"
              type="date"
              value={startStr}
              disabled={!canEdit}
              onChange={(e) => setStartStr(e.target.value)}
              onBlur={commitStart}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, display: "grid", gap: theme.spacing(2) }}>
            <label style={labelStyle} htmlFor="detail-end">
              {text.fieldEnd}
            </label>
            <input
              id="detail-end"
              type="date"
              value={endStr}
              disabled={!canEdit}
              onChange={(e) => setEndStr(e.target.value)}
              onBlur={commitEnd}
              style={inputStyle}
            />
          </div>
        </div>
        {fieldError("timelineStart")}
        {fieldError("timelineEnd")}

        {/* Toko target (Req 5.1, 5.2) */}
        <div style={{ display: "grid", gap: theme.spacing(2) }}>
          <span style={labelStyle}>{text.fieldStores}</span>
          {scheme.targetStoreIds.length === 0 ? (
            <div style={{ color: theme.colors.textSoft, fontSize: theme.font.size.sm }}>
              {text.noStores}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: theme.spacing(2) }}>
              {scheme.targetStoreIds.map((id) => (
                <li
                  key={id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.sm,
                    padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
                    fontSize: theme.font.size.sm,
                    color: theme.colors.text,
                  }}
                >
                  <span>{storeName(id)}</span>
                  {canEdit && (
                    <button
                      type="button"
                      aria-label={`${text.remove} ${storeName(id)}`}
                      onClick={() => removeStore(id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: theme.colors.danger,
                        fontSize: theme.font.size.sm,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {text.remove}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canEdit && availableStores.length > 0 && (
            <select
              aria-label={text.addStorePlaceholder}
              value=""
              onChange={(e) => addStore(e.target.value)}
              style={inputStyle}
            >
              <option value="" disabled>
                {text.addStorePlaceholder}
              </option>
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Opsi_Promo (Req 5.1, 5.4, 5.5, 5.6) */}
        <div style={{ display: "grid", gap: theme.spacing(2) }}>
          <span style={labelStyle}>
            {text.fieldPromos} ({scheme.promoOptions.length})
          </span>
          {scheme.promoOptions.length === 0 ? (
            <div style={{ color: theme.colors.textSoft, fontSize: theme.font.size.sm }}>
              {text.noPromos}
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: theme.spacing(2) }}>
              {scheme.promoOptions.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.sm,
                    padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
                    fontSize: theme.font.size.sm,
                    color: theme.colors.text,
                  }}
                >
                  <span>{p.label}</span>
                  <span style={{ fontWeight: 700 }}>{p.discountPct}%</span>
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <div style={{ display: "flex", gap: theme.spacing(2) }}>
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountStr}
                aria-label={text.promoDiscountPlaceholder}
                placeholder={text.promoDiscountPlaceholder}
                onChange={(e) => setDiscountStr(e.target.value)}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => void addPromo()}
                disabled={discountStr.trim() === ""}
                style={{
                  background: theme.colors.primary,
                  color: theme.colors.surface,
                  border: "none",
                  borderRadius: theme.radius.md,
                  padding: `0 ${theme.spacing(3)}`,
                  fontSize: theme.font.size.sm,
                  fontWeight: 600,
                  cursor: discountStr.trim() === "" ? "default" : "pointer",
                  opacity: discountStr.trim() === "" ? 0.6 : 1,
                }}
              >
                {text.addPromo}
              </button>
            </div>
          )}
          {fieldError("promo")}
        </div>
      </div>
    </aside>
  );
}
