/**
 * Shared fast-check arbitraries for the domain core tests.
 * Not part of the production build paths; imported only by *.test.ts files.
 */

import fc from "fast-check";
import {
  Campaign,
  CampaignCategory,
  CAMPAIGN_CATEGORIES,
  CampaignScheme,
  CampaignStatus,
  CAMPAIGN_STATUSES,
  CampaignStep,
  CAMPAIGN_STEPS,
  CampaignTemplate,
  EpochMillis,
  MAX_PROMO_OPTIONS,
  PromoOption,
  StoreId,
  TEMPLATE_MAX_PROMOS,
  TEMPLATE_MAX_STORES,
} from "./types.js";
import type { AuthAttempt } from "./session.js";
import type { Command } from "./commandPalette.js";
import type { TemplateDraft } from "./template.js";

export const categoryArb = fc.constantFrom<CampaignCategory>(
  ...CAMPAIGN_CATEGORIES,
);

/** Epoch-millis timestamp within a sane (non-negative) range. */
export const timestampArb: fc.Arbitrary<EpochMillis> = fc.integer({
  min: 0,
  max: 4_000_000_000_000,
});

/** A single target-store id. */
export const storeIdArb: fc.Arbitrary<StoreId> = fc.uuid();

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

// ---------------------------------------------------------------------------
// Campaign generators (Campaign Manager pivot)
// ---------------------------------------------------------------------------

/** The five valid Campaign_Status values. */
export const knownStatusArb = fc.constantFrom<CampaignStatus>(
  ...CAMPAIGN_STATUSES,
);

/**
 * Status-like values that are NOT valid Campaign_Status, used to exercise the
 * board-view normalization to Menunggu (Requirement 2.9). Includes the empty
 * string and case/spelling variants that must be treated as unknown.
 */
export const unknownStatusArb = fc.constantFrom(
  "",
  "Arsip",
  "Unknown",
  "Draft",
  "Batal",
  "selesai", // wrong case is unknown
  "PROSES", // wrong case is unknown
);

/**
 * A Campaign status value that is mostly one of the five valid statuses but
 * occasionally an unknown value, so generators that include it can drive the
 * Requirement 2.9 normalization path. The value is cast to CampaignStatus to
 * fit the field type while still carrying unrecognized values.
 */
const campaignStatusValueArb: fc.Arbitrary<CampaignStatus> = fc.oneof(
  { weight: 6, arbitrary: knownStatusArb },
  { weight: 1, arbitrary: unknownStatusArb as fc.Arbitrary<CampaignStatus> },
);

/**
 * A full Campaign aligned with the current `Campaign` type. The scheme is a
 * valid CampaignScheme, and the top-level fields are kept consistent with it
 * (name, category, timeline, target stores). `status` includes unknown values
 * (Requirement 2.9); `step` is one of the valid steps.
 */
export const campaignArb: fc.Arbitrary<Campaign> = fc
  .record({
    id: fc.uuid(),
    scheme: validSchemeArb,
    status: campaignStatusValueArb,
    step: fc.constantFrom<CampaignStep>(...CAMPAIGN_STEPS),
    createdAt: timestampArb,
    updatedAt: timestampArb,
  })
  .map(({ id, scheme, status, step, createdAt, updatedAt }) => ({
    id,
    name: scheme.name,
    category: (scheme.category ?? "Lokal") as CampaignCategory,
    status,
    step,
    timelineStart: (scheme.timelineStart ?? 0) as EpochMillis,
    timelineEnd: (scheme.timelineEnd ?? 0) as EpochMillis,
    scheme,
    targetStoreIds: [...scheme.targetStoreIds],
    createdAt,
    updatedAt,
  }));

/**
 * A pair of (from, to) Campaign_Status values drawn from all five statuses on
 * both sides, covering same-status no-ops, valid transitions, and invalid
 * transitions for Transisi_Valid testing (Requirement 9.2).
 */
export const statusPairArb: fc.Arbitrary<{
  from: CampaignStatus;
  to: CampaignStatus;
}> = fc.record({
  from: knownStatusArb,
  to: knownStatusArb,
});

// ---------------------------------------------------------------------------
// Authentication attempt history (lockout, Requirement 1.3)
// ---------------------------------------------------------------------------

/** A single authentication attempt outcome with its timestamp. */
export const authAttemptArb: fc.Arbitrary<AuthAttempt> = fc.record({
  success: fc.boolean(),
  at: timestampArb,
});

/**
 * A sequence of authentication attempts. Length up to 12 so a run can both
 * reach and exceed the five-consecutive-failure lockout threshold and include
 * resetting successes (Requirement 1.3).
 */
export const attemptHistoryArb: fc.Arbitrary<AuthAttempt[]> = fc.array(
  authAttemptArb,
  { maxLength: 12 },
);

// ---------------------------------------------------------------------------
// Template generators (Requirement 7)
// ---------------------------------------------------------------------------

