/**
 * Papan Campaign bergaya Kanban (frontend inti) dengan Tambah_Cepat dan
 * pemindahan seret-dan-lepas.
 *
 * Merender tepat lima Kolom_Status dalam urutan tetap dari `buildBoard`,
 * menampilkan hitungan kartu pada judul kolom, pesan keadaan-kosong per kolom,
 * dan—bila pemuatan data gagal—pesan kesalahan sambil mempertahankan susunan
 * Kartu_Campaign terakhir yang berhasil ditampilkan (tanpa kolom kosong palsu).
 *
 * Tambah_Cepat (Requirement 3) tersambung ke `BoardService.quickAdd`: setiap
 * submit yang berhasil mengosongkan input dan membiarkan kontrol tetap aktif;
 * submit yang gagal (nama kosong, > 100 karakter, atau galat sistem)
 * mempertahankan input yang dikirim dan menampilkan pesan, tanpa menambahkan
 * Kartu_Campaign (rollback optimistic).
 *
 * Seret-dan-lepas (Requirement 6) tersambung ke `BoardService.moveCampaign`
 * dengan optimistic UI: kartu dipindahkan secara lokal lebih dulu, lalu
 * dikembalikan ke Kolom_Status asal bila transisi tidak valid, dilepas di luar
 * kolom, atau penyimpanan gagal.
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.10, 3.1, 3.2, 3.3, 3.4, 3.5,
 * 3.6, 6.1, 6.3, 6.4, 6.5, 6.6_
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { theme } from "../theme.js";
import { useApp, NOW } from "../store.js";
import { categoryLabels, statusLabels, text } from "../i18n.js";
import { buildBoard, CardView, ColumnView } from "../../domain/boardView.js";
import { categoryColorOrDefault } from "../../domain/colorRegistry.js";
import { DetailPanel } from "../components/DetailPanel.js";
import { SearchFilterBar } from "../components/SearchFilterBar.js";
import { CommandPalette } from "../components/CommandPalette.js";
import { BulkActionBar } from "../components/BulkActionBar.js";
import { ConfirmDialog } from "../components/ConfirmDialog.js";
import { BulkFailure } from "../../domain/bulkActions.js";
import { Command } from "../../domain/commandPalette.js";
import { isPermitted } from "../../domain/accessPolicy.js";
import {
  QUICK_ADD_NAME_MAX,
  QUICK_ADD_NAME_MIN,
} from "../../domain/quickAdd.js";
import { searchCampaigns } from "../../domain/search.js";
import {
  Campaign,
  CampaignCategory,
  CampaignStatus,
  DEFAULT_DRAFT_CATEGORY,
} from "../../domain/types.js";

/** Outcome of a quick-add submit, surfaced to the column control. */
interface QuickAddOutcome {
  ok: boolean;
  reason?: string;
}

