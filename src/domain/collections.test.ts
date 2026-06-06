import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  countByCategory,
  countByStatus,
  filterBy,
  filterByDateRange,
  mostRecent,
  sortBy,
  upcomingCampaigns,
} from "./collections.js";
import {
  Campaign,
  CampaignCategory,
  CampaignStatus,
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  DASHBOARD_LIST_LIMIT,
} from "./types.js";

function makeCampaign(
  status: CampaignStatus,
  category: CampaignCategory,
  start: number,
  scheduledStart?: number,
): Campaign {
  return {
    id: `${status}-${category}-${start}-${Math.random()}`,
    name: "C",
    category,
    status,
    step: "BuatSkema",
    timelineStart: start,
    timelineEnd: start + 100,
    scheduledStart,
    scheme: {
      name: "C",
      category,
      timelineStart: start,
      timelineEnd: start + 100,
      targetStoreIds: ["s1"],
      promoOptions: [{ id: "p", label: "p", discountPct: 10 }],
      baseRevenue: 0,
      baseCost: 0,
      additionalCosts: 0,
    },
    targetStoreIds: ["s1"],
    createdAt: 0,
    updatedAt: 0,
  };
}

const campaignArb: fc.Arbitrary<Campaign> = fc
  .record({
    status: fc.constantFrom<CampaignStatus>(...CAMPAIGN_STATUSES),
    category: fc.constantFrom<CampaignCategory>(...CAMPAIGN_CATEGORIES),
    start: fc.integer({ min: 0, max: 1_000_000 }),
  })
  .map((r) => makeCampaign(r.status, r.category, r.start));

describe("collections", () => {
  // Feature: campaign-hub, Property 30: Ordering produces a correctly sorted sequence
  it("Property 30: ordering produces a correctly sorted permutation", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer(), { maxLength: 50 }),
        fc.constantFrom<"asc" | "desc">("asc", "desc"),
        (nums, dir) => {
          const sorted = sortBy(nums, (x) => x, dir);
          // same multiset
          expect([...sorted].sort((a, b) => a - b)).toEqual(
            [...nums].sort((a, b) => a - b),
          );
          // ordered
          for (let i = 1; i < sorted.length; i++) {
            if (dir === "asc") expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
            else expect(sorted[i]).toBeLessThanOrEqual(sorted[i - 1]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 31: Filtering returns exactly the matching members
  it("Property 31: filtering returns exactly the matching members", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { maxLength: 50 }), (nums) => {
        const pred = (x: number) => x % 2 === 0;
        const result = filterBy(nums, pred);
        expect(result.every(pred)).toBe(true);
        expect(result.length).toBe(nums.filter(pred).length);
        // no matching member dropped
        for (const n of nums) if (pred(n)) expect(result).toContain(n);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 32: Date-range filter rejects inverted ranges
  it("Property 32: date-range filter rejects inverted ranges", () => {
    fc.assert(
      fc.property(
        fc.array(campaignArb, { maxLength: 20 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        (campaigns, a, b) => {
          const range = { start: a, end: b };
          const res = filterByDateRange(campaigns, range, (c) => ({
            start: c.timelineStart,
            end: c.timelineEnd,
          }));
          expect(res.ok).toBe(b >= a);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 33: Group counts are correct and exhaustive
  it("Property 33: group counts are correct and exhaustive", () => {
    fc.assert(
      fc.property(fc.array(campaignArb, { maxLength: 40 }), (campaigns) => {
        const byStatus = countByStatus(campaigns);
        const byCategory = countByCategory(campaigns);
        const statusSum = CAMPAIGN_STATUSES.reduce((s, k) => s + byStatus[k], 0);
        const categorySum = CAMPAIGN_CATEGORIES.reduce(
          (s, k) => s + byCategory[k],
          0,
        );
        expect(statusSum).toBe(campaigns.length);
        expect(categorySum).toBe(campaigns.length);
        for (const k of CAMPAIGN_STATUSES) {
          expect(byStatus[k]).toBe(
            campaigns.filter((c) => c.status === k).length,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 34: Bounded lists respect their limits
  it("Property 34: bounded lists respect their limits", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            start: fc.integer({ min: 0, max: 1000 }),
            sched: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
          }),
          { maxLength: 50 },
        ),
        fc.integer({ min: 0, max: 1000 }),
        (specs, now) => {
          const campaigns = specs.map((s) =>
            makeCampaign("Menunggu", "FlashSale", s.start, s.sched),
          );
          const up = upcomingCampaigns(campaigns, now);
          expect(up.length).toBeLessThanOrEqual(DASHBOARD_LIST_LIMIT);
          for (const c of up) {
            expect(c.scheduledStart ?? c.timelineStart).toBeGreaterThanOrEqual(now);
          }
          const recent = mostRecent(campaigns, (c) => c.timelineStart);
          expect(recent.length).toBeLessThanOrEqual(DASHBOARD_LIST_LIMIT);
        },
      ),
      { numRuns: 100 },
    );
  });
});
