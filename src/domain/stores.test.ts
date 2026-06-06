import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  assignCampaign,
  buildBroadcastResult,
  DeliveryOutcome,
  groupStores,
} from "./stores.js";
import {
  MAX_BROADCAST_MESSAGE,
  MAX_BROADCAST_STORES,
  Store,
  StoreStatus,
} from "./types.js";

const storeArb: fc.Arbitrary<Store> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 8 }),
  status: fc.constantFrom<StoreStatus>("active", "non-active", "attention-needed"),
  categoryIds: fc.array(fc.uuid(), { maxLength: 3 }),
  assignedCampaignIds: fc.array(fc.uuid(), { maxLength: 3 }),
});

describe("stores", () => {
  // Feature: campaign-hub, Property 39: Store status groups partition the store set
  it("Property 39: store groups partition the store set", () => {
    fc.assert(
      fc.property(fc.array(storeArb, { maxLength: 40 }), (stores) => {
        const g = groupStores(stores);
        const total =
          g.active.length + g["non-active"].length + g["attention-needed"].length;
        expect(total).toBe(stores.length);
        // disjoint by id
        const ids = new Set<string>();
        for (const s of [...g.active, ...g["non-active"], ...g["attention-needed"]]) {
          expect(ids.has(s.id)).toBe(false);
          ids.add(s.id);
        }
        // each store in the group matching its status
        for (const s of g.active) expect(s.status).toBe("active");
        for (const s of g["non-active"]) expect(s.status).toBe("non-active");
        for (const s of g["attention-needed"]) expect(s.status).toBe("attention-needed");
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 40: Campaign assignment is dedup-guarded
  it("Property 40: campaign assignment is dedup-guarded", () => {
    fc.assert(
      fc.property(storeArb, fc.uuid(), (store, campaignId) => {
        const already = store.assignedCampaignIds.includes(campaignId);
        const r = assignCampaign(store, campaignId);
        if (already) {
          expect(r.ok).toBe(false);
          expect(r.store).toBe(store);
        } else {
          expect(r.ok).toBe(true);
          if (r.ok) {
            expect(r.store.assignedCampaignIds).toContain(campaignId);
            // assigning again is now rejected
            expect(assignCampaign(r.store, campaignId).ok).toBe(false);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 41: Broadcast produces exactly one delivery record per selected store
  it("Property 41: broadcast produces exactly one delivery record per selected store", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(fc.constantFrom<"delivered" | "failed">("delivered", "failed"), {
          maxLength: 20,
        }),
        (storeIds, message, statuses) => {
          const outcomes: DeliveryOutcome[] = storeIds.map((storeId, i) => ({
            storeId,
            status: statuses[i] ?? "delivered",
          }));
          const result = buildBroadcastResult("b1", { message, storeIds }, outcomes);
          expect(result.ok).toBe(true);
          if (result.ok) {
            // exactly one delivery per selected store
            expect(result.deliveries.length).toBe(storeIds.length);
            const recordStores = result.deliveries.map((d) => d.storeId);
            expect(recordStores).toEqual(storeIds);
            // failed set matches
            const expectedFailed = result.deliveries
              .filter((d) => d.status === "failed")
              .map((d) => d.storeId);
            expect(result.failedStoreIds).toEqual(expectedFailed);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects empty store selection and oversized inputs", () => {
    expect(buildBroadcastResult("b", { message: "hi", storeIds: [] }, []).ok).toBe(
      false,
    );
    const tooMany = Array.from({ length: MAX_BROADCAST_STORES + 1 }, (_, i) =>
      String(i),
    );
    expect(
      buildBroadcastResult("b", { message: "hi", storeIds: tooMany }, []).ok,
    ).toBe(false);
    const longMsg = "x".repeat(MAX_BROADCAST_MESSAGE + 1);
    expect(
      buildBroadcastResult("b", { message: longMsg, storeIds: ["s1"] }, []).ok,
    ).toBe(false);
  });
});