/** Formats a campaign timeline range as a compact Indonesian date span. */
function formatRange(start: number, end: number): string {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

/**
 * Removes a card from whichever column holds it and appends it to `toStatus`,
 * recomputing counts and empty flags. Returns the columns unchanged when the
 * card is not found. Used for the optimistic seret-dan-lepas update.
 */
function moveCardLocally(
  columns: ColumnView[],
  cardId: string,
  toStatus: CampaignStatus,
): ColumnView[] {
  let moved: CardView | undefined;
  const stripped = columns.map((col) => {
    if (!col.cards.some((c) => c.id === cardId)) {
      return col;
    }
    moved = col.cards.find((c) => c.id === cardId);
    const cards = col.cards.filter((c) => c.id !== cardId);
    return { ...col, cards, count: cards.length, empty: cards.length === 0 };
  });
  if (!moved) {
    return columns;
  }
  return stripped.map((col) => {
    if (col.status !== toStatus) {
      return col;
    }
    const cards = [...col.cards, moved!];
    return { ...col, cards, count: cards.length, empty: false };
  });
}

/** Appends an optimistic card to a target column, recomputing count/empty. */
function addCardLocally(
  columns: ColumnView[],
  toStatus: CampaignStatus,
  card: CardView,
): ColumnView[] {
  return columns.map((col) => {
    if (col.status !== toStatus) {
      return col;
    }
    const cards = [...col.cards, card];
    return { ...col, cards, count: cards.length, empty: false };
  });
}

interface CampaignCardProps {
  card: CardView;
  draggable: boolean;
  onDragStart?: (cardId: string) => void;
  onDragEnd?: () => void;
  onSelect?: (cardId: string) => void;
  /** When true, renders a selection checkbox for Aksi_Massal (Requirement 10). */
  selectable?: boolean;
  /** Whether this card is currently part of the bulk selection. */
  selected?: boolean;
  /** Toggles this card's membership in the bulk selection. */
  onToggleSelect?: (cardId: string) => void;
}

/** A single Kartu_Campaign: color-coded by category, optionally draggable. */
function CampaignCard({
  card,
  draggable,
  onDragStart,
  onDragEnd,
  onSelect,
  selectable,
  selected,
  onToggleSelect,
}: CampaignCardProps) {
  return (
    <article
      className="ch-clickable"
      draggable={draggable}
      role="button"
      tabIndex={0}
      aria-label={card.name}
      onClick={() => onSelect?.(card.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(card.id);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", card.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(card.id);
      }}
      onDragEnd={() => onDragEnd?.()}
      style={{
        background: theme.colors.surface,
        border: `1px solid ${selected ? theme.colors.primary : theme.colors.border}`,
        borderLeft: `4px solid ${card.color}`,
        borderRadius: theme.radius.md,
        boxShadow: theme.shadow.card,
        padding: theme.spacing(3),
        display: "grid",
        gap: theme.spacing(2),
        cursor: draggable ? "grab" : "default",
        outline: selected ? `2px solid ${theme.colors.primary}` : "none",
        outlineOffset: -2,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: theme.spacing(2) }}>
        {selectable && (
          <input
            type="checkbox"
            checked={selected ?? false}
            aria-label={`${text.selectCard}: ${card.name}`}
            // Prevent the click/drag from bubbling to the card (which would open
            // the Panel_Detail) so the checkbox only toggles selection.
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(card.id);
            }}
            style={{ marginTop: 2, cursor: "pointer" }}
          />
        )}
        <div style={{ fontWeight: 700, fontSize: theme.font.size.md, color: theme.colors.text }}>
          {card.name}
        </div>
      </div>
      <div>
        <span
          style={{
            background: card.color,
            color: theme.colors.text,
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: theme.font.size.sm,
            fontWeight: 600,
          }}
        >
          {categoryLabels[card.category] ?? card.category}
        </span>
      </div>
      <div style={{ display: "flex", gap: theme.spacing(3), fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>
        <span>{card.promoCount} promo</span>
        <span>{card.storeCount} toko</span>
      </div>
      <div style={{ fontSize: theme.font.size.sm, color: theme.colors.textSoft }}>
        {formatRange(card.timelineStart, card.timelineEnd)}
      </div>
    </article>
  );
}

/** Tambah_Cepat control rendered at the foot of a column (Requirement 3). */
function QuickAddControl({
  onSubmit,
  inputRef,
}: {
  onSubmit: (name: string) => Promise<QuickAddOutcome>;
  /** Optional ref so a keyboard shortcut can focus this input (Req 12.8). */
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const outcome = await onSubmit(name);
    if (outcome.ok) {
      // Success: clear the input and keep the control active (Req 3.2, 3.3).
      setName("");
      setError(null);
    } else {
      // Failure: keep the submitted input shown and surface the reason
      // (Req 3.4, 3.5, 3.6).
      setError(outcome.reason ?? text.createError);
    }
    setBusy(false);
  };

  return (
    <div style={{ display: "grid", gap: theme.spacing(2) }}>
      <input
        ref={inputRef}
        type="text"
        value={name}
        disabled={busy}
        aria-label={text.quickAddPlaceholder}
        placeholder={text.quickAddPlaceholder}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void submit();
          }
        }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: theme.colors.surface,
          border: `1px dashed ${theme.colors.borderStrong}`,
          borderRadius: theme.radius.md,
          padding: theme.spacing(2),
          fontSize: theme.font.size.sm,
          color: theme.colors.text,
        }}
      />
      {error && (
        <div
          role="alert"
          style={{ color: theme.colors.danger, fontSize: theme.font.size.sm }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

interface ColumnProps {
  column: ColumnView;
  canQuickAdd: boolean;
  canMove: boolean;
  /** True when a search/filter is active; suppresses the false-empty message (Req 2.8). */
  filtering: boolean;
  onQuickAdd: (name: string) => Promise<QuickAddOutcome>;
  onCardDragStart: (cardId: string) => void;
  onCardDragEnd: () => void;
  onDropCard: (toStatus: CampaignStatus) => void;
  onSelectCard: (cardId: string) => void;
  /** Whether cards expose a selection checkbox for Aksi_Massal (Requirement 10). */
  selectable: boolean;
  /** The set of currently selected card ids. */
  selectedIds: Set<string>;
  /** Toggles a card's membership in the bulk selection. */
  onToggleSelect: (cardId: string) => void;
  /** Ref forwarded to this column's Tambah_Cepat input (only the first column). */
  quickAddInputRef?: React.Ref<HTMLInputElement>;
}

/** A single Kolom_Status: header with count, cards, empty-state, drop target. */
function Column({
  column,
  canQuickAdd,
  canMove,
  filtering,
  onQuickAdd,
  onCardDragStart,
  onCardDragEnd,
  onDropCard,
  onSelectCard,
  selectable,
  selectedIds,
  onToggleSelect,
  quickAddInputRef,
}: ColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <section
      onDragOver={(e) => {
        if (!canMove) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!dragOver) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!canMove) return;
        e.preventDefault();
        setDragOver(false);
        onDropCard(column.status);
      }}
      style={{
        background: theme.colors.surfaceAlt,
        borderRadius: theme.radius.lg,
        padding: theme.spacing(3),
        minWidth: 240,
        flex: "1 1 0",
        display: "flex",
        flexDirection: "column",
        gap: theme.spacing(3),
        outline: dragOver ? `2px dashed ${theme.colors.borderStrong}` : "none",
        outlineOffset: -2,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: `0 ${theme.spacing(1)}`,
        }}
      >
        <h2 style={{ margin: 0, fontSize: theme.font.size.md, color: theme.colors.text }}>
          {statusLabels[column.status]}
        </h2>
        <span
          style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 999,
            padding: "1px 9px",
            fontSize: theme.font.size.sm,
            fontWeight: 700,
            color: theme.colors.textMuted,
          }}
          aria-label={`${column.count} campaign`}
        >
          {column.count}
        </span>
      </header>

      <div style={{ display: "grid", gap: theme.spacing(3) }}>
        {column.empty ? (
          filtering ? null : (
            <div
              style={{
                padding: theme.spacing(4),
                textAlign: "center",
                color: theme.colors.textSoft,
                fontSize: theme.font.size.sm,
                border: `1px dashed ${theme.colors.borderStrong}`,
                borderRadius: theme.radius.md,
              }}
            >
              Tidak ada campaign pada status ini.
            </div>
          )
        ) : (
          column.cards.map((card) => (
            <CampaignCard
              key={card.id}
              card={card}
              draggable={canMove}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              onSelect={onSelectCard}
              selectable={selectable}
              selected={selectedIds.has(card.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>

      {canQuickAdd && <QuickAddControl onSubmit={onQuickAdd} inputRef={quickAddInputRef} />}
    </section>
  );
}

/**
 * Orchestrates the board: loads campaigns, derives columns via `buildBoard`,
 * keeps the last successful arrangement when a reload fails (Req 2.10), and
 * wires Tambah_Cepat and seret-dan-lepas to `BoardService` with optimistic UI
 * and rollback.
 */
export function Board() {
  const { services, role, userId, version } = useApp();
  const [columns, setColumns] = useState<ColumnView[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Layanan_Pencarian state (Requirement 11): search text, optional category
  // filter, an error indication for over-limit text, and a no-match flag.
  const [searchText, setSearchText] = useState("");
  const [category, setCategory] = useState<CampaignCategory | undefined>(undefined);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [noMatch, setNoMatch] = useState(false);
  // Id of the Campaign whose Panel_Detail is open, or null when closed (Req 5.1, 5.8).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Palet_Perintah open flag (Requirement 12).
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Layanan_Aksi_Massal state (Requirement 10): selected card ids, the delete
  // confirmation flag, and the most recent bulk outcome (partial-success).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    updated?: number;
    deleted?: number;
    failures: BulkFailure[];
  } | null>(null);
  // Track whether any arrangement has ever been shown, so a first-load failure
  // does not render five false-empty columns (Req 2.10).
  const hasArrangement = useRef(false);
  // Id of the card currently being dragged, used to resolve HTML5 drops.
  const draggingId = useRef<string | null>(null);
  // Tambah_Cepat input of the first column, focused by its shortcut (Req 12.8).
  const quickAddRef = useRef<HTMLInputElement>(null);

  const canQuickAdd = isPermitted(role, "CreateCampaign");
  const canMove = isPermitted(role, "MoveCampaign");
  const canBulk = isPermitted(role, "BulkAction");

  // A filter is active when there is non-whitespace search text or a chosen
  // category; used to gate empty-state handling (Req 2.8, 11.7).
  const filtering = searchText.trim().length > 0 || category !== undefined;

  /**
   * Reloads the arrangement from persistence and applies the active search and
   * category criteria via `searchCampaigns` (Req 2.7, 2.10, 11.1-11.5).
   *
   * - When the text exceeds the limit, `searchCampaigns` rejects it: the
   *   previously displayed arrangement is kept unchanged and an error
   *   indication is shown (Req 11.6).
   * - When criteria match nothing, the no-match flag drives a board-level
   *   empty-state (Req 11.7).
   * - When criteria are cleared, all Kartu_Campaign are shown again (Req 11.4).
   */
  const rebuild = () => {
    try {
      const campaigns: Campaign[] = services.repos.campaigns.all();
      const result = searchCampaigns(campaigns, { text: searchText, category });
      if (!result.ok) {
        // Over-limit text: keep the previous result unchanged (Req 11.6).
        setSearchError(result.reason);
        setLoadError(false);
        return;
      }
      setSearchError(null);
      const criteriaActive =
        searchText.trim().length > 0 || category !== undefined;
      setNoMatch(criteriaActive && result.matched.length === 0);
      setColumns(buildBoard(result.matched));
      hasArrangement.current = true;
      setLoadError(false);
    } catch {
      // Preserve the last successful arrangement; only flag the error.
      setLoadError(true);
    }
  };

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, version, searchText, category]);

  /**
   * Tambah_Cepat submit. Optimistically shows the new card in Menunggu when the
   * name is plausibly valid, then reconciles with persistence on success or
   * rolls back on failure (Req 3.1–3.6).
   */
  const handleQuickAdd = async (rawName: string): Promise<QuickAddOutcome> => {
    setActionError(null);
    const snapshot = columns;
    const trimmed = rawName.trim();
    const plausible =
      trimmed.length >= QUICK_ADD_NAME_MIN &&
      trimmed.length <= QUICK_ADD_NAME_MAX;

    if (snapshot && plausible) {
      const optimistic: CardView = {
        id: `optimistic-${Date.now()}`,
        name: trimmed,
        category: DEFAULT_DRAFT_CATEGORY,
        color: categoryColorOrDefault(DEFAULT_DRAFT_CATEGORY),
        promoCount: 0,
        storeCount: 0,
        timelineStart: NOW,
        timelineEnd: NOW,
      };
      setColumns(addCardLocally(snapshot, "Menunggu", optimistic));
    }

    try {
      const result = services.board.quickAdd(role, rawName, NOW);
      if (!result.ok) {
        // Rollback the optimistic card and report the validation reason.
        if (snapshot) setColumns(snapshot);
        return { ok: false, reason: result.reason };
      }
      // Reconcile the optimistic card with the persisted campaign.
      rebuild();
      return { ok: true };
    } catch {
      // System/authorization failure: rollback without adding a card (Req 3.6).
      if (snapshot) setColumns(snapshot);
      return { ok: false, reason: text.createError };
    }
  };

  /**
   * Seret-dan-lepas drop on a column. Optimistically moves the card, then
   * reconciles on a valid save or rolls back to the origin column on an invalid
   * transition or a save failure (Req 6.1, 6.3, 6.4, 6.6).
   */
  const handleDropCard = (toStatus: CampaignStatus) => {
    const cardId = draggingId.current;
    draggingId.current = null;
    if (!cardId || !columns) return;

    setActionError(null);
    const snapshot = columns;
    setColumns(moveCardLocally(columns, cardId, toStatus));

    try {
      const result = services.board.moveCampaign(role, cardId, toStatus, userId, NOW);
      if (!result.ok) {
        // Invalid transition: return the card to its origin column (Req 6.3).
        setColumns(snapshot);
        setActionError(result.reason);
        return;
      }
      rebuild();
    } catch {
      // Save/authorization failure: rollback to the origin column (Req 6.6).
      setColumns(snapshot);
      setActionError(text.moveError);
    }
  };

  /** Toggles a card's membership in the bulk selection (Requirement 10). */
  const toggleSelect = (cardId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  /** Clears the bulk selection without changing any Campaign. */
  const clearSelection = () => setSelectedIds(new Set());

  /**
   * Applies one Campaign_Category to every selected Campaign (Req 10.1). On
   * success, surfaces the updated count, refreshes the board, and clears the
   * selection. A rejected selection (0 or > 100) surfaces the reason.
   */
  const handleBulkSetCategory = (category: CampaignCategory) => {
    const ids = [...selectedIds];
    setActionError(null);
    try {
      const result = services.board.bulkSetCategory(role, ids, category, NOW);
      if (!result.ok) {
        setActionError(result.reason);
        return;
      }
      setBulkResult({ updated: result.value.updated, failures: result.value.failures });
      rebuild();
      clearSelection();
    } catch {
      setActionError(text.bulkActionError);
    }
  };

  /**
   * Applies a status move to every selected Campaign whose transition is valid
   * (Req 10.2); the rest are reported as a partial-success result (Req 10.3).
   */
  const handleBulkMove = (toStatus: CampaignStatus) => {
    const ids = [...selectedIds];
    setActionError(null);
    try {
      const result = services.board.bulkMove(role, ids, toStatus, userId, NOW);
      if (!result.ok) {
        setActionError(result.reason);
        return;
      }
      setBulkResult({ updated: result.value.updated, failures: result.value.failures });
      rebuild();
      clearSelection();
    } catch {
      setActionError(text.bulkActionError);
    }
  };

  /**
   * Runs the confirmed bulk delete (Req 10.5). Invoked only after the user
   * confirms the dialog; cancelling leaves every selected Campaign unchanged
   * (Req 10.6).
   */
  const handleConfirmDelete = () => {
    const ids = [...selectedIds];
    setConfirmDelete(false);
    setActionError(null);
    try {
      const result = services.board.bulkDelete(role, ids, NOW);
      if (!result.ok) {
        setActionError(result.reason);
        return;
      }
      setBulkResult({ deleted: result.value.deleted, failures: [] });
      rebuild();
      clearSelection();
    } catch {
      setActionError(text.bulkActionError);
    }
  };

  /** Focuses the first column's Tambah_Cepat input (Req 12.8). */
  const focusQuickAdd = () => {
    setPaletteOpen(false);
    // Defer so the input is focusable after any palette teardown this frame.
    requestAnimationFrame(() => quickAddRef.current?.focus());
  };

  /**
   * Commands exposed by the Palet_Perintah. Each `run` performs a board action;
   * a successful command may change Campaign data (Req 12.7). The set adapts to
   * the current role and panel state so only meaningful actions are offered.
   */
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    if (canQuickAdd) {
      list.push({
        id: "quick-add",
        label: text.cmdQuickAdd,
        run: focusQuickAdd,
      });
      list.push({
        id: "new-draft",
        label: text.cmdNewDraft,
        run: () => {
          // Creates a Campaign_Draft directly, changing Campaign data (Req 12.7).
          const result = services.board.quickAdd(role, text.newDraftName, NOW);
          if (!result.ok) {
            throw new Error(result.reason);
          }
          rebuild();
        },
      });
    }
    list.push({
      id: "focus-search",
      label: text.cmdFocusSearch,
      run: () => {
        const el = document.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        el?.focus();
      },
    });
    if (selectedId) {
      list.push({
        id: "close-detail",
        label: text.cmdCloseDetail,
        run: () => setSelectedId(null),
      });
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuickAdd, selectedId, role, services]);

  /**
   * Global Pintasan_Keyboard: Ctrl/⌘+K opens the Palet_Perintah (Req 12.1) and
   * Ctrl/⌘+Shift+A activates Tambah_Cepat (Req 12.8). The palette's own Esc
   * handling closes it and restores focus (Req 12.9).
   */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (mod && e.shiftKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (canQuickAdd) {
          focusQuickAdd();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuickAdd]);

  return (
    <div style={{ display: "grid", gap: theme.spacing(4) }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: theme.font.size.xl, color: theme.colors.text }}>
          Papan Campaign
        </h1>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          aria-haspopup="dialog"
          aria-label={text.commandPaletteTitle}
          style={{
            background: theme.colors.surface,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            padding: `${theme.spacing(2)} ${theme.spacing(3)}`,
            fontSize: theme.font.size.sm,
            fontWeight: 600,
            color: theme.colors.textMuted,
            cursor: "pointer",
          }}
        >
          {text.commandPaletteTitle} · Ctrl/⌘ K
        </button>
      </header>

      <SearchFilterBar
        searchText={searchText}
        category={category}
        error={searchError}
        onSearchTextChange={setSearchText}
        onCategoryChange={setCategory}
      />

      {loadError && (
        <div
          role="alert"
          style={{
            background: theme.colors.dangerSoft,
            color: theme.colors.danger,
            border: `1px solid ${theme.colors.danger}`,
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
            fontSize: theme.font.size.base,
            fontWeight: 600,
          }}
        >
          {text.loadError}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          style={{
            background: theme.colors.dangerSoft,
            color: theme.colors.danger,
            border: `1px solid ${theme.colors.danger}`,
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
            fontSize: theme.font.size.base,
            fontWeight: 600,
          }}
        >
          {actionError}
        </div>
      )}

      {canBulk && selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onSetCategory={handleBulkSetCategory}
          onMove={handleBulkMove}
          onRequestDelete={() => setConfirmDelete(true)}
          onClear={clearSelection}
        />
      )}

      {bulkResult && (
        <div
          role="status"
          style={{
            background: theme.colors.successSoft,
            color: theme.colors.text,
            border: `1px solid ${theme.colors.success}`,
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
            fontSize: theme.font.size.base,
            display: "grid",
            gap: theme.spacing(1),
          }}
        >
          {bulkResult.deleted !== undefined && (
            <div style={{ fontWeight: 600 }}>{text.bulkResultDeleted(bulkResult.deleted)}</div>
          )}
          {bulkResult.updated !== undefined && (
            <div style={{ fontWeight: 600 }}>{text.bulkResultUpdated(bulkResult.updated)}</div>
          )}
          {bulkResult.failures.length > 0 && (
            <div>
              <div style={{ fontWeight: 600, color: theme.colors.danger }}>
                {text.bulkResultFailures(bulkResult.failures.length)}
              </div>
              <ul style={{ margin: `${theme.spacing(1)} 0 0`, paddingLeft: theme.spacing(5) }}>
                {bulkResult.failures.map((f) => (
                  <li key={f.campaignId} style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>
                    {f.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasArrangement.current && columns ? (
        noMatch ? (
          <div
            role="status"
            style={{
              padding: theme.spacing(6),
              textAlign: "center",
              color: theme.colors.textMuted,
              fontSize: theme.font.size.base,
              border: `1px dashed ${theme.colors.borderStrong}`,
              borderRadius: theme.radius.lg,
            }}
          >
            {text.searchNoMatch}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: theme.spacing(3),
              alignItems: "flex-start",
              overflowX: "auto",
            }}
          >
            {columns.map((column, index) => (
              <Column
                key={column.status}
                column={column}
                canQuickAdd={canQuickAdd}
                canMove={canMove}
                filtering={filtering}
                onQuickAdd={handleQuickAdd}
                quickAddInputRef={index === 0 ? quickAddRef : undefined}
                onCardDragStart={(cardId) => {
                  draggingId.current = cardId;
                }}
                onCardDragEnd={() => {
                  // Dropping outside any column leaves status unchanged (Req 6.5):
                  // no column onDrop fired, so simply clear the drag marker.
                  draggingId.current = null;
                }}
                onDropCard={handleDropCard}
                onSelectCard={(cardId) => setSelectedId(cardId)}
                selectable={canBulk}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>
        )
      ) : (
        !loadError && (
          <div style={{ color: theme.colors.textMuted, fontSize: theme.font.size.base }}>
            {text.noItems}
          </div>
        )
      )}

      {selectedId && (
        <DetailPanel
          campaignId={selectedId}
          onClose={() => setSelectedId(null)}
          onSaved={rebuild}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          commands={commands}
          onClose={() => setPaletteOpen(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={text.bulkDeleteConfirmTitle}
          body={text.bulkDeleteConfirmBody(selectedIds.size)}
          confirmLabel={text.bulkDeleteConfirm}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