/**
 * A valid Template_Campaign within all save bounds: exactly one category,
 * 1..50 Opsi_Promo, and 1..1000 target Toko (Requirement 7.1). Store count is
 * capped well below the 1000 maximum to keep generation cheap while staying in
 * range.
 */
export const templateArb: fc.Arbitrary<CampaignTemplate> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  category: categoryArb,
  promoOptions: fc.array(promoOptionArb, {
    minLength: 1,
    maxLength: TEMPLATE_MAX_PROMOS,
  }),
  targetStoreIds: fc.array(storeIdArb, { minLength: 1, maxLength: 40 }),
  createdAt: timestampArb,
});

/**
 * A Template_Campaign draft (without createdAt) that violates exactly one save
 * constraint, so `validateTemplate` must reject it (Requirements 7.2, 7.3):
 * missing category, empty promo list, empty store list, too many promos
 * (> 50), or too many stores (> 1000).
 */
export const invalidTemplateArb: fc.Arbitrary<TemplateDraft> = fc.oneof(
  // Missing required category (Requirement 7.2).
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: fc.constant(null as unknown as CampaignCategory),
    promoOptions: fc.array(promoOptionArb, { minLength: 1, maxLength: 5 }),
    targetStoreIds: fc.array(storeIdArb, { minLength: 1, maxLength: 5 }),
  }),
  // Empty promo-option list (Requirement 7.2).
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: categoryArb,
    promoOptions: fc.constant<PromoOption[]>([]),
    targetStoreIds: fc.array(storeIdArb, { minLength: 1, maxLength: 5 }),
  }),
  // Empty target-store list (Requirement 7.2).
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: categoryArb,
    promoOptions: fc.array(promoOptionArb, { minLength: 1, maxLength: 5 }),
    targetStoreIds: fc.constant<StoreId[]>([]),
  }),
  // Too many promo options, > 50 (Requirement 7.3).
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: categoryArb,
    promoOptions: fc.array(promoOptionArb, {
      minLength: TEMPLATE_MAX_PROMOS + 1,
      maxLength: TEMPLATE_MAX_PROMOS + 5,
    }),
    targetStoreIds: fc.array(storeIdArb, { minLength: 1, maxLength: 5 }),
  }),
  // Too many target stores, > 1000 (Requirement 7.3).
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    category: categoryArb,
    promoOptions: fc.array(promoOptionArb, { minLength: 1, maxLength: 5 }),
    targetStoreIds: fc.array(storeIdArb, {
      minLength: TEMPLATE_MAX_STORES + 1,
      maxLength: TEMPLATE_MAX_STORES + 3,
    }),
  }),
);

// ---------------------------------------------------------------------------
// Bulk-action selections (Requirement 10)
// ---------------------------------------------------------------------------

/**
 * A selection of Campaigns for bulk-action testing. Size ranges from 0 up to
 * 105 so selections both inside the 1..100 bound and outside it (empty or
 * over-limit) are exercised (Requirements 10.7, 10.8).
 */
export const selectionArb: fc.Arbitrary<Campaign[]> = fc.array(campaignArb, {
  minLength: 0,
  maxLength: 105,
});

// ---------------------------------------------------------------------------
// Search scenarios (Requirement 11)
// ---------------------------------------------------------------------------

/**
 * Search text variants: ordinary short text, whitespace-only (ignored,
 * Requirement 11.5), and text whose trimmed length exceeds the 100-character
 * limit so rejection is exercised (Requirement 11.6).
 */
const searchTextArb: fc.Arbitrary<string> = fc.oneof(
  fc.string({ maxLength: 20 }),
  fc.constantFrom("", "   ", "\t \n"),
  fc.string({ minLength: 101, maxLength: 130 }),
);

/**
 * A search scenario: a list of Campaigns plus search criteria with an optional
 * text query and an optional Campaign_Category filter (Requirement 11).
 */
export const searchScenarioArb: fc.Arbitrary<{
  campaigns: Campaign[];
  criteria: { text?: string; category?: CampaignCategory };
}> = fc.record({
  campaigns: fc.array(campaignArb, { maxLength: 20 }),
  criteria: fc.record(
    {
      text: searchTextArb,
      category: categoryArb,
    },
    { requiredKeys: [] },
  ),
});

// ---------------------------------------------------------------------------
// Command palette (Requirement 12)
// ---------------------------------------------------------------------------

/** A single Palet_Perintah command with a no-op `run`. */
export const commandArb: fc.Arbitrary<Command> = fc.record({
  id: fc.uuid(),
  label: fc.string({ maxLength: 30 }),
  run: fc.constant(() => {}),
});

/**
 * A list of commands, sized up to 60 so the empty-query cap of 50 visible
 * commands can be exercised (Requirement 12.2) alongside label filtering.
 */
export const commandListArb: fc.Arbitrary<Command[]> = fc.array(commandArb, {
  maxLength: 60,
});
