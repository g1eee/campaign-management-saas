/**
 * Operational modules: Tugas Saya, Notifikasi, Laporan, Master Data, Pengaturan.
 *
 * _Requirements: 17.5, 17.6, 17.7, 18.1-18.7, 19.1-19.6, 20.1-20.6, 21.1-21.5_
 */

import React, { useState } from "react";
import { theme } from "../theme.js";
import { Button, Card, EmptyState, StatusBadge } from "../components/ui.js";
import { useApp } from "../store.js";
import { categoryLabels } from "../i18n.js";
import {
  CampaignStatus,
  CampaignCategory,
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  TaskStatus,
  TASK_STATUSES,
} from "../../domain/types.js";

// --- Tugas Saya ---
export function TugasSaya() {
  const { services, userId, refresh } = useApp();
  const tasks = services.tasks.list(userId);

  if (tasks.length === 0) return <EmptyState message="Tidak ada tugas untuk Anda." />;

  const statusTone: Record<TaskStatus, { bg: string; fg: string; label: string }> = {
    Open: { bg: theme.colors.surfaceAlt, fg: theme.colors.textMuted, label: "Terbuka" },
    InProgress: { bg: theme.colors.primarySoft, fg: theme.colors.primary, label: "Dikerjakan" },
    Done: { bg: theme.colors.successSoft, fg: theme.colors.success, label: "Selesai" },
  };

  const fmtDate = (ts: number) =>
    new Date(ts).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <Card title="Tugas Saya">
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.font.size.base }}>
          <thead>
            <tr style={{ textAlign: "left", color: theme.colors.textMuted }}>
              <th style={thU}>Tugas</th>
              <th style={thU}>Terkait</th>
              <th style={thU}>Tenggat</th>
              <th style={thU}>Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const tone = statusTone[t.status];
              return (
                <tr key={t.id} className="ch-row" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                  <td style={{ ...tdc, fontWeight: 600 }}>{t.title}</td>
                  <td style={{ ...tdc, color: theme.colors.textMuted }}>
                    {t.linkedRefType ? `${t.linkedRefType} · ${t.linkedRefId}` : "-"}
                  </td>
                  <td style={tdc}>{fmtDate(t.deadline)}</td>
                  <td style={tdc}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          background: tone.bg,
                          color: tone.fg,
                          borderRadius: 999,
                          padding: "2px 10px",
                          fontSize: theme.font.size.sm,
                          fontWeight: 700,
                        }}
                      >
                        {tone.label}
                      </span>
                      <select
                        value={t.status}
                        onChange={(e) => {
                          services.tasks.updateStatus(userId, t.id, e.target.value as TaskStatus);
                          refresh();
                        }}
                        className="ch-input"
                        style={selectStyle}
                        aria-label={`Ubah status ${t.title}`}
                      >
                        {TASK_STATUSES.map((s) => (
                          <option key={s} value={s}>{statusTone[s].label}</option>
                        ))}
                      </select>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// --- Notifikasi ---
export function Notifikasi() {
  const { services, userId, refresh } = useApp();
  const notifs = services.notifications.list(userId);
  const unread = services.notifications.unreadCount(userId);

  return (
    <Card title={`Notifikasi (${unread} belum dibaca)`}>
      {notifs.length === 0 ? (
        <EmptyState message="Belum ada notifikasi." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {notifs.map((n) => (
            <li
              key={n.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: `1px solid ${theme.colors.border}`,
              }}
            >
              <span style={{ fontWeight: n.state === "unread" ? 700 : 400 }}>{n.message}</span>
              {n.state === "unread" && (
                <Button variant="ghost" onClick={() => { services.notifications.markRead(userId, n.id); refresh(); }}>
                  Tandai dibaca
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// --- Laporan ---
export function Laporan() {
  const { services } = useApp();
  const summary = services.reports.summary();

  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <Card title="Laporan Campaign per Status">
        <div style={{ display: "grid", gap: 6 }}>
          {CAMPAIGN_STATUSES.map((s: CampaignStatus) => (
            <div key={s} style={rowBetween}>
              <StatusBadge status={s} />
              <strong>{summary.byStatus[s]}</strong>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Laporan Campaign per Kategori">
        <div style={{ display: "grid", gap: 6 }}>
          {CAMPAIGN_CATEGORIES.map((c: CampaignCategory) => (
            <div key={c} style={rowBetween}>
              <span>{categoryLabels[c]}</span>
              <strong>{summary.byCategory[c]}</strong>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// --- Master Data ---
export function MasterData() {
  const { services, role, refresh } = useApp();
  const records = services.repos.masterData.all();
  const [uniqueId, setUniqueId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    setError(null);
    const r = services.masterData.upsert(role, {
      id: `m-${Date.now()}`,
      type: "StoreCategory",
      uniqueId,
      fields: { name },
    });
    if (!r.ok) setError(r.reason);
    else {
      setUniqueId("");
      setName("");
      refresh();
    }
  };

  return (
    <Card title="Master Data: Kategori Toko">
      <div style={{ display: "flex", gap: 8, marginBottom: theme.spacing(4) }}>
        <input value={uniqueId} onChange={(e) => setUniqueId(e.target.value)} placeholder="Kode unik" style={selectStyle} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama" style={selectStyle} />
        <Button onClick={add} disabled={!uniqueId || !name}>Tambah</Button>
      </div>
      {error && <div style={{ color: theme.colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {records.length === 0 ? (
        <EmptyState message="Belum ada data." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          {records.map((r) => (
            <li key={r.id} style={rowBetween}>
              <span><strong>{r.uniqueId}</strong> — {r.fields.name}</span>
              <Button
                variant="danger"
                onClick={() => {
                  const res = services.masterData.delete(role, r.id, []);
                  if (!res.ok) alert(res.reason);
                  refresh();
                }}
              >
                Hapus
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// --- Pengaturan ---
export function Pengaturan() {
  const { role, userId } = useApp();
  const [theme1, setTheme1] = useState("light");

  return (
    <Card title="Pengaturan">
      <div style={{ display: "grid", gap: 12 }}>
        <div style={rowBetween}>
          <span style={{ color: theme.colors.textMuted }}>Pengguna</span>
          <strong>{userId}</strong>
        </div>
        <div style={rowBetween}>
          <span style={{ color: theme.colors.textMuted }}>Peran</span>
          <strong>{role === "SPV" ? "Supervisor" : "Admin"}</strong>
        </div>
        <div style={rowBetween}>
          <span style={{ color: theme.colors.textMuted }}>Tema</span>
          <select value={theme1} onChange={(e) => setTheme1(e.target.value)} style={selectStyle}>
            <option value="light">Light (Pastel)</option>
          </select>
        </div>
      </div>
    </Card>
  );
}

const thU: React.CSSProperties = {
  padding: "10px 8px",
  fontWeight: 600,
  fontSize: theme.font.size.sm,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
};
const tdc: React.CSSProperties = { padding: "12px 8px" };
const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.colors.border}`,
  fontSize: 13,
};
const rowBetween: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
