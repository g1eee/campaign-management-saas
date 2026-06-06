/**
 * Reusable calendar widget with Bulan / Minggu / Hari views.
 *
 * - View toggle (month / week / day), a month slider, prev/next, and a
 *   "Hari ini" shortcut.
 * - Category-colored campaign chips, weekday header, category legend.
 * - Click a date to see its campaigns and to add/remove per-day notes.
 *
 * Consumes the pure domain helpers (occursOnDay, detailFor) so the display
 * matches verified logic. UTC day boundaries match the domain model.
 *
 * _Requirements: 4.2, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
 */

import { useState, type CSSProperties } from "react";
import { theme } from "../theme.js";
import { colorFor } from "../../domain/colorRegistry.js";
import { categoryLabels } from "../i18n.js";
import {
  CalendarItem,
  detailFor,
  occursOnDay,
  startOfDay,
} from "../../domain/calendar.js";
import {
  CampaignCategory,
  CAMPAIGN_CATEGORIES,
} from "../../domain/types.js";

const DAY = 24 * 3600 * 1000;
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type View = "month" | "week" | "day";

function mondayIndex(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}
function buildMonthGrid(year: number, month: number): number[] {
  const firstOfMonth = Date.UTC(year, month, 1);
  const offset = mondayIndex(new Date(firstOfMonth));
  const gridStart = startOfDay(firstOfMonth) - offset * DAY;
  return Array.from({ length: 42 }, (_, i) => gridStart + i * DAY);
}
function buildWeek(anchor: number): number[] {
  const start = startOfDay(anchor) - mondayIndex(new Date(anchor)) * DAY;
  return Array.from({ length: 7 }, (_, i) => start + i * DAY);
}

