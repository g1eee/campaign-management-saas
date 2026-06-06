import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { colorFor } from "./colorRegistry.js";
import {
  CampaignCategory,
  CampaignStatus,
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
} from "./types.js";

const statusArb = fc.constantFrom<CampaignStatus>(...CAMPAIGN_STATUSES);
const categoryArb = fc.constantFrom<CampaignCategory>(...CAMPAIGN_CATEGORIES);

describe("colorRegistry", () => {
  // Feature: campaign-hub, Property 44: Status and category colors are injective within each set
  it("Property 44: status and category colors are injective within each set", () => {
    fc.assert(
      fc.property(statusArb, statusArb, (a, b) => {
        const sameColor = colorFor("status", a) === colorFor("status", b);
        // injective: same color implies same value
        expect(sameColor).toBe(a === b);
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(categoryArb, categoryArb, (a, b) => {
        const sameColor = colorFor("category", a) === colorFor("category", b);
        expect(sameColor).toBe(a === b);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 45: Color lookup is a pure function of the value
  it("Property 45: color lookup is a pure function of the value", () => {
    fc.assert(
      fc.property(statusArb, (value) => {
        // Repeated lookups (simulating different views) yield identical colors.
        const first = colorFor("status", value);
        for (let i = 0; i < 5; i++) {
          expect(colorFor("status", value)).toBe(first);
        }
      }),
      { numRuns: 100 },
    );
    fc.assert(
      fc.property(categoryArb, (value) => {
        const first = colorFor("category", value);
        for (let i = 0; i < 5; i++) {
          expect(colorFor("category", value)).toBe(first);
        }
      }),
      { numRuns: 100 },
    );
  });
});
