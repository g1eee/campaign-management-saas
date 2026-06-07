import { describe, expect, it } from "vitest";
import {
  buildCampaignCsv,
  parseCsv,
  parseIdNumber,
  parseProductsCsv,
  normalizeCategory,
} from "./csv.js";
import { calcLine, DEFAULT_FEE_RATES, Product } from "./productCalc.js";

describe("csv", () => {
  it("tokenizes quoted fields containing commas", () => {
    const rows = parseCsv('a,"b,c",d\n1,"2,5",3');
    expect(rows[0]).toEqual(["a", "b,c", "d"]);
    expect(rows[1]).toEqual(["1", "2,5", "3"]);
  });

  it("parses Indonesian thousands format", () => {
    expect(parseIdNumber("46.014")).toBe(46014);
    expect(parseIdNumber("Rp 19.800")).toBe(19800);
    expect(parseIdNumber("")).toBeNaN();
  });

  it("normalizes categories", () => {
    expect(normalizeCategory("hjb")).toBe("hjb");
    expect(normalizeCategory("dress/bls")).toBe("dress/bls");
    expect(normalizeCategory("Acs")).toBe("Acs");
    expect(normalizeCategory("mkn")).toBe("mkn");
    expect(normalizeCategory("inner")).toBe("inner");
    expect(normalizeCategory("misterius")).toBe("hjb");
  });

  it("parses the master sheet sample, skipping headers", () => {
    const csv = [
      ",Nama Produk,Kategori,HPP,Harga Jual,Admin Fee",
      ',,,,,"8,3%"',
      "1, Alea Hijab, hjb,7.000,19.800,1634",
      "2, Alifa, hjb,11.000,32.700,2698",
      "20, Azizah Dress L, dress/bls,46.014,138.500,11426",
    ].join("\n");
    const result = parseProductsCsv(csv);
    expect(result.parsed).toBe(3);
    expect(result.skipped).toBe(2);
    expect(result.products[0]).toMatchObject({
      name: "Alea Hijab",
      category: "hjb",
      hpp: 7000,
      hargaJual: 19800,
    });
    expect(result.products[2]).toMatchObject({
      name: "Azizah Dress L",
      category: "dress/bls",
      hpp: 46014,
      hargaJual: 138500,
    });
  });

  it("round-trips a built campaign CSV through the parser", () => {
    const products: Product[] = [
      { id: "1", name: "Alea Hijab", category: "hjb", hpp: 7000, hargaJual: 19800 },
      { id: "2", name: "Komma, Test", category: "Acs", hpp: 500, hargaJual: 5000 },
    ];
    const rows = products.map((p) => ({ product: p, calc: calcLine(p, DEFAULT_FEE_RATES, 0, 0.15) }));
    const csv = buildCampaignCsv(rows);
    const parsed = parseCsv(csv);
    expect(parsed[0][0]).toBe("No");
    // the field containing a comma must survive tokenization
    expect(parsed[2][1]).toBe("Komma, Test");
    // NPM column present
    expect(parsed[1][17]).toBe("4838");
  });
});
