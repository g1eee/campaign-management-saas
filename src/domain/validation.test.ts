import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  canAddPromoOption,
  isSchemeValid,
  newCampaignFromScheme,
  previewFor,
  validateScheme,
} from "./validation.js";
import { CampaignScheme, MAX_PROMO_OPTIONS } from "./types.js";
import { promoOptionArb, validSchemeArb } from "./testArbitraries.js";

// An arbitrary scheme that may be valid or invalid in various ways.
const arbitrarySchemeArb: fc.Arbitrary<CampaignScheme> = fc.record({
  name: fc.string({ maxLength: 120 }),
  category: fc.option(
    fc.constantFrom("FlashSale", "BrandDay", "Payday") as fc.Arbitrary<
      CampaignScheme["category"]
    >,
    { nil: null },
  ),
  timelineStart: fc.option(fc.integer({ min: 0, max: 1_000_000 }), {
    nil: null,
  }),
  timelineEnd: fc.option(fc.integer({ min: 0, max: 1_000_000 }), { nil: null }),
  targetStoreIds: fc.array(fc.uuid(), { maxLength: 5 }),
  promoOptions: fc.array(promoOptionArb, { maxLength: 25 }),
  baseRevenue: fc.double({ min: 0, max: 10000, noNaN: true }),
  baseCost: fc.double({ min: 0, max: 10000, noNaN: true }),
  additionalCosts: fc.double({ min: 0, max: 10000, noNaN: true }),
});

function manualValid(s: CampaignScheme): boolean {
  if (s.name.trim().length < 1 || s.name.length > 100) return false;
  if (s.category === null) return false;
  if (s.timelineStart === null || s.timelineEnd === null) return false;
  if (s.timelineEnd < s.timelineStart) return false;
  if (s.targetStoreIds.length < 1) return false;
  if (s.promoOptions.length < 1 || s.promoOptions.length > MAX_PROMO_OPTIONS)
    return false;
  for (const p of s.promoOptions) {
    if (!Number.isInteger(p.discountPct)) return false;
    if (p.discountPct < 0 || p.discountPct > 100) return false;
  }
  return true;
}

describe("validation", () => {
  // Feature: campaign-hub, Property 22: Acceptance iff all constraints satisfied, with complete violation reporting
  it("Property 22: acceptance iff all constraints satisfied", () => {
    fc.assert(
      fc.property(arbitrarySchemeArb, (scheme) => {
        const violations = validateScheme(scheme);
        const accepted = violations.length === 0;
        expect(accepted).toBe(manualValid(scheme));
        // When rejected, every violation names a field and a reason.
        for (const v of violations) {
          expect(v.field.length).toBeGreaterThan(0);
          expect(v.reason.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 23: New valid scheme starts at Menunggu / BuatSkema
  it("Property 23: new valid scheme starts at Menunggu / BuatSkema", () => {
    fc.assert(
      fc.property(validSchemeArb, (scheme) => {
        const c = newCampaignFromScheme(scheme, 1000);
        expect(c.status).toBe("Menunggu");
        expect(c.step).toBe("BuatSkema");
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 24: Promo option count never exceeds twenty
  it("Property 24: promo option count never exceeds twenty", () => {
    fc.assert(
      fc.property(validSchemeArb, (scheme) => {
        // valid scheme always within 1..20
        expect(scheme.promoOptions.length).toBeGreaterThanOrEqual(1);
        expect(scheme.promoOptions.length).toBeLessThanOrEqual(MAX_PROMO_OPTIONS);
        for (const p of scheme.promoOptions) {
          expect(Number.isInteger(p.discountPct)).toBe(true);
          expect(p.discountPct).toBeGreaterThanOrEqual(0);
          expect(p.discountPct).toBeLessThanOrEqual(100);
        }
        // canAddPromoOption is false exactly when already at the max
        const full: CampaignScheme = {
          ...scheme,
          promoOptions: Array.from({ length: MAX_PROMO_OPTIONS }, (_, i) => ({
            id: String(i),
            label: "x",
            discountPct: 10,
          })),
        };
        expect(canAddPromoOption(full)).toBe(false);
        expect(isSchemeValid(full)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 25: Real-time preview is a pure function of current values
  it("Property 25: preview is a pure function of current values", () => {
    fc.assert(
      fc.property(validSchemeArb, (scheme) => {
        const a = previewFor(scheme);
        const b = previewFor({
          ...scheme,
          promoOptions: scheme.promoOptions.map((p) => ({ ...p })),
        });
        expect(a).toEqual(b);
      }),
      { numRuns: 100 },
    );
  });

  it("rejects 21 promo options", () => {
    fc.assert(
      fc.property(validSchemeArb, (scheme) => {
        const over: CampaignScheme = {
          ...scheme,
          promoOptions: Array.from({ length: 21 }, (_, i) => ({
            id: String(i),
            label: "x",
            discountPct: 5,
          })),
        };
        expect(isSchemeValid(over)).toBe(false);
      }),
      { numRuns: 30 },
    );
  });
});
