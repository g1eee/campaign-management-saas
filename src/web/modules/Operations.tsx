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

  return (
    <Card title="Tugas Saya">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: theme.colors.textMuted }}>
            <th style={th}>Tugas</th>
            <th style={th}>Tenggat</th>
            <th style={th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} style={{ borderTop: `1px solid ${theme.colors.border}` }}>
              <td style={td}>{t.title}</td>
              <td style={td}>{new Date(t.deadline).toLocaleDateString("id-ID")}</td>
              <td style={td}>
                <select
                  value={t.status}
                  onChange={(e) => {
                    services.tasks.updateStatus(userId, t.id, e.target.value as TaskStatus);
                    refresh();
                  }}
                  style={selectStyle}
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

const th: React.CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px 6px" };
const selectStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.colors.border}`,
  fontSize: 13,
};
const rowBetween: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center" };
