import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  calcLine,
  campaignFeeFromDiscount,
  DEFAULT_FEE_RATES,
  LineFees,
  Product,
  ProductCategory,
  summarize,
  totalFeeRate,
} from "./productCalc.js";

const productArb: fc.Arbitrary<Product> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 10 }),
  category: fc.constantFrom<ProductCategory>("hjb", "inner", "dress/bls", "Acs", "mkn"),
  hpp: fc.integer({ min: 0, max: 200_000 }),
  hargaJual: fc.integer({ min: 1, max: 300_000 }),
});

function sumFees(f: LineFees): number {
  return (
    f.admin + f.shipping + f.promoXtra + f.feePerOrder + f.campaignFee +
    f.promosi + f.marketing + f.ads + f.affiliate + f.operating
  );
}

describe("productCalc", () => {
  it("total fee rate matches the master data (≈ 40.21%)", () => {
    expect(totalFeeRate(DEFAULT_FEE_RATES)).toBeCloseTo(0.4021, 4);
  });

  it("reproduces the master-data sample row (Alea Hijab)", () => {
    const alea: Product = { id: "alea", name: "Alea Hijab", category: "hjb", hpp: 7000, hargaJual: 19800 };
    const line = calcLine(alea, DEFAULT_FEE_RATES, 0, 0.15);
    expect(line.fees.admin).toBe(1634);
    expect(line.fees.shipping).toBe(1089);
    expect(line.fees.ads).toBe(1584);
    expect(line.fees.affiliate).toBe(388);
    expect(line.totalFees).toBe(7962);
    expect(line.marginValue).toBe(12800);
    expect(line.npmValue).toBe(4838);
    expect(line.npmPct).toBeCloseTo(0.244, 3);
  });

  // NPM value is always selling price minus HPP minus the total fees.
  it("NPM equals price - HPP - totalFees for any input", () => {
    fc.assert(
      fc.property(
        productArb,
        fc.integer({ min: 0, max: 100_000 }),
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (product, campaignFee, target) => {
          const line = calcLine(product, DEFAULT_FEE_RATES, campaignFee, target);
          expect(sumFees(line.fees)).toBe(line.totalFees);
          expect(line.npmValue).toBe(product.hargaJual - product.hpp - line.totalFees);
          expect(line.marginValue).toBe(product.hargaJual - product.hpp);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Approval holds iff the resulting NPM ratio meets the target.
  it("approves iff npmPct >= target", () => {
    fc.assert(
      fc.property(
        productArb,
        fc.integer({ min: 0, max: 100_000 }),
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (product, campaignFee, target) => {
          const line = calcLine(product, DEFAULT_FEE_RATES, campaignFee, target);
          expect(line.approved).toBe(line.npmPct >= target);
        },
      ),
      { numRuns: 100 },
    );
  });

  // A larger campaign fee never increases NPM (monotonicity).
  it("higher campaign fee never increases NPM", () => {
    fc.assert(
      fc.property(
        productArb,
        fc.integer({ min: 0, max: 50_000 }),
        fc.integer({ min: 0, max: 50_000 }),
        (product, a, b) => {
          const lo = Math.min(a, b);
          const hi = Math.max(a, b);
          const npmLo = calcLine(product, DEFAULT_FEE_RATES, lo, 0.15).npmValue;
          const npmHi = calcLine(product, DEFAULT_FEE_RATES, hi, 0.15).npmValue;
          expect(npmHi).toBeLessThanOrEqual(npmLo);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("campaignFeeFromDiscount computes a percentage of the selling price", () => {
    expect(campaignFeeFromDiscount(20000, 10)).toBe(2000);
    expect(campaignFeeFromDiscount(19800, 0)).toBe(0);
  });

  it("summarize aggregates counts and totals", () => {
    const products: Product[] = [
      { id: "1", name: "A", category: "hjb", hpp: 7000, hargaJual: 19800 },
      { id: "2", name: "B", category: "Acs", hpp: 500, hargaJual: 5000 },
    ];
    const lines = products.map((p) => calcLine(p, DEFAULT_FEE_RATES, 0, 0.15));
    const s = summarize(lines);
    expect(s.productCount).toBe(2);
    expect(s.approvedCount).toBe(lines.filter((l) => l.approved).length);
    expect(s.totalNpm).toBe(lines[0].npmValue + lines[1].npmValue);
  });
});
