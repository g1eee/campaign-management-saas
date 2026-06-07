/**
 * Campaign calculation table — the team's "calculate campaign" sheet, in-app.
 *
 * Features:
 * - Product master from the store (editable via CSV import).
 * - Editable marketplace fee rates.
 * - Adjustable campaign discount (global + per-row) driving the Campaign Fee.
 * - Configurable target NPM with auto APPROVE per product, plus a summary.
 * - Save / load named campaign sheets; export the result to CSV.
 *
 * Uses the pure productCalc + csv engines.
 */

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { theme } from "../theme.js";
import { Card } from "../components/ui.js";
import { useApp, SavedCalc } from "../store.js";
import {
  calcLine,
  campaignFeeFromDiscount,
  FeeRates,
  summarize,
  totalFeeRate,
} from "../../domain/productCalc.js";
import { DEFAULT_FEE_RATES } from "../../domain/productCalc.js";
import { CATEGORY_LABELS } from "../../domain/products.js";
import { buildCampaignCsv, parseProductsCsv } from "../../domain/csv.js";

const fmt0 = (n: number) => Math.round(n).toLocaleString("id-ID");
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

const RATE_FIELDS: { key: keyof FeeRates; label: string }[] = [
  { key: "adminFee", label: "Admin" },
  { key: "shippingFee", label: "Shipping" },
  { key: "promoXtra", label: "Promo Xtra" },
  { key: "feePerOrder", label: "Fee/pesanan" },
  { key: "promosiFee", label: "Promosi" },
  { key: "marketingFee", label: "Marketing" },
  { key: "adsSpending", label: "Ads" },
  { key: "affiliateCommission", label: "Affiliate" },
  { key: "operatingCost", label: "Operating" },
];

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CampaignCalc() {
  const { products, setProducts, feeRates, setFeeRates, savedCalcs, saveCalc, deleteCalc } = useApp();

  const [discount, setDiscount] = useState(0);
  const [targetNpm, setTargetNpm] = useState(15);
  const [showDetail, setShowDetail] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [rowDiscount, setRowDiscount] = useState<Record<string, number>>({});
  const [included, setIncluded] = useState<Set<string>>(() => new Set(products.map((p) => p.id)));
  const [calcName, setCalcName] = useState("");
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const target = targetNpm / 100;

  const rows = useMemo(
    () =>
      products.map((product) => {
        const eff = rowDiscount[product.id] ?? discount;
        const fee = campaignFeeFromDiscount(product.hargaJual, eff);
        const calc = calcLine(product, feeRates, fee, target);
        return { product, effDiscount: eff, calc };
      }),
    [products, feeRates, discount, target, rowDiscount],
  );

  const summary = useMemo(
    () => summarize(rows.filter((r) => included.has(r.product.id)).map((r) => r.calc)),
    [rows, included],
  );

  const toggle = (id: string) =>
    setIncluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const result = parseProductsCsv(text);
      if (result.parsed === 0) {
        setImportMsg("Tidak ada produk valid ditemukan di CSV.");
        return;
      }
      setProducts(result.products);
      setIncluded(new Set(result.products.map((p) => p.id)));
      setRowDiscount({});
      setImportMsg(`Berhasil impor ${result.parsed} produk (${result.skipped} baris dilewati).`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const onExport = () => {
    const exportRows = rows.filter((r) => included.has(r.product.id)).map((r) => ({ product: r.product, calc: r.calc }));
    download(`campaign-${Date.now()}.csv`, buildCampaignCsv(exportRows));
  };

  const onSave = () => {
    const name = calcName.trim();
    if (!name) return;
    saveCalc({
      id: `calc-${Date.now()}`,
      name,
      discount,
      targetNpm,
      rowDiscount,
      includedIds: [...included],
    });
    setCalcName("");
  };

  const onLoad = (c: SavedCalc) => {
    setDiscount(c.discount);
    setTargetNpm(c.targetNpm);
    setRowDiscount(c.rowDiscount);
    setIncluded(new Set(c.includedIds));
  };

  const updateRate = (key: keyof FeeRates, percent: number) =>
    setFeeRates({ ...feeRates, [key]: percent / 100 });

  return (
    <Card
      title="Kalkulasi Campaign — Master Produk"
      action={
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button className="ch-clickable" onClick={() => fileRef.current?.click()} style={ghost}>Import CSV</button>
          <button className="ch-clickable" onClick={onExport} style={ghost}>Export CSV</button>
          <button className="ch-clickable" onClick={() => setShowRates((s) => !s)} style={ghost}>
            {showRates ? "Tutup rate fee" : "Edit rate fee"}
          </button>
          <button className="ch-clickable" onClick={() => setShowDetail((s) => !s)} style={ghost}>
            {showDetail ? "Ringkas" : "Rincian fee"}
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onImport} style={{ display: "none" }} />
        </div>
      }
    >
      {importMsg && (
        <div style={{ marginBottom: theme.spacing(3), fontSize: theme.font.size.sm, color: theme.colors.primary, background: theme.colors.primarySoft, borderRadius: theme.radius.sm, padding: "8px 12px" }}>
          {importMsg}
        </div>
      )}

      {/* Fee rate editor */}
      {showRates && (
        <div style={{ marginBottom: theme.spacing(4), padding: theme.spacing(4), background: theme.colors.surfaceAlt, borderRadius: theme.radius.md }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: theme.spacing(3) }}>
            <strong style={{ fontSize: theme.font.size.md }}>Rate Fee Marketplace</strong>
            <button className="ch-clickable" onClick={() => setFeeRates(DEFAULT_FEE_RATES)} style={ghost}>Reset default</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: theme.spacing(3) }}>
            {RATE_FIELDS.map((f) => (
              <label key={f.key} style={{ fontSize: theme.font.size.sm }}>
                <span style={{ color: theme.colors.textMuted, display: "block", marginBottom: 4 }}>{f.label}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <input
                    type="number"
                    step={0.01}
                    value={+(feeRates[f.key] * 100).toFixed(2)}
                    onChange={(e) => updateRate(f.key, Number(e.target.value))}
                    className="ch-input"
                    style={{ ...numInput, width: "100%" }}
                    aria-label={`Rate ${f.label}`}
                  />
                  <span style={{ color: theme.colors.textMuted }}>%</span>
                </span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: theme.spacing(3), fontSize: theme.font.size.xs, color: theme.colors.textSoft }}>
            Total fee dasar: <strong>{pct(totalFeeRate(feeRates))}</strong>
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: theme.spacing(5), flexWrap: "wrap", alignItems: "center", marginBottom: theme.spacing(4) }}>
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <label style={ctrlLabel}>
            Diskon Campaign: <strong style={{ color: theme.colors.primary }}>{discount}%</strong>
          </label>
          <input
            type="range"
            className="ch-range"
            min={0}
            max={50}
            step={1}
            value={discount}
            onChange={(e) => {
              setDiscount(Number(e.target.value));
              setRowDiscount({});
            }}
            style={{ width: "100%" }}
            aria-label="Diskon Campaign"
          />
        </div>
        <div>
          <label style={ctrlLabel}>Target NPM (%)</label>
          <input
            type="number"
            value={targetNpm}
            min={0}
            max={100}
            onChange={(e) => setTargetNpm(Number(e.target.value))}
            className="ch-input"
            style={{ ...numInput, width: 90 }}
            aria-label="Target NPM"
          />
        </div>
        <div style={{ fontSize: theme.font.size.xs, color: theme.colors.textSoft, maxWidth: 200 }}>
          Total fee dasar: <strong>{pct(totalFeeRate(feeRates))}</strong> dari harga jual.
        </div>
      </div>

      {/* Save / load */}
      <div style={{ display: "flex", gap: theme.spacing(3), flexWrap: "wrap", alignItems: "center", marginBottom: theme.spacing(4) }}>
        <input
          value={calcName}
          onChange={(e) => setCalcName(e.target.value)}
          placeholder="Nama campaign (mis. Flash Sale 6.6)"
          className="ch-input"
          style={{ ...numInput, textAlign: "left", width: 240 }}
          aria-label="Nama campaign"
        />
        <button className="ch-clickable" onClick={onSave} disabled={!calcName.trim()} style={{ ...primaryBtn, opacity: calcName.trim() ? 1 : 0.5 }}>
          Simpan Campaign
        </button>
        {savedCalcs.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: theme.font.size.sm, color: theme.colors.textMuted }}>Tersimpan:</span>
            {savedCalcs.map((c) => (
              <span key={c.id} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: theme.colors.surfaceAlt, borderRadius: 999, padding: "3px 6px 3px 12px", fontSize: theme.font.size.sm }}>
                <button className="ch-clickable" onClick={() => onLoad(c)} style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, color: theme.colors.primary }}>
                  {c.name}
                </button>
                <button onClick={() => deleteCalc(c.id)} aria-label={`Hapus ${c.name}`} style={{ border: "none", background: "transparent", cursor: "pointer", color: theme.colors.danger, fontSize: 14 }}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: theme.spacing(3), flexWrap: "wrap", marginBottom: theme.spacing(4) }}>
        <Stat label="Produk" value={`${summary.productCount}`} />
        <Stat label="Approve" value={`${summary.approvedCount}/${summary.productCount}`} tone="success" />
        <Stat label="Rata-rata NPM" value={pct(summary.avgNpmPct)} tone={summary.avgNpmPct >= target ? "success" : "danger"} />
        <Stat label="Total NPM" value={`Rp ${fmt0(summary.totalNpm)}`} />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: theme.font.size.sm, whiteSpace: "nowrap" }}>
          <thead>
            <tr style={{ background: theme.colors.surfaceAlt, color: theme.colors.textMuted }}>
              <th style={thc}></th>
              <th style={{ ...thc, textAlign: "left" }}>Produk</th>
              <th style={thc}>Kat</th>
              <th style={thNum}>HPP</th>
              <th style={thNum}>Harga Jual</th>
              {showDetail && (
                <>
                  <th style={thNum}>Admin</th>
                  <th style={thNum}>Shipping</th>
                  <th style={thNum}>Promo Xtra</th>
                  <th style={thNum}>Fee/Order</th>
                  <th style={thNum}>Promosi</th>
                  <th style={thNum}>Marketing</th>
                  <th style={thNum}>Ads</th>
                  <th style={thNum}>Affiliate</th>
                  <th style={thNum}>Operating</th>
                </>
              )}
              <th style={thNum}>Diskon %</th>
              <th style={thNum}>Campaign Fee</th>
              <th style={thNum}>Margin %</th>
              <th style={thNum}>NPM (Rp)</th>
              <th style={thNum}>NPM %</th>
              <th style={thc}>Approve</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, effDiscount, calc }, i) => {
              const inc = included.has(product.id);
              return (
                <tr key={product.id} className="ch-row" style={{ borderTop: `1px solid ${theme.colors.border}`, opacity: inc ? 1 : 0.45 }}>
                  <td style={tdc}>
                    <input type="checkbox" checked={inc} onChange={() => toggle(product.id)} aria-label={`Sertakan ${product.name}`} />
                  </td>
                  <td style={{ ...tdc, textAlign: "left", fontWeight: 600 }}>
                    <span style={{ color: theme.colors.textSoft, marginRight: 6 }}>{i + 1}.</span>
                    {product.name}
                  </td>
                  <td style={tdc}>{CATEGORY_LABELS[product.category]}</td>
                  <td style={tdNum}>{fmt0(product.hpp)}</td>
                  <td style={tdNum}>{fmt0(product.hargaJual)}</td>
                  {showDetail && (
                    <>
                      <td style={tdNum}>{fmt0(calc.fees.admin)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.shipping)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.promoXtra)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.feePerOrder)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.promosi)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.marketing)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.ads)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.affiliate)}</td>
                      <td style={tdNum}>{fmt0(calc.fees.operating)}</td>
                    </>
                  )}
                  <td style={tdNum}>
                    <input
                      type="number"
                      value={effDiscount}
                      min={0}
                      max={90}
                      onChange={(e) => setRowDiscount((prev) => ({ ...prev, [product.id]: Number(e.target.value) }))}
                      className="ch-input"
                      style={{ ...numInput, width: 56 }}
                      aria-label={`Diskon ${product.name}`}
                    />
                  </td>
                  <td style={tdNum}>{fmt0(calc.fees.campaignFee)}</td>
                  <td style={tdNum}>{pct(calc.marginPct)}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: calc.npmValue < 0 ? theme.colors.danger : theme.colors.text }}>{fmt0(calc.npmValue)}</td>
                  <td style={{ ...tdNum, fontWeight: 700, color: calc.npmPct >= target ? theme.colors.success : theme.colors.danger }}>{pct(calc.npmPct)}</td>
                  <td style={tdc}>
                    <span style={{ background: calc.approved ? theme.colors.successSoft : theme.colors.dangerSoft, color: calc.approved ? theme.colors.success : theme.colors.danger, borderRadius: 999, padding: "2px 9px", fontSize: theme.font.size.xs, fontWeight: 700 }}>
                      {calc.approved ? "Approve" : "Reject"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: theme.spacing(3), fontSize: theme.font.size.xs, color: theme.colors.textSoft }}>
        Import CSV master untuk ganti daftar produk · "Edit rate fee" untuk ubah persentase · Simpan beberapa skema campaign · Export hasil ke CSV.
      </div>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "danger" }) {
  const fg = tone === "success" ? theme.colors.success : tone === "danger" ? theme.colors.danger : theme.colors.text;
  const bg = tone === "success" ? theme.colors.successSoft : tone === "danger" ? theme.colors.dangerSoft : theme.colors.surfaceAlt;
  return (
    <div style={{ background: bg, borderRadius: theme.radius.md, padding: "8px 14px", minWidth: 110 }}>
      <div style={{ fontSize: theme.font.size.xs, color: theme.colors.textMuted }}>{label}</div>
      <div style={{ fontSize: theme.font.size.lg, fontWeight: 800, color: fg }}>{value}</div>
    </div>
  );
}

const ghost: CSSProperties = { borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.border}`, background: theme.colors.surface, cursor: "pointer", fontSize: theme.font.size.sm, fontWeight: 600, color: theme.colors.textMuted, padding: "7px 12px" };
const primaryBtn: CSSProperties = { borderRadius: theme.radius.sm, border: "none", background: theme.colors.primary, color: "#fff", cursor: "pointer", fontSize: theme.font.size.sm, fontWeight: 600, padding: "8px 14px" };
const ctrlLabel: CSSProperties = { display: "block", fontSize: theme.font.size.sm, color: theme.colors.textMuted, fontWeight: 600, marginBottom: 6 };
const numInput: CSSProperties = { padding: "6px 8px", borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.borderStrong}`, fontSize: theme.font.size.sm, textAlign: "right", background: theme.colors.surface };
const thc: CSSProperties = { padding: "9px 8px", fontWeight: 600, fontSize: theme.font.size.xs, textTransform: "uppercase", letterSpacing: "0.03em", textAlign: "center" };
const thNum: CSSProperties = { ...thc, textAlign: "right" };
const tdc: CSSProperties = { padding: "8px", textAlign: "center" };
const tdNum: CSSProperties = { padding: "8px", textAlign: "right" };
