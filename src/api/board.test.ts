import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { createRepositories } from "../infra/db/repositories.js";
import { BoardService } from "./board.js";
import { campaignArb } from "../domain/testArbitraries.js";
import { Campaign } from "../domain/types.js";

/**
 * A scenario for the confirmed bulk-delete property: a set of Campaigns with
 * unique ids, all seeded into the repository, plus a non-empty subset of their
 * ids chosen for deletion. The selected subset is bounded to 1..50 (well within
 * the 1..100 bulk limit) so the action is never rejected for size reasons and
 * the test isolates the "only the selected are deleted" behavior (Req 10.5).
 */
const deleteScenarioArb: fc.Arbitrary<{
  campaigns: Campaign[];
  selectedIds: string[];
}> = fc
  .uniqueArray(campaignArb, {
    selector: (c) => c.id,
    minLength: 1,
    maxLength: 50,
  })
  .chain((campaigns) =>
    fc.record({
      campaigns: fc.constant(campaigns),
      selectedIds: fc.subarray(
        campaigns.map((c) => c.id),
        { minLength: 1 },
      ),
    }),
  );

describe("BoardService", () => {
  // Feature: campaign-manager, Property 36: Penghapusan massal terkonfirmasi hanya menghapus yang terpilih
  // Validates: Requirements 10.5
  it("Feature: campaign-manager, Property 36: Penghapusan massal terkonfirmasi hanya menghapus yang terpilih", () => {
    fc.assert(
      fc.property(deleteScenarioArb, ({ campaigns, selectedIds }) => {
        const repos = createRepositories();
        for (const campaign of campaigns) {
          repos.campaigns.upsert(campaign);
        }
        const svc = new BoardService(repos);

        // Snapshot of every campaign before the delete, for the unchanged check.
        const before = new Map(campaigns.map((c) => [c.id, c]));
        const selectedSet = new Set(selectedIds);

        const result = svc.bulkDelete("Admin", selectedIds, 1000);

        // The confirmed bulk delete succeeds and reports exactly the selected
        // count as deleted (all selected ids exist in the repo).
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value.deleted).toBe(selectedIds.length);

        for (const campaign of campaigns) {
          if (selectedSet.has(campaign.id)) {
            // Every selected Campaign is removed (Req 10.5).
            expect(repos.campaigns.get(campaign.id)).toBeUndefined();
          } else {
            // Every unselected Campaign is left unchanged (Req 10.5).
            expect(repos.campaigns.get(campaign.id)).toEqual(
              before.get(campaign.id),
            );
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // -------------------------------------------------------------------------
  // Task 15.3 — board API error paths (Requirements 3.6, 6.6, 8.4)
  // -------------------------------------------------------------------------

  // Requirement 3.6: a system failure during Tambah_Cepat cancels creation
  // without adding any new card.
  it("cancels Tambah Cepat on a system failure without adding a card (Req 3.6)", () => {
    const repos = createRepositories();
    const svc = new BoardService(repos);

    // Simulate a persistence/system failure when the draft would be saved.
    repos.campaigns.upsert = () => {
      throw new Error("kegagalan sistem");
    };

    expect(() => svc.quickAdd("Admin", "Promo Baru", 1000)).toThrow();
    // No Kartu_Campaign was added (Req 3.6).
    expect(repos.campaigns.all()).toHaveLength(0);
  });

  // Requirement 6.6: when saving a valid move fails, the original status is
  // preserved.
  it("preserves the original status when a move fails to save (Req 6.6)", () => {
    const repos = createRepositories();
    const svc = new BoardService(repos);

    const created = svc.quickAdd("Admin", "Kampanye", 1000);
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error("setup gagal: quickAdd menolak");
    const id = created.value.id;
    expect(repos.campaigns.get(id)?.status).toBe("Menunggu");

    // Menunggu -> Proses is a valid transition, so the code reaches the save;
    // make the save fail to exercise the failed-save path (Req 6.6).
    repos.campaigns.upsert = () => {
      throw new Error("gagal simpan");
    };

    expect(() => svc.moveCampaign("Admin", id, "Proses", "adm1", 2000)).toThrow();
    // The Campaign_Status is preserved as the original Menunggu (Req 6.6).
    expect(repos.campaigns.get(id)?.status).toBe("Menunggu");
  });

  // Requirement 8.4: duplicating a source that no longer exists is rejected and
  // leaves all existing campaigns unchanged.
  it("rejects duplicating a deleted source and leaves campaigns unchanged (Req 8.4)", () => {
    const repos = createRepositories();
    const svc = new BoardService(repos);

    // Seed two campaigns, then delete one to make it "no longer available".
    const a = svc.quickAdd("Admin", "Asli A", 1000);
    const b = svc.quickAdd("Admin", "Asli B", 1000);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error("setup gagal: quickAdd menolak");
    repos.campaigns.delete(a.value.id);

    const before = repos.campaigns.all();
    const result = svc.duplicateCampaign("Admin", a.value.id, 2000);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/tidak lagi tersedia/);
    }
    // No Campaign was created or changed (Req 8.4).
    expect(repos.campaigns.all()).toEqual(before);
  });
});
