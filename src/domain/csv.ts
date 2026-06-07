/**
 * CSV utilities (pure).
 *
 * - parseCsv: a small RFC-4180-ish tokenizer (handles quoted fields & commas).
 * - parseProductsCsv: reads the team's master sheet into Product records.
 * - buildCampaignCsv: exports the campaign calculation result as CSV.
 */

import { LineCalc, Product, ProductCategory } from "./productCalc.js";

/** Tokenizes CSV text into rows of string fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore (handles CRLF)
    } else {
      field += ch;
    }
  }
  // flush trailing field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Parses an Indonesian-formatted number ("46.014", "Rp 19.800") to an integer. */
export function parseIdNumber(raw: string): number {
  const digits = (raw ?? "").replace(/[^0-9-]/g, "");
  if (digits === "" || digits === "-") return NaN;
  return parseInt(digits, 10);
}

/** Normalizes a free-text category to a known ProductCategory. */
export function normalizeCategory(raw: string): ProductCategory {
  const c = (raw ?? "").toLowerCase().trim();
  if (c.includes("dress") || c.includes("bls") || c.includes("blou")) return "dress/bls";
  if (c.includes("inner")) return "inner";
  if (c.includes("mkn") || c.includes("mukena")) return "mkn";
  if (c.includes("acs") || c.includes("aks")) return "Acs";
  return "hjb";
}

export interface ParseProductsResult {
  products: Product[];
  parsed: number;
  skipped: number;
}

/**
 * Reads master-sheet CSV into products. Expected leading columns:
 * [index, Nama Produk, Kategori, HPP, Harga Jual, ...]. Rows whose first
 * column is not a number, or whose name/price are missing, are skipped
 * (header rows, blanks).
 */
export function parseProductsCsv(text: string): ParseProductsResult {
  const rows = parseCsv(text);
  const products: Product[] = [];
  let skipped = 0;
  let seq = 0;

  for (const fields of rows) {
    const idx = (fields[0] ?? "").trim();
    const name = (fields[1] ?? "").trim();
    const hpp = parseIdNumber(fields[3] ?? "");
    const harga = parseIdNumber(fields[4] ?? "");

    const isDataRow = /^\d+$/.test(idx) && name.length > 0 && harga > 0 && !Number.isNaN(hpp);
    if (!isDataRow) {
      skipped++;
      continue;
    }
    products.push({
      id: `imp-${seq++}`,
      name,
      category: normalizeCategory(fields[2] ?? ""),
      hpp,
      hargaJual: harga,
    });
  }

  return { products, parsed: products.length, skipped };
}

function esc(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CATEGORY_OUT: Record<ProductCategory, string> = {
  hjb: "hjb",
  inner: "inner",
  "dress/bls": "dress/bls",
  Acs: "Acs",
  mkn: "mkn",
};

export interface CampaignCsvRow {
  product: Product;
  calc: LineCalc;
}

/** Builds a CSV export of the campaign calculation result. */
export function buildCampaignCsv(rows: CampaignCsvRow[]): string {
  const header = [
    "No", "Nama Produk", "Kategori", "HPP", "Harga Jual",
    "Admin Fee", "Shipping Fee", "Promo Xtra", "Fee/pesanan", "Campaign Fee",
    "Promosi Fee", "Marketing Fee", "Ads Spending", "Affiliate", "Operating Cost",
    "Margin", "%Margin", "NPM", "%NPM", "Approve",
  ];
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = [header.map(esc).join(",")];

  rows.forEach((r, i) => {
    const { product, calc } = r;
    const f = calc.fees;
    const cells = [
      String(i + 1),
      product.name,
      CATEGORY_OUT[product.category],
      String(product.hpp),
      String(product.hargaJual),
      String(f.admin),
      String(f.shipping),
      String(f.promoXtra),
      String(f.feePerOrder),
      String(f.campaignFee),
      String(f.promosi),
      String(f.marketing),
      String(f.ads),
      String(f.affiliate),
      String(f.operating),
      String(calc.marginValue),
      pct(calc.marginPct),
      String(calc.npmValue),
      pct(calc.npmPct),
      calc.approved ? "Approve" : "Reject",
    ];
    lines.push(cells.map(esc).join(","));
  });

  return lines.join("\n");
}
