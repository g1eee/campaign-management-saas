import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  addPromoOption,
  applyFieldPatch,
  canAddPromoOption,
  isSchemeValid,
  newCampaignFromScheme,
  previewFor,
  SchemePatch,
  validatePromoOption,
  validateScheme,
} from "./validation.js";
import {
  CampaignScheme,
  MAX_DISCOUNT_PCT,
  MAX_PROMO_OPTIONS,
  MIN_DISCOUNT_PCT,
  PromoOption,
} from "./types.js";
import { categoryArb, promoOptionArb, validSchemeArb } from "./testArbitraries.js";

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

// ---------------------------------------------------------------------------
// Inline field editing & Opsi_Promo (Requirements 4, 5)
// ---------------------------------------------------------------------------

/** A name that satisfies the 1..100 (trimmed) constraint. */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length >= 1);

/**
 * A SchemePatch that passes every validation rule. Each field is optional so
 * single- and multi-field patches are exercised; when the timeline is present
 * both endpoints are supplied with end >= start so the order rule holds.
 */
const validPatchArb: fc.Arbitrary<SchemePatch> = fc
  .record(
    {
      name: validNameArb,
      category: categoryArb,
      timeline: fc.record({
        start: fc.integer({ min: 0, max: 1_000_000 }),
        duration: fc.integer({ min: 0, max: 1_000_000 }),
      }),
      targetStoreIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
      promoOptions: fc.array(promoOptionArb, {
        minLength: 1,
        maxLength: MAX_PROMO_OPTIONS,
      }),
    },
    { requiredKeys: [] },
  )
  .map((r) => {
    const patch: SchemePatch = {};
    if ("name" in r) patch.name = r.name;
    if ("category" in r) patch.category = r.category;
    if ("timeline" in r) {
      patch.timelineStart = r.timeline!.start;
      patch.timelineEnd = r.timeline!.start + r.timeline!.duration;
    }
    if ("targetStoreIds" in r) patch.targetStoreIds = r.targetStoreIds;
    if ("promoOptions" in r) patch.promoOptions = r.promoOptions;
    return patch;
  });

/**
 * A SchemePatch that violates at least one validation rule: an empty/whitespace
 * name, a name longer than 100 characters, or an end date preceding the start.
 */
const invalidPatchArb: fc.Arbitrary<SchemePatch> = fc.oneof(
  fc.constantFrom("", "   ", "\t \n").map((name) => ({ name }) as SchemePatch),
  fc
    .string({ minLength: 101, maxLength: 140 })
    .map((name) => ({ name }) as SchemePatch),
  fc
    .record({
      start: fc.integer({ min: 1, max: 1_000_000 }),
      gap: fc.integer({ min: 1, max: 1_000_000 }),
    })
    .map(
      ({ start, gap }) =>
        ({
          timelineStart: start + gap,
          timelineEnd: start,
        }) as SchemePatch,
    ),
);

describe("inline editing & promo options", () => {
  // Feature: campaign-manager, Property 15: Nilai valid tersimpan pada penyuntingan inline
  it("Property 15: nilai valid tersimpan pada penyuntingan inline", () => {
    fc.assert(
      fc.property(validSchemeArb, validPatchArb, (current, patch) => {
        const result = applyFieldPatch(current, patch);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const next = result.scheme;
        // Every field present in the patch is reflected in the saved scheme.
        if ("name" in patch) expect(next.name).toBe(patch.name);
        if ("category" in patch) expect(next.category).toBe(patch.category);
        if ("timelineStart" in patch) {
          expect(next.timelineStart).toBe(patch.timelineStart);
        }
        if ("timelineEnd" in patch) {
          expect(next.timelineEnd).toBe(patch.timelineEnd);
        }
        if ("targetStoreIds" in patch) {
          expect(next.targetStoreIds).toEqual(patch.targetStoreIds);
        }
        if ("promoOptions" in patch) {
          expect(next.promoOptions).toEqual(patch.promoOptions);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 16: Nilai tidak valid ditolak dan nilai sebelumnya dipertahankan
  it("Property 16: nilai tidak valid ditolak dan nilai sebelumnya dipertahankan", () => {
    fc.assert(
      fc.property(validSchemeArb, invalidPatchArb, (current, patch) => {
        const before = structuredClone(current);
        const result = applyFieldPatch(current, patch);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.violations.length).toBeGreaterThan(0);
        }
        // The previous value is preserved: the input scheme is never mutated.
        expect(current).toEqual(before);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 17: Penambahan Opsi_Promo valid menambah satu entri
  it("Property 17: penambahan Opsi_Promo valid menambah satu entri", () => {
    const schemeUnderMaxArb = validSchemeArb.map((s) => ({
      ...s,
      promoOptions: s.promoOptions.slice(0, MAX_PROMO_OPTIONS - 1),
    }));
    fc.assert(
      fc.property(
        schemeUnderMaxArb,
        fc.integer({ min: MIN_DISCOUNT_PCT, max: MAX_DISCOUNT_PCT }),
        (scheme, discountPct) => {
          const beforeCount = scheme.promoOptions.length;
          const result = addPromoOption(scheme, discountPct);
          expect(result.ok).toBe(true);
          if (!result.ok) return;
          // Exactly one entry added, with the same discount.
          expect(result.scheme.promoOptions.length).toBe(beforeCount + 1);
          const added =
            result.scheme.promoOptions[result.scheme.promoOptions.length - 1];
          expect(added.discountPct).toBe(discountPct);
          // Input scheme is not mutated.
          expect(scheme.promoOptions.length).toBe(beforeCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 18: Penambahan Opsi_Promo pada batas 20 ditolak
  it("Property 18: penambahan Opsi_Promo pada batas 20 ditolak", () => {
    fc.assert(
      fc.property(
        validSchemeArb,
        fc.integer({ min: MIN_DISCOUNT_PCT, max: MAX_DISCOUNT_PCT }),
        (base, discountPct) => {
          const scheme: CampaignScheme = {
            ...base,
            promoOptions: Array.from(
              { length: MAX_PROMO_OPTIONS },
              (_, i): PromoOption => ({
                id: String(i),
                label: "x",
                discountPct: 10,
              }),
            ),
          };
          const result = addPromoOption(scheme, discountPct);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.reason).toContain(String(MAX_PROMO_OPTIONS));
          }
          // The promo option count is unchanged.
          expect(scheme.promoOptions.length).toBe(MAX_PROMO_OPTIONS);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 19: Validasi diskon Opsi_Promo
  it("Property 19: validasi diskon Opsi_Promo", () => {
    const discountArb = fc.oneof(
      fc.integer({ min: MIN_DISCOUNT_PCT, max: MAX_DISCOUNT_PCT }), // valid
      fc.integer({ min: MAX_DISCOUNT_PCT + 1, max: 1000 }), // above range
      fc.integer({ min: -1000, max: MIN_DISCOUNT_PCT - 1 }), // below range
      fc
        .double({ min: 0, max: 100, noNaN: true })
        .filter((x) => !Number.isInteger(x)), // non-integer
    );
    fc.assert(
      fc.property(discountArb, (discountPct) => {
        const promo: PromoOption = { id: "p", label: "l", discountPct };
        const violations = validatePromoOption(promo, 0);
        const isValid =
          Number.isInteger(discountPct) &&
          discountPct >= MIN_DISCOUNT_PCT &&
          discountPct <= MAX_DISCOUNT_PCT;
        expect(violations.length === 0).toBe(isValid);
      }),
      { numRuns: 100 },
    );
  });
});
