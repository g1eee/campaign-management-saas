import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { buildBoard } from "./boardView.js";
import {
  categoryColorOrDefault,
  NEUTRAL_CATEGORY_COLOR,
} from "./colorRegistry.js";
import {
  campaignArb,
  knownStatusArb,
  unknownStatusArb,
} from "./testArbitraries.js";
import { Campaign, CampaignCategory, CampaignStatus } from "./types.js";

/** The five valid statuses in fixed left-to-right board order (Req 2.1). */
const EXPECTED_ORDER: readonly CampaignStatus[] = [
  "Menunggu",
  "Proses",
  "Review",
  "Live",
  "Selesai",
];

/** A Campaign carrying only one of the five valid statuses. */
const knownStatusCampaignArb: fc.Arbitrary<Campaign> = fc
  .tuple(campaignArb, knownStatusArb)
  .map(([campaign, status]) => ({ ...campaign, status }));

/**
 * A Campaign whose category is NOT registered in the color registry, so the
 * neutral fallback color path is exercised (Requirement 2.5).
 */
const unregisteredCategoryCampaignArb: fc.Arbitrary<Campaign> = fc
  .tuple(
    campaignArb,
    fc.constantFrom("Diskon", "Unknown", "", "lokal", "FLASHSALE"),
  )
  .map(([campaign, category]) => ({
    ...campaign,
    category: category as CampaignCategory,
  }));

/**
 * A Campaign whose status is empty or otherwise not one of the five valid
 * values, to drive normalization to Menunggu (Requirement 2.9).
 */
const unknownStatusCampaignArb: fc.Arbitrary<Campaign> = fc
  .tuple(campaignArb, unknownStatusArb)
  .map(([campaign, status]) => ({
    ...campaign,
    status: status as CampaignStatus,
  }));

describe("boardView", () => {
  // Feature: campaign-manager, Property 7: Struktur dan penempatan kolom papan
  it("Feature: campaign-manager, Property 7: Struktur dan penempatan kolom papan", () => {
    fc.assert(
      fc.property(
        fc.array(knownStatusCampaignArb, { maxLength: 30 }),
        (campaigns) => {
          const board = buildBoard(campaigns);

          // Exactly five columns in the fixed left-to-right order (Req 2.1).
          expect(board.map((c) => c.status)).toEqual(EXPECTED_ORDER);

          // Every campaign appears as exactly one card in the column whose
          // status equals the campaign's status (Req 2.2).
          for (const campaign of campaigns) {
            const placements = board.filter((col) =>
              col.cards.some((card) => card.id === campaign.id),
            );
            expect(placements).toHaveLength(1);
            expect(placements[0].status).toBe(campaign.status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 8: Konservasi hitungan kolom
  it("Feature: campaign-manager, Property 8: Konservasi hitungan kolom", () => {
    fc.assert(
      fc.property(fc.array(campaignArb, { maxLength: 40 }), (campaigns) => {
        const board = buildBoard(campaigns);
        const total = campaigns.length;

        // Sum of column counts equals the total number of campaigns (Req 2.6).
        const sum = board.reduce((acc, col) => acc + col.count, 0);
        expect(sum).toBe(total);

        for (const col of board) {
          // Each count is within 0..total (Req 2.6).
          expect(col.count).toBeGreaterThanOrEqual(0);
          expect(col.count).toBeLessThanOrEqual(total);
          // count must match the actual number of cards.
          expect(col.count).toBe(col.cards.length);
          // A column is empty iff its count is zero (Req 2.8).
          expect(col.empty).toBe(col.count === 0);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 9: Derivasi kartu memuat seluruh field dan warna
  it("Feature: campaign-manager, Property 9: Derivasi kartu memuat seluruh field dan warna", () => {
    fc.assert(
      fc.property(campaignArb, (campaign) => {
        const board = buildBoard([campaign]);
        const card = board
          .flatMap((col) => col.cards)
          .find((c) => c.id === campaign.id);

        expect(card).toBeDefined();
        if (!card) return;

        // Name and category carried through (Req 2.3).
        expect(card.name).toBe(campaign.name);
        expect(card.category).toBe(campaign.category);
        // Promo and store counts equal the underlying list lengths (Req 2.3).
        expect(card.promoCount).toBe(campaign.scheme.promoOptions.length);
        expect(card.storeCount).toBe(campaign.targetStoreIds.length);
        // Date range matches the campaign (Req 2.3).
        expect(card.timelineStart).toBe(campaign.timelineStart);
        expect(card.timelineEnd).toBe(campaign.timelineEnd);
        // Color equals the registry category color (Req 2.4).
        expect(card.color).toBe(categoryColorOrDefault(campaign.category));
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 10: Warna default netral untuk kategori tak terdaftar
  it("Feature: campaign-manager, Property 10: Warna default netral untuk kategori tak terdaftar", () => {
    fc.assert(
      fc.property(unregisteredCategoryCampaignArb, (campaign) => {
        const board = buildBoard([campaign]);
        const card = board
          .flatMap((col) => col.cards)
          .find((c) => c.id === campaign.id);

        expect(card).toBeDefined();
        if (!card) return;

        // Unregistered categories fall back to the uniform neutral color
        // (Req 2.5).
        expect(card.color).toBe(NEUTRAL_CATEGORY_COLOR);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 11: Status kosong atau tak dikenal dinormalisasi ke Menunggu
  it("Feature: campaign-manager, Property 11: Status kosong atau tak dikenal dinormalisasi ke Menunggu", () => {
    fc.assert(
      fc.property(unknownStatusCampaignArb, (campaign) => {
        const board = buildBoard([campaign]);

        const menungguColumn = board.find((col) => col.status === "Menunggu");
        expect(menungguColumn).toBeDefined();
        // The card is placed in the Menunggu column (Req 2.9).
        expect(
          menungguColumn?.cards.some((card) => card.id === campaign.id),
        ).toBe(true);

        // The card appears in no other column (Req 2.9).
        for (const col of board) {
          if (col.status === "Menunggu") continue;
          expect(col.cards.some((card) => card.id === campaign.id)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});
