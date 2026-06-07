/**
 * Campaign module: scheme creation form with promo-option sliders, real-time
 * preview, calculation table with sort + inline status, and the lifecycle
 * actions (submit/calculate/approve/schedule/review).
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
import { CampaignCalc } from "./CampaignCalc.js";

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
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,0.85fr)", gap: theme.spacing(5) }}>
        <div style={{ display: "grid", gap: theme.spacing(4) }}>
          <Field label="Nama Campaign" error={form.violationFor("name")}>
            <input
              value={form.scheme.name}
              onChange={(e) => form.setScheme((s) => ({ ...s, name: e.target.value }))}
              className="ch-input"
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
              className="ch-input"
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label style={labelStyle}>
                Opsi Promo{" "}
                <span style={{ color: theme.colors.textSoft, fontWeight: 500 }}>
                  ({form.scheme.promoOptions.length}/{MAX_PROMO_OPTIONS})
                </span>
              </label>
              <Button variant="ghost" onClick={addPromo} disabled={form.scheme.promoOptions.length >= MAX_PROMO_OPTIONS}>
                + Tambah
              </Button>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {form.scheme.promoOptions.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.md,
                    padding: "8px 12px",
                  }}
                >
                  <span style={{ width: 64, fontSize: theme.font.size.base, fontWeight: 600 }}>{p.label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={p.discountPct}
                    onChange={(e) => setDiscount(p.id, Number(e.target.value))}
                    className="ch-range"
                    style={{ flex: 1 }}
                    aria-label={`Diskon ${p.label}`}
                  />
                  <span
                    style={{
                      width: 48,
                      textAlign: "right",
                      fontWeight: 700,
                      color: theme.colors.primary,
                      fontSize: theme.font.size.md,
                    }}
                  >
                    {p.discountPct}%
                  </span>
                  <button
                    onClick={() => removePromo(p.id)}
                    aria-label={`Hapus ${p.label}`}
                    className="ch-clickable"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: theme.colors.danger, fontSize: 18, lineHeight: 1 }}
                  >
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
            background: `linear-gradient(160deg, ${theme.colors.bgAccent}, ${theme.colors.surfaceAlt})`,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.lg,
            padding: theme.spacing(4),
            alignSelf: "start",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: theme.spacing(3), fontSize: theme.font.size.md }}>
            Pratinjau Real-time
          </h3>
          <Row label="Nama" value={form.scheme.name || "-"} />
          <Row label="Kategori" value={form.scheme.category ? categoryLabels[form.scheme.category] : "-"} />
          <Row label="Total Diskon" value={`${form.preview.totalDiscountPct}%`} />
          <div style={{ height: 1, background: theme.colors.border, margin: "8px 0" }} />
          <Row label="Total Biaya" value={fmt(form.preview.calculation.totalCost)} />
          <Row label="Margin" value={fmt(form.preview.calculation.margin)} />
          <Row
            label="NPM"
            value={npm === "undefined" ? "Tidak terdefinisi" : `${(npm * 100).toFixed(1)}%`}
            warn={form.preview.calculation.warning}
            big
          />
          <div style={{ marginTop: theme.spacing(4) }}>
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
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as "name" | "npm")} className="ch-input" style={inputStyle}>
          <option value="name">Urut: Nama</option>
          <option value="npm">Urut: NPM</option>
        </select>
      }
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: theme.font.size.base }}>
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
                <tr key={c.id} className="ch-row" style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                  <td style={td}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={td}>{c.calculation ? fmt(c.calculation.totalCost) : "-"}</td>
                  <td style={td}>{c.calculation ? fmt(c.calculation.margin) : "-"}</td>
                  <td style={td}>
                    {npm === undefined ? (
                      "-"
                    ) : npm === "undefined" || c.calculation?.warning ? (
                      <span style={warnPill}>⚠ {npm === "undefined" ? "N/A" : `${(npm * 100).toFixed(1)}%`}</span>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{(npm * 100).toFixed(1)}%</span>
                    )}
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
      </div>
    </Card>
  );
}

export function Campaign() {
  const { role, refresh } = useApp();
  return (
    <div style={{ display: "grid", gap: theme.spacing(5) }}>
      <CampaignCalc />
      {role === "SPV" && <CreateForm onCreated={refresh} />}
      <CampaignList />
    </div>
  );
}

// --- small helpers ---
const inputStyle: React.CSSProperties = {
  padding: "9px 11px",
  borderRadius: theme.radius.sm,
  border: `1px solid ${theme.colors.borderStrong}`,
  fontSize: theme.font.size.base,
  width: "100%",
  boxSizing: "border-box",
  background: theme.colors.surface,
};
const labelStyle: React.CSSProperties = { fontSize: theme.font.size.base, color: theme.colors.textMuted, fontWeight: 600 };
const errorStyle: React.CSSProperties = { color: theme.colors.danger, fontSize: theme.font.size.sm, marginTop: 6 };
const th: React.CSSProperties = { padding: "10px 8px", fontWeight: 600, fontSize: theme.font.size.sm, textTransform: "uppercase", letterSpacing: "0.03em" };
const td: React.CSSProperties = { padding: "12px 8px" };
const warnPill: React.CSSProperties = {
  background: theme.colors.dangerSoft,
  color: theme.colors.danger,
  borderRadius: 999,
  padding: "2px 9px",
  fontSize: theme.font.size.sm,
  fontWeight: 700,
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
}

function Row({ label, value, warn, big }: { label: string; value: string; warn?: boolean; big?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0" }}>
      <span style={{ color: theme.colors.textMuted, fontSize: theme.font.size.base }}>{label}</span>
      <span
        style={{
          fontWeight: 700,
          fontSize: big ? theme.font.size.lg : theme.font.size.base,
          color: warn ? theme.colors.danger : theme.colors.text,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function fmt(n: number): string {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
