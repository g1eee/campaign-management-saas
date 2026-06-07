import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { searchCampaigns } from "./search.js";
import { campaignArb, searchScenarioArb } from "./testArbitraries.js";
import { SEARCH_MAX } from "./types.js";

describe("search (campaign-manager)", () => {
  // Feature: campaign-manager, Property 38: Pencarian gabungan teks dan kategori
  // Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
  it("Feature: campaign-manager, Property 38: Pencarian gabungan teks dan kategori", () => {
    fc.assert(
      fc.property(searchScenarioArb, ({ campaigns, criteria }) => {
        const trimmed = (criteria.text ?? "").trim();
        const result = searchCampaigns(campaigns, criteria);

        // Text whose trimmed length exceeds the limit is rejected and is the
        // subject of Property 39; here we only assert it fails so the combined
        // filter semantics below apply to valid (<= 100) queries.
        if (trimmed.length > SEARCH_MAX) {
          expect(result.ok).toBe(false);
          return;
        }

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        // Independently reproduce the spec semantics: a campaign matches iff
        // (trimmed text is empty OR its name contains the text as a
        // case-insensitive substring) AND (no category is selected OR its
        // category equals the selected one). Empty criteria therefore returns
        // every campaign (Req 11.4) and whitespace-only text applies only the
        // category filter (Req 11.5).
        const textActive = trimmed.length > 0;
        const needle = trimmed.toLowerCase();
        const expected = campaigns.filter((c) => {
          const nameMatches =
            !textActive || c.name.toLowerCase().includes(needle);
          const categoryMatches =
            criteria.category === undefined || c.category === criteria.category;
          return nameMatches && categoryMatches;
        });

        expect(result.matched).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 39: Teks pencarian melebihi 100 karakter ditolak
  // Validates: Requirements 11.6
  it("Feature: campaign-manager, Property 39: Teks pencarian melebihi 100 karakter ditolak", () => {
    // Search text whose trimmed length is strictly greater than 100. The
    // contiguous block of non-space characters guarantees the trimmed length
    // stays above the limit regardless of surrounding whitespace.
    const overLimitTextArb = fc
      .tuple(fc.integer({ min: 101, max: 130 }), fc.string({ maxLength: 8 }))
      .map(([n, pad]) => pad + "x".repeat(n) + pad);

    fc.assert(
      fc.property(
        fc.array(campaignArb, { maxLength: 20 }),
        overLimitTextArb,
        fc.option(
          fc.constantFrom(
            "Flash Sale",
            "Brand Day",
            "Payday",
            "Mega Bonus",
            "Weekend",
            "Lokal",
          ),
          { nil: undefined },
        ),
        (campaigns, text, category) => {
          const result = searchCampaigns(campaigns, {
            text,
            category: category as never,
          });

          // Over-limit text is rejected with an error indicating the length
          // bound, and no matched result is produced so callers keep the
          // previously displayed board unchanged (Req 11.6).
          expect(result.ok).toBe(false);
          if (result.ok) return;
          expect(typeof result.reason).toBe("string");
          expect(result.reason.length).toBeGreaterThan(0);
          expect(result).not.toHaveProperty("matched");
        },
      ),
      { numRuns: 100 },
    );
  });
});
