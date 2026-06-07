/**
 * Access policy (pure).
 *
 * Server-side authority for role-based permissions. The sidebar mirrors these
 * decisions client-side. Encodes the SPV / Admin / null policy map and the
 * permitted-module sets, and provides a guarded-apply helper that performs no
 * partial effect when an action is denied.
 *
 * _Requirements: 1.3, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5_
 */

import { Action, ModuleId, MODULE_ORDER, Principal, Role } from "./types.js";

/** Actions each role may perform (Requirement 2.1, 2.2, 1.6, 1.7). */
const ROLE_ACTIONS: Record<Role, ReadonlySet<Action>> = {
  SPV: new Set<Action>([
    "CreateScheme",
    "SubmitCampaign",
    "ReviewExecution",
    "ApproveCampaign",
    // Campaign Manager board actions — SPV (Requirement 1.7):
    // membuat Template_Campaign, meninjau Campaign, menyetujui Campaign.
    "CreateTemplate",
    "ReviewCampaign",
    // "ApproveCampaign" sudah tercantum di atas dan memenuhi "menyetujui Campaign".
  ]),
  Admin: new Set<Action>([
    "SetStrategy",
    "CalculateCampaign",
    "PrepareAsset",
    "ExecuteTask",
    "UpdateProgress",
    // Campaign Manager board actions — Admin (Requirement 1.6):
    // buat, sunting, pindah, duplikasi, hapus Campaign, dan aksi massal.
    "CreateCampaign",
    "EditCampaign",
    "MoveCampaign",
    "DuplicateCampaign",
    "DeleteCampaign",
    "BulkAction",
  ]),
};

/**
 * Modules visible to each role. Both roles share the read-oriented modules;
 * action availability within a module is still governed by isPermitted.
 * (Requirement 2.5, 3.1)
 */
const SHARED_MODULES: readonly ModuleId[] = MODULE_ORDER;

const ROLE_MODULES: Record<Role, ReadonlySet<ModuleId>> = {
  SPV: new Set<ModuleId>(SHARED_MODULES),
  Admin: new Set<ModuleId>(SHARED_MODULES),
};

export interface AccessPolicy {
  isPermitted(role: Principal, action: Action): boolean;
  permittedModules(role: Principal): ModuleId[];
}

/**
 * Whether a principal may perform an action.
 * An unauthenticated / no-role principal is permitted nothing (Requirement 2.4).
 */
export function isPermitted(role: Principal, action: Action): boolean {
  if (role === null) return false;
  return ROLE_ACTIONS[role].has(action);
}

/**
 * The modules a principal may see, in fixed sidebar order.
 * A no-role principal sees nothing (Requirement 2.4, 2.5).
 */
export function permittedModules(role: Principal): ModuleId[] {
  if (role === null) return [];
  const allowed = ROLE_MODULES[role];
  return MODULE_ORDER.filter((m) => allowed.has(m));
}

export const accessPolicy: AccessPolicy = { isPermitted, permittedModules };

export type GuardedResult<S> =
  | { ok: true; state: S }
  | { ok: false; state: S; reason: "not_authorized" };

/**
 * Applies an operation only when the action is permitted. When denied, returns
 * the original state unchanged (no partial effect) and a not_authorized reason.
 * (Requirement 2.3)
 */
export function applyGuarded<S>(
  state: S,
  role: Principal,
  action: Action,
  op: (s: S) => S,
): GuardedResult<S> {
  if (!isPermitted(role, action)) {
    return { ok: false, state, reason: "not_authorized" };
  }
  return { ok: true, state: op(state) };
}
