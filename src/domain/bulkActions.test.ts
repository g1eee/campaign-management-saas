import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { bulkMove, bulkSetCategory, validateSelection } from "./bulkActions.js";
import { isValidTransition } from "./boardTransition.js";
import { selectionArb, categoryArb, knownStatusArb } from "./testArbitraries.js";
import {
  BULK_MAX,
  BULK_MIN,
  CAMPAIGN_STATUSES,
  Campaign,
  CampaignStatus,
} from "./types.js";

/**
 * Property-based tests for the Aksi Massal (Requirement 10) domain core.
 *
 * Uses `selectionArb` and `campaignArb` (via `selectionArb`) from the shared
 * test arbitraries. `selectionArb` ranges 0..105 so selections both inside the
 * 1..100 bound and outside it (empty or over-limit) are exercised.
 */

const NOW = 1_000_000 as Campaign["updatedAt"];
const ACTOR = "admin-1";

/**
 * Campaign_Status invariant (Requirement 9.1): every Campaign carries one of
 * the five valid statuses. `campaignArb` deliberately injects unknown status
 * values to drive board-view normalization (Requirement 2.9); for the bulk
 * status-move contract those out-of-domain values are normalized to Menunggu
 * (the board-view rule) so the partition is evaluated against in-contract
 * statuses only.
 */
function normalizeStatus(status: CampaignStatus): CampaignStatus {
  return CAMPAIGN_STATUSES.includes(status) ? status : "Menunggu";
}

describe("bulkActions (campaign-manager)", () => {
  // Feature: campaign-manager, Property 34: Aksi massal kategori memperbarui seluruh terpilih
  it("Property 34: bulk category update sets the chosen category on every selected campaign", () => {
    fc.assert(
      fc.property(selectionArb, categoryArb, (selected, category) => {
        // A category change applies only to valid selections (1..100).
        fc.pre(selected.length >= BULK_MIN && selected.length <= BULK_MAX);

        const result = bulkSetCategory(selected, category, NOW);

        // The whole action succeeds with no per-campaign failures (Req 10.1).
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.updated.length).toBe(selected.length);
          expect(result.failures).toEqual([]);
          // Every selected campaign now carries the chosen category, kept in
          // sync with scheme.category, with a refreshed updatedAt.
          for (const campaign of result.updated) {
            expect(campaign.category).toBe(category);
            expect(campaign.scheme.category).toBe(category);
            expect(campaign.updatedAt).toBe(NOW);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 35: Aksi massal pindah status mempartisi terpilih menjadi berhasil dan gagal
  it("Property 35: bulk move partitions the selection into valid-transition successes and the rest as failures", () => {
    fc.assert(
      fc.property(selectionArb, knownStatusArb, (raw, toStatus) => {
        // A status move applies only to valid selections (1..100).
        fc.pre(raw.length >= BULK_MIN && raw.length <= BULK_MAX);

        // Keep every campaign within the Campaign_Status invariant (Req 9.1).
        const selected: Campaign[] = raw.map((c) => ({
          ...c,
          status: normalizeStatus(c.status),
        }));

        const result = bulkMove(selected, toStatus, ACTOR, NOW);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        // Expected partition: updated = exactly the valid transitions
        // (Req 10.2); failures = the remainder, each with a reason (Req 10.3).
        const expectedUpdated = selected.filter((c) =>
          isValidTransition(c.status, toStatus),
        );
        const expectedFailed = selected.filter(
          (c) => !isValidTransition(c.status, toStatus),
        );

        expect(result.updated.length).toBe(expectedUpdated.length);
        expect(result.failures.length).toBe(expectedFailed.length);

        // The two sets are disjoint and their union is the whole selection.
        expect(result.updated.length + result.failures.length).toBe(
          selected.length,
        );

        // Every updated campaign carries the target status; failures never do.
        for (const campaign of result.updated) {
          expect(campaign.status).toBe(toStatus);
          expect(campaign.updatedAt).toBe(NOW);
        }
        for (const failure of result.failures) {
          expect(failure.reason.length).toBeGreaterThan(0);
        }

        // Union equals the selection (compared as a multiset of ids).
        const partitionIds = [
          ...result.updated.map((c) => c.id),
          ...result.failures.map((f) => f.campaignId),
        ].sort();
        const selectedIds = selected.map((c) => c.id).sort();
        expect(partitionIds).toEqual(selectedIds);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 37: Batas ukuran seleksi aksi massal
  it("Property 37: selection-size bounds reject empty (>=1) and over-limit (<=100) selections without changing any campaign", () => {
    fc.assert(
      fc.property(selectionArb, (selected) => {
        // Restrict to out-of-bounds selections: empty or larger than 100.
        fc.pre(selected.length === 0 || selected.length > BULK_MAX);

        const sizeCheck = validateSelection(selected.length);
        expect(sizeCheck.ok).toBe(false);
        if (!sizeCheck.ok) {
          if (selected.length === 0) {
            // Empty selection is rejected with the "at least one" message
            // (Requirement 10.7).
            expect(sizeCheck.reason).toMatch(/setidaknya satu/i);
          } else {
            // Over-limit selection is rejected citing the 100-item maximum
            // (Requirement 10.8).
            expect(sizeCheck.reason).toContain(String(BULK_MAX));
          }
        }

        // Both bulk operations reject the whole action and leave every selected
        // campaign unchanged (Requirements 10.7, 10.8).
        const snapshot = structuredClone(selected);

        const categoryResult = bulkSetCategory(selected, "Lokal", NOW);
        expect(categoryResult.ok).toBe(false);

        const moveResult = bulkMove(selected, "Proses", ACTOR, NOW);
        expect(moveResult.ok).toBe(false);

        expect(selected).toEqual(snapshot);
      }),
      { numRuns: 100 },
    );
  });
});
