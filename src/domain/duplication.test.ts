import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { duplicate } from "./duplication.js";
import { campaignArb, timestampArb } from "./testArbitraries.js";
import { Campaign, COPY_MARKER, DUPLICATE_NAME_MAX } from "./types.js";

/**
 * Property-based tests for Duplikasi Campaign (Requirement 8).
 *
 * Properties 31-33 cover: that duplication copies the scheme with a copy
 * marker and starts at status Menunggu (8.1), that the duplicate is an
 * independent deep copy of the source (8.2), and that name truncation keeps
 * the copy marker while staying within 200 characters (8.5).
 */

/**
 * A Campaign whose name can be much longer than the 100-char scheme bound, so
 * the duplicate-name truncation path (Requirement 8.5) is exercised. Built on
 * top of campaignArb by overriding the top-level name with a long string.
 */
const longNameCampaignArb: fc.Arbitrary<Campaign> = fc
  .tuple(campaignArb, fc.string({ minLength: 0, maxLength: 260 }))
  .map(([campaign, longName]) => ({ ...campaign, name: longName }));

describe("duplication.duplicate", () => {
  // Feature: campaign-manager, Property 31: Duplikasi menyalin skema dengan penanda salinan dan status Menunggu
  // Validates: Requirements 8.1
  it("Property 31: Duplikasi menyalin skema dengan penanda salinan dan status Menunggu", () => {
    fc.assert(
      fc.property(campaignArb, timestampArb, (source, now) => {
        const copy = duplicate(source, now);

        // Status is always Menunggu (Req 8.1).
        expect(copy.status).toBe("Menunggu");

        // Scheme values (category, promo options, target stores, date range)
        // equal the source by value.
        expect(copy.category).toBe(source.category);
        expect(copy.timelineStart).toBe(source.timelineStart);
        expect(copy.timelineEnd).toBe(source.timelineEnd);
        expect(copy.targetStoreIds).toEqual(source.targetStoreIds);
        expect(copy.scheme.promoOptions).toEqual(source.scheme.promoOptions);
        expect(copy.scheme.category).toBe(source.scheme.category);
        expect(copy.scheme.targetStoreIds).toEqual(
          source.scheme.targetStoreIds,
        );
        expect(copy.scheme.timelineStart).toBe(source.scheme.timelineStart);
        expect(copy.scheme.timelineEnd).toBe(source.scheme.timelineEnd);

        // Name is the copy marker followed by the source name (subject to the
        // truncation tested separately in Property 33).
        const expectedName = `${COPY_MARKER}${source.name}`.slice(
          0,
          DUPLICATE_NAME_MAX,
        );
        expect(copy.name).toBe(expectedName);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 32: Campaign hasil duplikasi independen dari sumber
  // Validates: Requirements 8.2
  it("Property 32: Campaign hasil duplikasi independen dari sumber", () => {
    fc.assert(
      fc.property(campaignArb, timestampArb, (source, now) => {
        const copy = duplicate(source, now);

        const sourcePromoSnapshot = source.scheme.promoOptions.map((p) => ({
          ...p,
        }));
        const sourceStoresSnapshot = [...source.targetStoreIds];
        const sourceSchemeStoresSnapshot = [...source.scheme.targetStoreIds];

        // Mutating the copy's scheme/promo/stores must not change the source.
        copy.scheme.promoOptions.push({
          id: "extra",
          label: "extra",
          discountPct: 50,
        });
        if (copy.scheme.promoOptions.length > 0) {
          copy.scheme.promoOptions[0] = {
            ...copy.scheme.promoOptions[0],
            discountPct: 99,
          };
        }
        copy.scheme.targetStoreIds.push("copy-store");
        copy.targetStoreIds.push("copy-store-top");
        copy.scheme.category = "Lokal";

        expect(source.scheme.promoOptions).toEqual(sourcePromoSnapshot);
        expect(source.targetStoreIds).toEqual(sourceStoresSnapshot);
        expect(source.scheme.targetStoreIds).toEqual(
          sourceSchemeStoresSnapshot,
        );

        // And the reverse: mutating the source must not change the copy.
        const copyPromoSnapshot = copy.scheme.promoOptions.map((p) => ({
          ...p,
        }));
        source.scheme.promoOptions.push({
          id: "src-extra",
          label: "src-extra",
          discountPct: 10,
        });
        source.targetStoreIds.push("src-store");
        expect(copy.scheme.promoOptions).toEqual(copyPromoSnapshot);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 33: Pemotongan nama duplikasi mempertahankan penanda salinan
  // Validates: Requirements 8.5
  it("Property 33: Pemotongan nama duplikasi mempertahankan penanda salinan", () => {
    fc.assert(
      fc.property(longNameCampaignArb, timestampArb, (source, now) => {
        const copy = duplicate(source, now);

        // Result name never exceeds the 200-char limit (Req 8.5).
        expect(copy.name.length).toBeLessThanOrEqual(DUPLICATE_NAME_MAX);

        // And the copy marker is preserved at the start of the name.
        expect(copy.name.startsWith(COPY_MARKER)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
