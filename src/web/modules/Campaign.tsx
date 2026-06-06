/**
 * Campaign module: scheme creation form with drag-style promo-option sliders,
 * real-time preview, calculation table with sort + inline status, and the
 * lifecycle actions (submit/calculate/approve/schedule/review).
 *
 * _Requirements: 5.1-5.7, 6.1, 7.1-7.6, 8.1-8.5, 8.8_
 */

import React, { useState } from "react";
import { theme } from "../theme.js";
import { Button, Card, EmptyState, StatusBadge } from "../components/ui.js";
import { useApp, NOW } from "../store.js";
import { useSchemeForm } from "../forms/useSchemeForm.js";
import { categoryLabels } from "../i18n.js";
import {
  CampaignCategory,
  CAMPAIGN_CATEGORIES,
  CampaignScheme,
  MAX_PROMO_OPTIONS,
} from "../../domain/types.js";
import { sortBy } from "../../domain/collections.js";

const emptyScheme: CampaignScheme = {
  name: "",
  category: null,
  timelineStart: NOW,
  timelineEnd: NOW + 7 * 24 * 3600 * 1000,
  targetStoreIds: ["s1"],
  promoOptions: [{ id: "p1", label: "Diskon", discountPct: 10 }],
  baseRevenue: 100_000_000,
  baseCost: 60_000_000,
  additionalCosts: 5_000_000,
};

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const { services, role } = useApp();
  const form = useSchemeForm(emptyScheme);
  const [error, setError] = useState<string | null>(null);

  const addPromo = () => {
    form.setScheme((s) =>
      s.promoOptions.length >= MAX_PROMO_OPTIONS
        ? s
        : {
            ...s,
            promoOptions: [
              ...s.promoOptions,
              { id: `p${s.promoOptions.length + 1}-${Date.now()}`, label: "Promo", discountPct: 5 },
            ],
          },
    );
  };

  const setDiscount = (id: string, value: number) =>
    form.setScheme((s) => ({
      ...s,
      promoOptions: s.promoOptions.map((p) => (p.id === id ? { ...p, discountPct: value } : p)),
    }));

  const removePromo = (id: string) =>
    form.setScheme((s) => ({
      ...s,
      promoOptions: s.promoOptions.filter((p) => p.id !== id),
    }));

  const save = () => {
    setError(null);
    const result = services.campaigns.createScheme(role, form.scheme, NOW);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    onCreated();
  };

  const npm = form.preview.calculation.npm;

  return (
    <Card title="Buat Skema Campaign">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: theme.spacing(4) }}>
        <div style={{ display: "grid", gap: theme.spacing(3) }}>
          <Field label="Nama Campaign" error={form.violationFor("name")}>
            <input
              value={form.scheme.name}
              onChange={(e) => form.setScheme((s) => ({ ...s, name: e.target.value }))}
              style={inputStyle}
              placeholder="cth. Flash Sale 6.6"
            />
          </Field>

          <Field label="Kategori" error={form.violationFor("category")}>
            <select
              value={form.scheme.category ?? ""}
              onChange={(e) =>
                form.setScheme((s) => ({ ...s, category: (e.target.value || null) as CampaignCategory | null }))
              }
              style={inputStyle}
            >
              <option value="">Pilih kategori</option>
              {CAMPAIGN_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={labelStyle}>Opsi Promo ({form.scheme.promoOptions.length}/{MAX_PROMO_OPTIONS})</label>
              <Button variant="ghost" onClick={addPromo} disabled={form.scheme.promoOptions.length >= MAX_PROMO_OPTIONS}>
                + Tambah
              </Button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {form.scheme.promoOptions.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 70, fontSize: 13 }}>{p.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={p.discountPct}
                    onChange={(e) => setDiscount(p.id, Number(e.target.value))}
                    style={{ flex: 1 }}
                    aria-label={`Diskon ${p.label}`}
                  />
                  <span style={{ width: 44, textAlign: "right", fontWeight: 600 }}>{p.discountPct}%</span>
                  <button onClick={() => removePromo(p.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: theme.colors.danger }}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            {form.violationFor("promoOptions") && (
              <div style={errorStyle}>{form.violationFor("promoOptions")}</div>
            )}
          </div>
        </div>

        {/* Real-time preview */}
        <div
          style={{
            background: theme.colors.surfaceAlt,
            borderRadius: theme.radius.md,
            padding: theme.spacing(4),
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Pratinjau Real-time</h3>
          <Row label="Nama" value={form.scheme.name || "-"} />
          <Row label="Kategori" value={form.scheme.category ? categoryLabels[form.scheme.category] : "-"} />
          <Row label="Total Diskon" value={`${form.preview.totalDiscountPct}%`} />
          <Row label="Total Biaya" value={fmt(form.preview.calculation.totalCost)} />
          <Row label="Margin" value={fmt(form.preview.calculation.margin)} />
          <Row
            label="NPM"
            value={npm === "undefined" ? "Tidak terdefinisi" : `${(npm * 100).toFixed(1)}%`}
            warn={form.preview.calculation.warning}
          />
          <div style={{ marginTop: theme.spacing(4), display: "flex", gap: 8 }}>
            <Button onClick={save} disabled={!form.isValid}>
              Simpan Skema
            </Button>
          </div>
          {error && <div style={errorStyle}>{error}</div>}
        </div>
      </div>
    </Card>
  );
}

function CampaignList() {
  const { services, role, refresh } = useApp();
  const [sortKey, setSortKey] = useState<"name" | "npm">("name");

  const campaigns = sortBy(
    services.repos.campaigns.all(),
    (c) => (sortKey === "name" ? c.name : typeof c.calculation?.npm === "number" ? c.calculation.npm : -Infinity),
    "asc",
  );

  const act = (fn: () => { ok: boolean; reason?: string }) => {
    const r = fn();
    refresh();
    if (!r.ok && r.reason) alert(r.reason);
  };

  if (campaigns.length === 0) return <EmptyState message="Belum ada campaign." />;

  return (
    <Card
      title="Daftar Campaign & Kalkulasi"
      action={
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as "name" | "npm")} style={inputStyle}>
          <option value="name">Urut: Nama</option>
          <option value="npm">Urut: NPM</option>
        </select>
      }
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: theme.colors.textMuted }}>
            <th style={th}>Campaign</th>
            <th style={th}>Status</th>
            <th style={th}>Total Biaya</th>
            <th style={th}>Margin</th>
            <th style={th}>NPM</th>
            <th style={th}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const npm = c.calculation?.npm;
            return (
              <tr key={c.id} style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                <td style={td}>{c.name}</td>
                <td style={td}>
                  <StatusBadge status={c.status} />
                </td>
                <td style={td}>{c.calculation ? fmt(c.calculation.totalCost) : "-"}</td>
                <td style={td}>{c.calculation ? fmt(c.calculation.margin) : "-"}</td>
                <td style={{ ...td, color: c.calculation?.warning ? theme.colors.danger : theme.colors.text }}>
                  {npm === undefined ? "-" : npm === "undefined" ? "⚠ N/A" : `${(npm * 100).toFixed(1)}%`}
                </td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {role === "SPV" && c.status === "Menunggu" && (
                      <Button variant="ghost" onClick={() => act(() => services.campaigns.submit(role, c.id, "spv1", NOW))}>
                        Submit
                      </Button>
                    )}
                    {role === "Admin" && c.step === "Submit" && (
                      <Button variant="ghost" onClick={() => act(() => services.campaigns.approve(role, c.id, "adm1", NOW))}>
                        Setujui
                      </Button>
                    )}
                    {role === "SPV" && c.step === "Eksekusi" && (
                      <>
                        <Button variant="ghost" onClick={() => act(() => services.campaigns.reviewApprove(role, c.id, "spv1", NOW))}>
                          Approve
                        </Button>
                        <Button variant="danger" onClick={() => act(() => services.campaigns.reviewReject(role, c.id, "spv1", NOW))}>
                          Tolak
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

export function Campaign() {
  const { role, refresh } = useApp();
  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      {role === "SPV" && <CreateForm onCreated={refresh} />}
      <CampaignList />
    </div>
  );
}

// --- small helpers ---
const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: `1px solid ${theme.colors.border}`,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: 13, color: theme.colors.textMuted, fontWeight: 600 };
const errorStyle: React.CSSProperties = { color: theme.colors.danger, fontSize: 12, marginTop: 4 };
const th: React.CSSProperties = { padding: "8px 6px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "8px 6px" };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 4 }}>{children}</div>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: theme.colors.textMuted, fontSize: 13 }}>{label}</span>
      <span style={{ fontWeight: 600, color: warn ? theme.colors.danger : theme.colors.text }}>{value}</span>
    </div>
  );
}

function fmt(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
