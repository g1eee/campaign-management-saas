/**
 * Shared fast-check arbitraries for the domain core tests.
 * Not part of the production build paths; imported only by *.test.ts files.
 */

import fc from "fast-check";
import {
  CampaignCategory,
  CAMPAIGN_CATEGORIES,
  CampaignScheme,
  MAX_PROMO_OPTIONS,
  PromoOption,
} from "./types.js";

export const categoryArb = fc.constantFrom<CampaignCategory>(
  ...CAMPAIGN_CATEGORIES,
);

export const promoOptionArb: fc.Arbitrary<PromoOption> = fc.record({
  id: fc.uuid(),
  label: fc.string(),
  discountPct: fc.integer({ min: 0, max: 100 }),
});

/** A scheme that satisfies all validation constraints. */
export const validSchemeArb: fc.Arbitrary<CampaignScheme> = fc
  .record({
    name: fc
      .string({ minLength: 1, maxLength: 100 })
      .filter((s) => s.trim().length >= 1),
    category: categoryArb,
    start: fc.integer({ min: 0, max: 4_000_000_000_000 }),
    duration: fc.integer({ min: 0, max: 1_000_000_000 }),
    targetStoreIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 10 }),
    promoOptions: fc.array(promoOptionArb, {
      minLength: 1,
      maxLength: MAX_PROMO_OPTIONS,
    }),
    baseRevenue: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    baseCost: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
    additionalCosts: fc.double({ min: 0, max: 1_000_000, noNaN: true }),
  })
  .map((r) => ({
    name: r.name,
    category: r.category,
    timelineStart: r.start,
    timelineEnd: r.start + r.duration,
    targetStoreIds: r.targetStoreIds,
    promoOptions: r.promoOptions,
    baseRevenue: r.baseRevenue,
    baseCost: r.baseCost,
    additionalCosts: r.additionalCosts,
  }));
