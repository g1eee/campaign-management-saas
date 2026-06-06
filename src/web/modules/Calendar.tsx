/**
 * Calendar module: month/week/day views, category color-coding, multi-day
 * spanning via occursOnDay, selected-date detail, empty-period state.
 *
 * _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_
 */

import { useState } from "react";
import { theme } from "../theme.js";
import { Card, CategoryBadge, EmptyState } from "../components/ui.js";
import { NOW, useApp } from "../store.js";
import { CalendarItem, detailFor, occursOnDay, startOfDay } from "../../domain/calendar.js";

const DAY = 24 * 3600 * 1000;
type View = "month" | "week" | "day";

export function Calendar() {
  const { services } = useApp();
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState<number | null>(null);

  const items: CalendarItem[] = services.repos.campaigns.all().map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    status: c.status,
    start: c.scheduledStart ?? c.timelineStart,
    end: c.scheduledEnd ?? c.timelineEnd,
  }));

  const monthStart = startOfDay(Date.UTC(2026, 5, 1));
  const daysInView = view === "month" ? 30 : view === "week" ? 7 : 1;
  const viewStart = view === "day" ? startOfDay(NOW) : monthStart;

  const days = Array.from({ length: daysInView }, (_, i) => viewStart + i * DAY);
  const anyItems = days.some((d) => items.some((it) => occursOnDay(it, d)));

  const detail = selected !== null ? detailFor(selected, items) : [];

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card
        title="Kalender Campaign"
        action={
          <div style={{ display: "flex", gap: 6 }}>
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.colors.border}`,
                  background: view === v ? theme.colors.primarySoft : "transparent",
                  color: view === v ? theme.colors.primary : theme.colors.text,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {v === "month" ? "Bulan" : v === "week" ? "Minggu" : "Hari"}
              </button>
            ))}
          </div>
        }
      >
        {!anyItems ? (
          <EmptyState message="Tidak ada campaign terjadwal pada periode ini." />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: view === "day" ? "1fr" : "repeat(7, 1fr)",
              gap: 6,
            }}
          >
            {days.map((d) => {
              const dayItems = items.filter((it) => occursOnDay(it, d));
              const dayNum = new Date(d).getUTCDate();
              return (
                <button
                  key={d}
                  onClick={() => setSelected(d)}
                  style={{
                    textAlign: "left",
                    minHeight: 72,
                    border: `1px solid ${selected === d ? theme.colors.primary : theme.colors.border}`,
                    borderRadius: 8,
                    padding: 6,
                    background: theme.colors.surface,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, color: theme.colors.textMuted }}>{dayNum}</div>
                  <div style={{ display: "grid", gap: 3, marginTop: 4 }}>
                    {dayItems.slice(0, 2).map((it) => (
                      <span key={it.id}>
                        <CategoryBadge category={it.category} />
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selected !== null && (
        <Card title={`Detail ${new Date(selected).toLocaleDateString("id-ID")}`}>
          {detail.length === 0 ? (
            <EmptyState message="Tidak ada item pada tanggal ini." />
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {detail.map((d) => (
                <li key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>{d.name}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <CategoryBadge category={d.category} />
                    <span style={{ fontSize: 12, color: theme.colors.textMuted }}>{String(d.status)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
