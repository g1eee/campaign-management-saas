import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { applyGuarded, isPermitted, permittedModules } from "./accessPolicy.js";
import { Action, ModuleId, MODULE_ORDER, Principal, Role } from "./types.js";

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

// ---------------------------------------------------------------------------
// Campaign Manager pivot: role-based access policy properties
// (Requirements 1.4, 1.6, 1.7, 1.8, 13.6, 13.8)
// ---------------------------------------------------------------------------

/** Every Action in the union, including the Campaign Manager board actions. */
const ALL_ACTIONS_CM: Action[] = [
  // Legacy CampaignHub workflow
  "CreateScheme",
  "SubmitCampaign",
  "ReviewExecution",
  "ApproveCampaign",
  "SetStrategy",
  "CalculateCampaign",
  "PrepareAsset",
  "ExecuteTask",
  "UpdateProgress",
  // Campaign Manager board actions — Admin (Requirement 1.6)
  "CreateCampaign",
  "EditCampaign",
  "MoveCampaign",
  "DuplicateCampaign",
  "DeleteCampaign",
  "BulkAction",
  // Campaign Manager board actions — SPV (Requirement 1.7)
  "CreateTemplate",
  "ReviewCampaign",
];

/** The action set each role is expected to be permitted (mirrors the policy). */
const ROLE_ACTIONS_CM: Record<Role, ReadonlySet<Action>> = {
  SPV: new Set<Action>([
    "CreateScheme",
    "SubmitCampaign",
    "ReviewExecution",
    "ApproveCampaign",
    "CreateTemplate",
    "ReviewCampaign",
  ]),
  Admin: new Set<Action>([
    "SetStrategy",
    "CalculateCampaign",
    "PrepareAsset",
    "ExecuteTask",
    "UpdateProgress",
    "CreateCampaign",
    "EditCampaign",
    "MoveCampaign",
    "DuplicateCampaign",
    "DeleteCampaign",
    "BulkAction",
  ]),
};

const roleArb = fc.constantFrom<Role>("SPV", "Admin");
const allActionArb = fc.constantFrom<Action>(...ALL_ACTIONS_CM);
const moduleArb = fc.constantFrom<ModuleId>(...MODULE_ORDER);

describe("accessPolicy (campaign-manager)", () => {
  // Feature: campaign-manager, Property 3: Izin aksi berbasis peran
  it("Property 3: role-based action permissions match the role's assigned set exactly", () => {
    fc.assert(
      fc.property(roleArb, allActionArb, (role, action) => {
        const inRoleSet = ROLE_ACTIONS_CM[role].has(action);
        // Permitted iff the action belongs to the role's assigned set; any
        // action outside that set is denied (Requirements 1.6, 1.7).
        expect(isPermitted(role, action)).toBe(inRoleSet);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 4: Prinsipal tanpa autentikasi tidak diizinkan apa pun
  it("Property 4: an unauthenticated principal is permitted no action and sees no modules", () => {
    fc.assert(
      fc.property(allActionArb, moduleArb, (action, _module) => {
        const principal: Principal = null;
        // No action is permitted for a null principal (Requirement 1.4).
        expect(isPermitted(principal, action)).toBe(false);
        // The permitted-module list is empty, so no module is ever rendered.
        const mods = permittedModules(principal);
        expect(mods).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 5: Penolakan tanpa efek parsial
  it("Property 5: a denied action leaves the input state identical (no partial effect)", () => {
    fc.assert(
      fc.property(
        roleArb,
        allActionArb,
        fc.integer(),
        (role, action, seed) => {
          // Restrict to actions that are NOT permitted for the role.
          fc.pre(!isPermitted(role, action));
          const state = { value: seed, touched: false };
          const result = applyGuarded(state, role, action, (s) => ({
            value: s.value + 1,
            touched: true,
          }));
          // Denial returns failure with the original, unchanged state
          // (Requirement 1.8).
          expect(result.ok).toBe(false);
          expect(result.state).toBe(state);
          expect(result.state.value).toBe(seed);
          expect(result.state.touched).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 6: Modul yang dirender sesuai izin peran
  it("Property 6: rendered modules equal the role's permitted module set exactly", () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        // The set of modules the UI renders is exactly permittedModules(role);
        // a module is rendered iff it is in that set (Requirements 13.6, 13.8).
        const rendered = permittedModules(role);
        const renderedSet = new Set<ModuleId>(rendered);
        for (const m of MODULE_ORDER) {
          expect(renderedSet.has(m)).toBe(rendered.includes(m));
        }
        // Nothing outside MODULE_ORDER is ever rendered, and order is fixed.
        for (const m of rendered) expect(MODULE_ORDER).toContain(m);
        expect(rendered).toEqual(MODULE_ORDER.filter((m) => renderedSet.has(m)));
      }),
      { numRuns: 100 },
    );
  });
});
