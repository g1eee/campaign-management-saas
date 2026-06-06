import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  bannerStageView,
  campaignStepView,
  navigationState,
} from "./workflowView.js";
import {
  CampaignStep,
  CAMPAIGN_STEPS,
  ModuleId,
  MODULE_ORDER,
} from "./types.js";

describe("workflowView", () => {
  // Feature: campaign-hub, Property 35: Step classification matches the current step
  it("Property 35: step classification matches the current step", () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom<CampaignStep>(...CAMPAIGN_STEPS), { nil: null }),
        (current) => {
          const view = campaignStepView(current);
          const activeIndex = current === null ? -1 : CAMPAIGN_STEPS.indexOf(current);
          view.forEach((sv, i) => {
            if (activeIndex === -1) {
              expect(sv.classification).toBe("upcoming");
            } else if (i < activeIndex) {
              expect(sv.classification).toBe("completed");
            } else if (i === activeIndex) {
              expect(sv.classification).toBe("active");
            } else {
              expect(sv.classification).toBe("upcoming");
            }
          });
          // at most one active
          expect(view.filter((s) => s.classification === "active").length).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("banner stage view follows the same ordering invariant", () => {
    const view = bannerStageView("Approve");
    expect(view.find((s) => s.step === "Approve")?.classification).toBe("active");
    expect(view.find((s) => s.step === "Request")?.classification).toBe("completed");
    expect(view.find((s) => s.step === "Live")?.classification).toBe("upcoming");
  });

  // Feature: campaign-hub, Property 36: Exactly one active module and one active sidebar entry
  it("Property 36: exactly one active module and one active entry", () => {
    fc.assert(
      fc.property(
        fc
          .subarray([...MODULE_ORDER], { minLength: 1 })
          .map((a) => a as ModuleId[]),
        fc.constantFrom<ModuleId>(...MODULE_ORDER),
        (permitted, requested) => {
          const nav = navigationState(permitted, requested);
          expect(nav).not.toBeNull();
          if (nav) {
            const actives = nav.entries.filter((e) => e.active);
            expect(actives.length).toBe(1);
            expect(actives[0].module).toBe(nav.activeModule);
            expect(permitted).toContain(nav.activeModule);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
