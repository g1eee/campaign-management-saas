/**
 * Reusable month calendar widget.
 *
 * Renders a Monday-first month grid with category-colored campaign chips,
 * month navigation, a weekday header, a category legend, and click-to-select
 * day detail. Consumes the pure domain helpers (occursOnDay, detailFor) so the
 * display matches verified logic. UTC day boundaries match the domain model.
 *
 * _Requirements: 4.2, 15.1, 15.4, 15.5, 15.6_
 */

import { useState } from "react";
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

/** Monday-first index for a UTC weekday (0=Sun..6=Sat). */
function mondayIndex(d: Date): number {
  return (d.getUTCDay() + 6) % 7;
}

function buildGrid(year: number, month: number): number[] {
  const firstOfMonth = Date.UTC(year, month, 1);
  const offset = mondayIndex(new Date(firstOfMonth));
  const gridStart = startOfDay(firstOfMonth) - offset * DAY;
  return Array.from({ length: 42 }, (_, i) => gridStart + i * DAY);
}

export function CalendarWidget({
  items,
  initial,
  onSelectItem,
}: {
  items: CalendarItem[];
  initial: number;
  onSelectItem?: (id: string) => void;
}) {
  const initDate = new Date(startOfDay(initial));
  const [year, setYear] = useState(initDate.getUTCFullYear());
  const [month, setMonth] = useState(initDate.getUTCMonth());
  const [selected, setSelected] = useState<number | null>(startOfDay(initial));

  const grid = buildGrid(year, month);
  const today = startOfDay(initial);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const detail = selected !== null ? detailFor(selected, items) : [];

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: theme.spacing(3),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <NavBtn onClick={prevMonth} label="‹" />
          <NavBtn onClick={nextMonth} label="›" />
          <span style={{ fontWeight: 700, fontSize: theme.font.size.md }}>
            {MONTHS[month]} {year}
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            style={{
              textAlign: "center",
              fontSize: theme.font.size.xs,
              fontWeight: 600,
              color: theme.colors.textSoft,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {grid.map((dayTs) => {
          const d = new Date(dayTs);
          const inMonth = d.getUTCMonth() === month;
          const isToday = dayTs === today;
          const isSelected = dayTs === selected;
          const dayItems = items.filter((it) => occursOnDay(it, dayTs));

          return (
            <button
              key={dayTs}
              className="ch-clickable"
              onClick={() => setSelected(dayTs)}
              style={{
                textAlign: "left",
                minHeight: 78,
                border: `1px solid ${isSelected ? theme.colors.primary : theme.colors.border}`,
                borderRadius: theme.radius.md,
                padding: 7,
                background: inMonth ? theme.colors.surface : theme.colors.surfaceAlt,
                cursor: "pointer",
                boxShadow: isSelected ? `0 0 0 2px ${theme.colors.primarySoft}` : "none",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: theme.font.size.sm,
                    fontWeight: isToday ? 800 : 500,
                    color: !inMonth
                      ? theme.colors.textSoft
                      : isToday
                        ? "#fff"
                        : theme.colors.text,
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
              </div>
              <div style={{ display: "grid", gap: 3 }}>
                {dayItems.slice(0, 2).map((it) => (
                  <span
                    key={it.id}
                    title={it.name}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: theme.colors.text,
                      background: colorFor("category", it.category),
                      borderRadius: 5,
                      padding: "1px 5px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {it.name}
                  </span>
                ))}
                {dayItems.length > 2 && (
                  <span style={{ fontSize: 9, color: theme.colors.textSoft }}>
                    +{dayItems.length - 2} lainnya
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          marginTop: theme.spacing(3),
          paddingTop: theme.spacing(3),
          borderTop: `1px solid ${theme.colors.border}`,
        }}
      >
        {CAMPAIGN_CATEGORIES.map((c: CampaignCategory) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: theme.font.size.xs, color: theme.colors.textMuted }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor("category", c) }} />
            {categoryLabels[c]}
          </span>
        ))}
      </div>

      {/* Selected-date detail */}
      {selected !== null && (
        <div
          className="ch-fade-in"
          style={{
            marginTop: theme.spacing(3),
            background: theme.colors.surfaceAlt,
            borderRadius: theme.radius.md,
            padding: theme.spacing(3),
          }}
        >
          <div style={{ fontSize: theme.font.size.sm, fontWeight: 700, marginBottom: 8 }}>
            {new Date(selected).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </div>
          {detail.length === 0 ? (
            <div style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>
              Tidak ada campaign pada tanggal ini.
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
              {detail.map((d) => (
                <li
                  key={d.id}
                  className={onSelectItem ? "ch-clickable" : undefined}
                  onClick={() => onSelectItem?.(d.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: theme.colors.surface,
                    borderRadius: theme.radius.sm,
                    padding: "8px 10px",
                    cursor: onSelectItem ? "pointer" : "default",
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 999, background: colorFor("category", d.category) }} />
                    <span style={{ fontWeight: 600, fontSize: theme.font.size.base }}>{d.name}</span>
                  </span>
                  <span style={{ fontSize: theme.font.size.xs, color: theme.colors.textMuted }}>
                    {String(d.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function NavBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="ch-clickable"
      style={{
        width: 30,
        height: 30,
        borderRadius: theme.radius.sm,
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.surface,
        cursor: "pointer",
        fontSize: 16,
        lineHeight: 1,
        color: theme.colors.textMuted,
      }}
    >
      {label}
    </button>
  );
}

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
