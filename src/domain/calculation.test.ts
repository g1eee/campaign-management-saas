import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { calculate, SchemeInputs } from "./calculation.js";

const inputsArb: fc.Arbitrary<SchemeInputs> = fc.record({
  baseRevenue: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
  baseCost: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
  additionalCosts: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
  discountPcts: fc.array(fc.integer({ min: 0, max: 100 }), { maxLength: 20 }),
});

function effectiveRevenue(i: SchemeInputs): number {
  const total = Math.min(
    100,
    i.discountPcts.reduce((s, p) => s + p, 0),
  );
  return i.baseRevenue * (1 - total / 100);
}

describe("calculation", () => {
  // Feature: campaign-hub, Property 19: Calculation matches the cost/margin/NPM formula
  it("Property 19: calculation matches the cost/margin/NPM formula", () => {
    fc.assert(
      fc.property(inputsArb, (i) => {
        const r = calculate(i);
        const eff = effectiveRevenue(i);
        const promoCost = i.baseRevenue - eff;
        const expectedTotalCost = i.baseCost + i.additionalCosts + promoCost;
        const expectedMargin = eff - expectedTotalCost;

        expect(r.totalCost).toBeCloseTo(expectedTotalCost, 6);
        expect(r.margin).toBeCloseTo(expectedMargin, 6);
        if (eff > 0) {
          expect(r.npm).not.toBe("undefined");
          expect(r.npm as number).toBeCloseTo(expectedMargin / eff, 6);
        } else {
          expect(r.npm).toBe("undefined");
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 20: Calculation is deterministic (idempotent recompute)
  it("Property 20: calculation is deterministic", () => {
    fc.assert(
      fc.property(inputsArb, (i) => {
        expect(calculate(i)).toEqual(calculate(i));
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 21: Warning flag iff NPM is negative or undefined
  it("Property 21: warning flag iff NPM is negative or undefined", () => {
    fc.assert(
      fc.property(inputsArb, (i) => {
        const r = calculate(i);
        const expectedWarning = r.npm === "undefined" || (r.npm as number) < 0;
        expect(r.warning).toBe(expectedWarning);
      }),
      { numRuns: 100 },
    );
  });

  it("zero revenue yields undefined NPM with warning", () => {
    const r = calculate({
      baseRevenue: 0,
      baseCost: 10,
      additionalCosts: 5,
      discountPcts: [],
    });
    expect(r.npm).toBe("undefined");
    expect(r.warning).toBe(true);
  });
});
