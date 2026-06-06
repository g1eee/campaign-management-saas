import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  adsCPASTransition,
  bannerTransition,
  canCreateAsset,
  hostLiveTransition,
  igStoryTransition,
} from "./assetStateMachines.js";
import {
  AdsCPASStatus,
  ADS_CPAS_STATUSES,
  BannerStatus,
  BANNER_STATUSES,
  IGStoryStatus,
  IG_STORY_STATUSES,
} from "./types.js";

const bannerStatusArb = fc.constantFrom<BannerStatus>(...BANNER_STATUSES);
const igStatusArb = fc.constantFrom<IGStoryStatus>(...IG_STORY_STATUSES);
const adsStatusArb = fc.constantFrom<AdsCPASStatus>(...ADS_CPAS_STATUSES);

describe("assetStateMachines", () => {
  // Feature: campaign-hub, Property 13: Asset creation requires an existing associated campaign
  it("Property 13: asset creation requires an existing associated campaign", () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { maxLength: 5 }),
        fc.option(fc.uuid(), { nil: null }),
        (ids, candidate) => {
          const set = new Set(ids);
          const expected = candidate !== null && set.has(candidate);
          expect(canCreateAsset(candidate, set)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 14: Defined asset transitions yield the specified next status
  it("Property 14: defined asset transitions yield the specified next status", () => {
    // Banner happy path
    expect(bannerTransition("Request", { kind: "Upload", hasFile: true })).toMatchObject({ ok: true, status: "Design" });
    expect(bannerTransition("Design", { kind: "Review" })).toMatchObject({ ok: true, status: "Review" });
    expect(bannerTransition("Review", { kind: "Approve" })).toMatchObject({ ok: true, status: "Approve" });
    expect(bannerTransition("Approve", { kind: "Schedule", goLiveAt: 10, now: 1 })).toMatchObject({ ok: true, status: "Schedule" });
    expect(bannerTransition("Schedule", { kind: "TimerLive" })).toMatchObject({ ok: true, status: "Live" });
    // IG Story
    expect(igStoryTransition("Request", { kind: "Upload", hasFile: true })).toMatchObject({ ok: true, status: "Design" });
    expect(igStoryTransition("Design", { kind: "Approve" })).toMatchObject({ ok: true, status: "Approve" });
    // Host Live
    expect(hostLiveTransition("Request", { kind: "Upload", hasFile: true })).toMatchObject({ ok: true, status: "Design" });
    expect(hostLiveTransition("Design", { kind: "Approve" })).toMatchObject({ ok: true, status: "Approve" });
    expect(hostLiveTransition("Approve", { kind: "Schedule", sessionAt: 10, now: 1 })).toMatchObject({ ok: true, status: "Schedule" });
    expect(hostLiveTransition("Schedule", { kind: "TimerLive" })).toMatchObject({ ok: true, status: "Live" });
    // Ads CPAS
    expect(adsCPASTransition("Request", { kind: "Upload", hasFile: true })).toMatchObject({ ok: true, status: "Design" });
    expect(adsCPASTransition("Design", { kind: "Approve" })).toMatchObject({ ok: true, status: "Approve" });
    expect(adsCPASTransition("Approve", { kind: "Setup", missingFields: [] })).toMatchObject({ ok: true, status: "Setup_Complete" });
  });

  // Feature: campaign-hub, Property 15: Undefined asset transitions are rejected within a closed status set
  it("Property 15: undefined asset transitions are rejected within closed status sets", () => {
    fc.assert(
      fc.property(bannerStatusArb, (status) => {
        // Upload only valid from Request; Review only from Design, etc.
        const r = bannerTransition(status, { kind: "Review" });
        if (status !== "Design") {
          expect(r.ok).toBe(false);
          expect(r.status).toBe(status);
        }
        expect(BANNER_STATUSES).toContain(r.status);
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(igStatusArb, (status) => {
        const r = igStoryTransition(status, { kind: "Approve" });
        if (status !== "Design") {
          expect(r.ok).toBe(false);
          expect(r.status).toBe(status);
        }
        expect(IG_STORY_STATUSES).toContain(r.status);
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(adsStatusArb, (status) => {
        const r = adsCPASTransition(status, { kind: "Setup", missingFields: [] });
        if (status !== "Approve") {
          expect(r.ok).toBe(false);
          expect(r.status).toBe(status);
        }
        expect(ADS_CPAS_STATUSES).toContain(r.status);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 16: Rejection routes back and notifies
  it("Property 16: rejection routes back and notifies", () => {
    const b = bannerTransition("Review", { kind: "Reject" });
    expect(b).toMatchObject({ ok: true, status: "Design" });
    if (b.ok) expect(b.notifications).toHaveLength(1);

    const ig = igStoryTransition("Design", { kind: "Reject" });
    expect(ig).toMatchObject({ ok: true, status: "Design" });
    if (ig.ok) expect(ig.notifications).toHaveLength(1);

    const hl = hostLiveTransition("Design", { kind: "Reject" });
    expect(hl).toMatchObject({ ok: true, status: "Design" });
    if (hl.ok) expect(hl.notifications).toHaveLength(1);

    const ads = adsCPASTransition("Design", { kind: "Reject" });
    expect(ads).toMatchObject({ ok: true, status: "Design" });
    if (ads.ok) expect(ads.notifications).toHaveLength(1);
  });

  // Feature: campaign-hub, Property 17: Future-time guard on scheduling
  it("Property 17: future-time guard on scheduling", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (when, now) => {
          const b = bannerTransition("Approve", { kind: "Schedule", goLiveAt: when, now });
          expect(b.ok).toBe(when > now);
          if (!b.ok) expect(b.status).toBe("Approve");

          const hl = hostLiveTransition("Approve", { kind: "Schedule", sessionAt: when, now });
          expect(hl.ok).toBe(when > now);
          if (!hl.ok) expect(hl.status).toBe("Approve");
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 18: Setup and upload completeness guards
  it("Property 18: setup and upload completeness guards", () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 5 }), (missing) => {
        const r = adsCPASTransition("Approve", { kind: "Setup", missingFields: missing });
        expect(r.ok).toBe(missing.length === 0);
        if (!r.ok) expect(r.status).toBe("Approve");
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(fc.boolean(), (hasFile) => {
        const r = igStoryTransition("Request", { kind: "Upload", hasFile });
        expect(r.ok).toBe(hasFile);
        if (!r.ok) expect(r.status).toBe("Request");
      }),
      { numRuns: 100 },
    );
  });
});
