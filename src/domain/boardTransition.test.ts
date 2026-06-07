import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  isValidTransition,
  transitionStatus,
  VALID_TRANSITIONS,
} from "./boardTransition.js";
import { CampaignStatus, CAMPAIGN_STATUSES } from "./types.js";
import { knownStatusArb, statusPairArb, timestampArb } from "./testArbitraries.js";

/** An authenticated actor id (non-null). */
const actorArb: fc.Arbitrary<string> = fc.uuid();

/** An actor that is sometimes null, to exercise the Req 9.7 rejection path. */
const nullableActorArb: fc.Arbitrary<string | null> = fc.oneof(
  actorArb,
  fc.constant(null),
);

const campaignIdArb: fc.Arbitrary<string> = fc.uuid();

describe("boardTransition", () => {
  // Feature: campaign-manager, Property 20: Validitas transisi status menyeluruh
  it("Property 20: Validitas transisi status menyeluruh", () => {
    fc.assert(
      fc.property(
        statusPairArb,
        actorArb,
        timestampArb,
        campaignIdArb,
        ({ from, to }, actor, now, campaignId) => {
          const result = transitionStatus(from, to, actor, now, campaignId);
          if (isValidTransition(from, to)) {
            // A Transisi_Valid (including same-status no-op) succeeds and the
            // resulting status equals the requested target (Req 6.1, 9.2).
            expect(result.ok).toBe(true);
            if (result.ok) {
              expect(result.status).toBe(to);
            }
          } else {
            // Any non-valid move is rejected with the status unchanged
            // (Req 6.3, 9.3). This subsumes moves out of the terminal Selesai
            // status (Req 9.4).
            expect(result.ok).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 20: Validitas transisi status menyeluruh
  // (Selesai terminal — explicit coverage of Req 9.4)
  it("Property 20: transisi keluar dari Selesai ke status berbeda selalu ditolak", () => {
    fc.assert(
      fc.property(
        knownStatusArb,
        actorArb,
        timestampArb,
        campaignIdArb,
        (to, actor, now, campaignId) => {
          fc.pre(to !== "Selesai");
          const result = transitionStatus("Selesai", to, actor, now, campaignId);
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 20: Validitas transisi status menyeluruh
  // (actor null — explicit coverage of Req 9.7)
  it("Property 20: transisi tanpa pengguna terautentikasi selalu ditolak dengan status tidak berubah", () => {
    fc.assert(
      fc.property(
        statusPairArb,
        timestampArb,
        campaignIdArb,
        ({ from, to }, now, campaignId) => {
          const result = transitionStatus(from, to, null, now, campaignId);
          expect(result.ok).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 21: Setiap transisi valid mencatat audit lengkap
  it("Property 21: Setiap transisi valid mencatat audit lengkap", () => {
    fc.assert(
      fc.property(
        statusPairArb,
        actorArb,
        timestampArb,
        campaignIdArb,
        ({ from, to }, actor, now, campaignId) => {
          // Only changes to a different status emit an audit (a from===to no-op
          // succeeds without one, Req 6.4). Constrain to actual valid changes.
          fc.pre(from !== to && isValidTransition(from, to));
          const result = transitionStatus(from, to, actor, now, campaignId);
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.audit).toBeDefined();
            const audit = result.audit!;
            expect(audit.timestamp).toBe(now);
            expect(audit.fromStatus).toBe(from);
            expect(audit.toStatus).toBe(to);
            expect(audit.actor).toBe(actor);
            expect(audit.campaignId).toBe(campaignId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 22: Pelepasan pada kolom yang sama tidak mengubah status
  it("Property 22: Pelepasan pada kolom yang sama tidak mengubah status", () => {
    fc.assert(
      fc.property(
        knownStatusArb,
        actorArb,
        timestampArb,
        campaignIdArb,
        (s, actor, now, campaignId) => {
          const result = transitionStatus(s, s, actor, now, campaignId);
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.status).toBe(s);
            // A same-column drop produces no audit record (Req 6.4).
            expect(result.audit).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 23: Status selalu salah satu dari lima nilai
  it("Property 23: Status selalu salah satu dari lima nilai", () => {
    fc.assert(
      fc.property(
        statusPairArb,
        nullableActorArb,
        timestampArb,
        campaignIdArb,
        ({ from, to }, actor, now, campaignId) => {
          const result = transitionStatus(from, to, actor, now, campaignId);
          if (result.ok) {
            // Whatever the operation outcome, a resulting status is always one
            // of the five valid Campaign_Status values (Req 9.1).
            expect(CAMPAIGN_STATUSES).toContain(result.status);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 24: Transisi bersamaan diproses berurutan terhadap status terkini
  it("Property 24: Transisi bersamaan diproses berurutan terhadap status terkini", () => {
    const requestsArb = fc.array(
      fc.record({ to: knownStatusArb, actor: actorArb }),
      { minLength: 0, maxLength: 12 },
    );
    fc.assert(
      fc.property(
        knownStatusArb,
        requestsArb,
        timestampArb,
        campaignIdArb,
        (initial, requests, now, campaignId) => {
          // Apply each request sequentially against the running (latest) status.
          let current: CampaignStatus = initial;
          for (const req of requests) {
            const result = transitionStatus(
              current,
              req.to,
              req.actor,
              now,
              campaignId,
            );
            if (result.ok) {
              current = result.status;
            }
            // On rejection the running status is preserved (Req 9.3/9.6).
          }

          // Independent reference fold: a request succeeds iff it is a
          // Transisi_Valid from the running status, advancing it to the target.
          let expected: CampaignStatus = initial;
          for (const req of requests) {
            if (isValidTransition(expected, req.to)) {
              expected = req.to;
            }
          }

          expect(current).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Sanity: the valid-transition map matches Requirement 9.2 exactly.
  it("VALID_TRANSITIONS matches Requirement 9.2", () => {
    expect(VALID_TRANSITIONS).toEqual({
      Menunggu: ["Proses"],
      Proses: ["Review", "Menunggu"],
      Review: ["Live", "Proses"],
      Live: ["Selesai", "Review"],
      Selesai: [],
    });
  });
});