export function CalendarWidget({
  items,
  initial,
  notes = {},
  onAddNote,
  onRemoveNote,
}: {
  items: CalendarItem[];
  initial: number;
  notes?: Record<number, string[]>;
  onAddNote?: (dayTs: number, text: string) => void;
  onRemoveNote?: (dayTs: number, index: number) => void;
}) {
  const today = startOfDay(initial);
  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState<number>(today);
  const [noteDraft, setNoteDraft] = useState("");

  const anchorDate = new Date(anchor);
  const year = anchorDate.getUTCFullYear();
  const month = anchorDate.getUTCMonth();

  // Month slider bounds: ±12 months around "today".
  const baseDate = new Date(today);
  const baseNum = baseDate.getUTCFullYear() * 12 + baseDate.getUTCMonth();
  const monthNum = year * 12 + month;
  const setFromMonthNum = (n: number) => {
    const ny = Math.floor(n / 12);
    const nm = ((n % 12) + 12) % 12;
    const day = Math.min(anchorDate.getUTCDate(), daysInMonth(ny, nm));
    setAnchor(startOfDay(Date.UTC(ny, nm, day)));
  };

  const shift = (dir: 1 | -1) => {
    if (view === "month") setFromMonthNum(monthNum + dir);
    else if (view === "week") setAnchor((a) => a + dir * 7 * DAY);
    else setAnchor((a) => a + dir * DAY);
  };

  const periodDays =
    view === "month" ? buildMonthGrid(year, month) : view === "week" ? buildWeek(anchor) : [startOfDay(anchor)];

  const periodHasItems = periodDays.some((d) => items.some((it) => occursOnDay(it, d)));
  const detail = detailFor(anchor, items);
  const dayNotes = notes[startOfDay(anchor)] ?? [];

  const periodLabel =
    view === "day"
      ? new Date(anchor).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
      : view === "week"
        ? `Minggu ${new Date(periodDays[0]).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })} - ${new Date(periodDays[6]).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })}`
        : `${MONTHS[month]} ${year}`;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: theme.spacing(3) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavBtn onClick={() => shift(-1)} label="‹" />
          <NavBtn onClick={() => shift(1)} label="›" />
          <button
            className="ch-clickable"
            onClick={() => setAnchor(today)}
            style={{ ...ghostBtn, fontWeight: 600 }}
          >
            Hari ini
          </button>
          <span style={{ fontWeight: 700, fontSize: theme.font.size.md, marginLeft: 4 }}>{periodLabel}</span>
        </div>

        {/* View toggle */}
        <div style={{ display: "inline-flex", background: theme.colors.surfaceAlt, borderRadius: theme.radius.sm, padding: 3 }}>
          {(["month", "week", "day"] as View[]).map((v) => (
            <button
              key={v}
              className="ch-clickable"
              onClick={() => setView(v)}
              style={{
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: theme.font.size.sm,
                fontWeight: 600,
                cursor: "pointer",
                background: view === v ? theme.colors.surface : "transparent",
                color: view === v ? theme.colors.primary : theme.colors.textMuted,
                boxShadow: view === v ? theme.shadow.card : "none",
              }}
            >
              {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
            </button>
          ))}
        </div>
      </div>

      {/* Month slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: theme.spacing(3) }}>
        <span style={{ fontSize: theme.font.size.xs, color: theme.colors.textSoft, whiteSpace: "nowrap" }}>Geser bulan</span>
        <input
          type="range"
          className="ch-range"
          min={baseNum - 12}
          max={baseNum + 12}
          step={1}
          value={monthNum}
          onChange={(e) => setFromMonthNum(Number(e.target.value))}
          aria-label="Geser bulan"
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: theme.font.size.xs, color: theme.colors.textMuted, minWidth: 92, textAlign: "right" }}>
          {MONTHS[month].slice(0, 3)} {year}
        </span>
      </div>

      {/* Weekday header (month & week) */}
      {view !== "day" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
          {WEEKDAYS.map((w) => (
            <div key={w} style={{ textAlign: "center", fontSize: theme.font.size.xs, fontWeight: 600, color: theme.colors.textSoft, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {!periodHasItems && view === "month" ? null : null}
      {view === "day" ? (
        <DayPane dayTs={startOfDay(anchor)} items={items} today={today} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {periodDays.map((dayTs) => (
            <DayCell
              key={dayTs}
              dayTs={dayTs}
              items={items}
              inMonth={view === "week" ? true : new Date(dayTs).getUTCMonth() === month}
              today={today}
              selected={startOfDay(anchor) === dayTs}
              tall={view === "week"}
              onClick={() => setAnchor(dayTs)}
            />
          ))}
        </div>
      )}

      {!periodHasItems && (
        <div style={{ marginTop: theme.spacing(3), fontSize: theme.font.size.sm, color: theme.colors.textSoft, textAlign: "center" }}>
          Tidak ada campaign terjadwal pada periode ini.
        </div>
      )}

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: theme.spacing(3), paddingTop: theme.spacing(3), borderTop: `1px solid ${theme.colors.border}` }}>
        {CAMPAIGN_CATEGORIES.map((c: CampaignCategory) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: theme.font.size.xs, color: theme.colors.textMuted }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor("category", c) }} />
            {categoryLabels[c]}
          </span>
        ))}
      </div>

      {/* Selected-date detail + notes */}
      <div
        className="ch-fade-in"
        key={anchor}
        style={{ marginTop: theme.spacing(3), background: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: theme.spacing(4) }}
      >
        <div style={{ fontSize: theme.font.size.sm, fontWeight: 700, marginBottom: 10 }}>
          {new Date(anchor).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
        </div>

        {/* Campaigns on this date */}
        {detail.length === 0 ? (
          <div style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>Tidak ada campaign pada tanggal ini.</div>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {detail.map((d) => (
              <li key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: theme.colors.surface, borderRadius: theme.radius.sm, padding: "8px 10px", border: `1px solid ${theme.colors.border}` }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: colorFor("category", d.category) }} />
                  <span style={{ fontWeight: 600, fontSize: theme.font.size.base }}>{d.name}</span>
                </span>
                <span style={{ fontSize: theme.font.size.xs, color: theme.colors.textMuted }}>{String(d.status)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Notes */}
        <div style={{ marginTop: theme.spacing(4) }}>
          <div style={{ fontSize: theme.font.size.sm, fontWeight: 700, marginBottom: 8 }}>Catatan</div>
          {dayNotes.length > 0 && (
            <ul style={{ listStyle: "none", margin: "0 0 10px", padding: 0, display: "grid", gap: 6 }}>
              {dayNotes.map((note, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, background: theme.colors.surface, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.sm, padding: "8px 10px" }}>
                  <span style={{ fontSize: theme.font.size.base }}>📝 {note}</span>
                  {onRemoveNote && (
                    <button
                      onClick={() => onRemoveNote(startOfDay(anchor), i)}
                      aria-label="Hapus catatan"
                      className="ch-clickable"
                      style={{ border: "none", background: "transparent", color: theme.colors.danger, cursor: "pointer", fontSize: 16, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {onAddNote && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onAddNote(startOfDay(anchor), noteDraft);
                setNoteDraft("");
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Tambah catatan untuk tanggal ini..."
                className="ch-input"
                style={{ flex: 1, padding: "9px 11px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.borderStrong}`, fontSize: theme.font.size.base, background: theme.colors.surface }}
              />
              <button
                type="submit"
                disabled={!noteDraft.trim()}
                className="ch-clickable"
                style={{ border: "none", borderRadius: theme.radius.sm, padding: "9px 16px", background: theme.colors.primary, color: "#fff", fontWeight: 600, fontSize: theme.font.size.base, cursor: noteDraft.trim() ? "pointer" : "not-allowed", opacity: noteDraft.trim() ? 1 : 0.5 }}
              >
                Tambah
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  dayTs,
  items,
  inMonth,
  today,
  selected,
  tall,
  onClick,
}: {
  dayTs: number;
  items: CalendarItem[];
  inMonth: boolean;
  today: number;
  selected: boolean;
  tall?: boolean;
  onClick: () => void;
}) {
  const d = new Date(dayTs);
  const isToday = dayTs === today;
  const dayItems = items.filter((it) => occursOnDay(it, dayTs));
  const max = tall ? 5 : 2;

  return (
    <button
      className="ch-clickable"
      onClick={onClick}
      style={{
        textAlign: "left",
        minHeight: tall ? 150 : 78,
        border: `1px solid ${selected ? theme.colors.primary : theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: 7,
        background: inMonth ? theme.colors.surface : theme.colors.surfaceAlt,
        cursor: "pointer",
        boxShadow: selected ? `0 0 0 2px ${theme.colors.primarySoft}` : "none",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: theme.font.size.sm,
          fontWeight: isToday ? 800 : 500,
          color: !inMonth ? theme.colors.textSoft : isToday ? "#fff" : theme.colors.text,
          background: isToday ? theme.colors.primary : "transparent",
          borderRadius: 999,
          width: 22,
          height: 22,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {d.getUTCDate()}
      </span>
      <div style={{ display: "grid", gap: 3 }}>
        {dayItems.slice(0, max).map((it) => (
          <span
            key={it.id}
            title={it.name}
            style={{ fontSize: 10, fontWeight: 600, color: theme.colors.text, background: colorFor("category", it.category), borderRadius: 5, padding: "1px 5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
          >
            {it.name}
          </span>
        ))}
        {dayItems.length > max && (
          <span style={{ fontSize: 9, color: theme.colors.textSoft }}>+{dayItems.length - max} lainnya</span>
        )}
      </div>
    </button>
  );
}

function DayPane({ dayTs, items, today }: { dayTs: number; items: CalendarItem[]; today: number }) {
  const dayItems = items.filter((it) => occursOnDay(it, dayTs));
  return (
    <div
      style={{
        border: `1px solid ${dayTs === today ? theme.colors.primary : theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing(4),
        background: theme.colors.surface,
        minHeight: 120,
      }}
    >
      {dayItems.length === 0 ? (
        <div style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>Tidak ada campaign pada hari ini.</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {dayItems.map((it) => (
            <li key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: theme.colors.surfaceAlt, borderRadius: theme.radius.sm }}>
              <span style={{ width: 10, height: 10, borderRadius: 999, background: colorFor("category", it.category) }} />
              <span style={{ fontWeight: 600 }}>{it.name}</span>
              <span style={{ marginLeft: "auto", fontSize: theme.font.size.xs, color: theme.colors.textMuted }}>{String(it.status)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="ch-clickable" style={{ ...ghostBtn, width: 30, height: 30, padding: 0, fontSize: 16 }}>
      {label}
    </button>
  );
}

const ghostBtn: CSSProperties = {
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.colors.border}`,
  background: theme.colors.surface,
  cursor: "pointer",
  fontSize: theme.font.size.sm,
  lineHeight: 1,
  color: theme.colors.textMuted,
  padding: "6px 12px",
};

/** Maps campaigns to calendar items (scheduled window, falling back to timeline). */
export function campaignsToCalendarItems(
  campaigns: {
    id: string;
    name: string;
    category: CampaignCategory;
    status: string;
    scheduledStart?: number;
    scheduledEnd?: number;
    timelineStart: number;
    timelineEnd: number;
  }[],
): CalendarItem[] {
  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    status: c.status,
    start: c.scheduledStart ?? c.timelineStart,
    end: c.scheduledEnd ?? c.timelineEnd,
  }));
}
