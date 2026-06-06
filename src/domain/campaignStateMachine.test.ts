import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CampaignEvent,
  CampaignSmState,
  transition,
} from "./campaignStateMachine.js";
import {
  CampaignStatus,
  CampaignStep,
  CAMPAIGN_STATUSES,
} from "./types.js";

const statusStepPairs: { status: CampaignStatus; step: CampaignStep }[] = [
  { status: "Menunggu", step: "BuatSkema" },
  { status: "Proses", step: "Submit" },
  { status: "Proses", step: "Eksekusi" },
  { status: "Review", step: "Review" },
  { status: "Live", step: "Live" },
  { status: "Selesai", step: "Live" },
];

const stateArb: fc.Arbitrary<CampaignSmState> = fc.record({
  pair: fc.constantFrom(...statusStepPairs),
  calculated: fc.boolean(),
  schemeComplete: fc.boolean(),
}).map((r) => ({
  status: r.pair.status,
  step: r.pair.step,
  calculated: r.calculated,
  schemeComplete: r.schemeComplete,
}));

const eventArb: fc.Arbitrary<CampaignEvent> = fc.oneof(
  fc.record({ kind: fc.constant("Submit" as const), actor: fc.uuid(), role: fc.constantFrom("SPV" as const, "Admin" as const), at: fc.integer({ min: 0 }) }),
  fc.record({ kind: fc.constant("Approve" as const), actor: fc.uuid(), role: fc.constantFrom("SPV" as const, "Admin" as const), at: fc.integer({ min: 0 }) }),
  fc.record({ kind: fc.constant("ReviewApprove" as const), actor: fc.uuid(), role: fc.constantFrom("SPV" as const, "Admin" as const), at: fc.integer({ min: 0 }) }),
  fc.record({ kind: fc.constant("ReviewReject" as const), actor: fc.uuid(), role: fc.constantFrom("SPV" as const, "Admin" as const), at: fc.integer({ min: 0 }) }),
  fc.record({ kind: fc.constant("TimerStart" as const), at: fc.integer({ min: 0 }) }),
  fc.record({ kind: fc.constant("TimerEnd" as const), at: fc.integer({ min: 0 }) }),
  fc.record({
    kind: fc.constant("Schedule" as const),
    actor: fc.uuid(),
    role: fc.constantFrom("SPV" as const, "Admin" as const),
    at: fc.integer({ min: 0 }),
    schedule: fc.record({ start: fc.integer({ min: 0, max: 1000 }), end: fc.integer({ min: 1001, max: 2000 }) }),
  }),
);

// Reference model of the only legal transitions.
function expectedNext(
  s: CampaignSmState,
  e: CampaignEvent,
): { status: CampaignStatus; step: CampaignStep } | null {
  if (s.status === "Selesai") return null;
  switch (e.kind) {
    case "Submit":
      return s.status === "Menunggu" && s.step === "BuatSkema" && s.schemeComplete
        ? { status: "Proses", step: "Submit" }
        : null;
    case "Approve":
      return s.status === "Proses" && s.step === "Submit" && s.calculated
        ? { status: "Proses", step: "Eksekusi" }
        : null;
    case "ReviewApprove":
      return s.status === "Proses" && s.step === "Eksekusi"
        ? { status: "Review", step: "Review" }
        : null;
    case "ReviewReject":
      return s.status === "Review" && s.step === "Review"
        ? { status: "Proses", step: "Eksekusi" }
        : null;
    case "TimerStart":
      return s.status === "Review" && s.step === "Review"
        ? { status: "Live", step: "Live" }
        : null;
    case "TimerEnd":
      return s.status === "Live" ? { status: "Selesai", step: s.step } : null;
    case "Schedule":
      // schedule does not change status/step (only valid in Proses/Eksekusi)
      return s.status === "Proses" && s.step === "Eksekusi" && e.schedule.end > e.schedule.start
        ? { status: s.status, step: s.step }
        : null;
  }
}

describe("campaignStateMachine", () => {
  // Feature: campaign-hub, Property 6: Defined transitions yield the specified target
  it("Property 6: defined transitions yield the specified target", () => {
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        const exp = expectedNext(s, e);
        const r = transition(s, e);
        if (exp !== null) {
          expect(r.ok).toBe(true);
          if (r.ok) {
            expect(r.state.status).toBe(exp.status);
            expect(r.state.step).toBe(exp.step);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 7: Undefined transitions are rejected with state unchanged
  it("Property 7: undefined transitions are rejected with state unchanged", () => {
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        const exp = expectedNext(s, e);
        const r = transition(s, e);
        if (exp === null) {
          expect(r.ok).toBe(false);
          expect(r.state).toEqual(s);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 8: Status is always one of the five legal values
  it("Property 8: status is always one of the five legal values", () => {
    fc.assert(
      fc.property(stateArb, fc.array(eventArb, { maxLength: 12 }), (s0, events) => {
        let s = s0;
        for (const e of events) {
          const r = transition(s, e);
          if (r.ok) s = r.state;
          expect(CAMPAIGN_STATUSES).toContain(s.status);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 9: Selesai is terminal
  it("Property 9: Selesai is terminal", () => {
    fc.assert(
      fc.property(eventArb, (e) => {
        const s: CampaignSmState = {
          status: "Selesai",
          step: "Live",
          calculated: true,
          schemeComplete: true,
        };
        const r = transition(s, e);
        expect(r.ok).toBe(false);
        expect(r.state.status).toBe("Selesai");
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 10: Every successful transition is audited
  it("Property 10: every successful transition is audited", () => {
    fc.assert(
      fc.property(stateArb, eventArb, (s, e) => {
        const r = transition(s, e);
        if (r.ok) {
          const audits = r.effects.filter((f) => f.type === "audit");
          expect(audits.length).toBe(1);
          const a = audits[0];
          if (a.type === "audit") {
            expect(a.fromStatus).toBe(s.status);
            expect(a.toStatus).toBe(r.state.status);
            expect(a.actor).toBe(e.kind === "TimerStart" || e.kind === "TimerEnd" ? "System" : (e as any).actor);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 11: Approval requires completed calculation
  it("Property 11: approval requires completed calculation", () => {
    fc.assert(
      fc.property(fc.boolean(), (calculated) => {
        const s: CampaignSmState = {
          status: "Proses",
          step: "Submit",
          calculated,
          schemeComplete: true,
        };
        const r = transition(s, { kind: "Approve", actor: "u", role: "Admin", at: 1 });
        expect(r.ok).toBe(calculated);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 12: Submission requires a complete scheme
  it("Property 12: submission requires a complete scheme", () => {
    fc.assert(
      fc.property(fc.boolean(), (schemeComplete) => {
        const s: CampaignSmState = {
          status: "Menunggu",
          step: "BuatSkema",
          calculated: false,
          schemeComplete,
        };
        const r = transition(s, { kind: "Submit", actor: "u", role: "SPV", at: 1 });
        expect(r.ok).toBe(schemeComplete);
        if (!r.ok) expect(r.state).toEqual(s);
      }),
      { numRuns: 100 },
    );
  });
});
