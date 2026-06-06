import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { applyGuarded, isPermitted, permittedModules } from "./accessPolicy.js";
import { Action, ModuleId, MODULE_ORDER, Principal } from "./types.js";

const ALL_ACTIONS: Action[] = [
  "CreateScheme",
  "SubmitCampaign",
  "ReviewExecution",
  "ApproveCampaign",
  "SetStrategy",
  "CalculateCampaign",
  "PrepareAsset",
  "ExecuteTask",
  "UpdateProgress",
];

const SPV_ACTIONS = new Set<Action>([
  "CreateScheme",
  "SubmitCampaign",
  "ReviewExecution",
  "ApproveCampaign",
]);
const ADMIN_ACTIONS = new Set<Action>([
  "SetStrategy",
  "CalculateCampaign",
  "PrepareAsset",
  "ExecuteTask",
  "UpdateProgress",
]);

const principalArb = fc.constantFrom<Principal>("SPV", "Admin", null);
const actionArb = fc.constantFrom<Action>(...ALL_ACTIONS);

function expected(role: Principal, action: Action): boolean {
  if (role === "SPV") return SPV_ACTIONS.has(action);
  if (role === "Admin") return ADMIN_ACTIONS.has(action);
  return false;
}

describe("accessPolicy", () => {
  // Feature: campaign-hub, Property 1: Permission decisions match the policy exactly
  it("Property 1: permission decisions match the policy exactly", () => {
    fc.assert(
      fc.property(principalArb, actionArb, (role, action) => {
        expect(isPermitted(role, action)).toBe(expected(role, action));
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 2: Denied actions cause no state change
  it("Property 2: denied actions cause no state change", () => {
    fc.assert(
      fc.property(
        principalArb,
        actionArb,
        fc.integer(),
        (role, action, seed) => {
          const state = { value: seed };
          const result = applyGuarded(state, role, action, (s) => ({
            value: s.value + 1,
          }));
          if (!isPermitted(role, action)) {
            expect(result.ok).toBe(false);
            // Original object returned unchanged (no partial effect).
            expect(result.state).toBe(state);
            expect(result.state.value).toBe(seed);
          } else {
            expect(result.ok).toBe(true);
            expect(result.state.value).toBe(seed + 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 3: Sidebar and dashboard data reflect only permitted scope
  it("Property 3: sidebar reflects only the permitted module set", () => {
    fc.assert(
      fc.property(principalArb, (role) => {
        const mods = permittedModules(role);
        if (role === null) {
          expect(mods).toEqual([]);
          return;
        }
        // No duplicates, all valid, and preserves fixed order.
        const set = new Set<ModuleId>(mods);
        expect(set.size).toBe(mods.length);
        for (const m of mods) expect(MODULE_ORDER).toContain(m);
        const ordered = MODULE_ORDER.filter((m) => set.has(m));
        expect(mods).toEqual(ordered);
      }),
      { numRuns: 100 },
    );
  });
});
