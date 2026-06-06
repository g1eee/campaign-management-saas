/**
 * Access-control middleware.
 *
 * Invokes the pure AccessPolicy server-side. Denies unauthorized or
 * unauthenticated requests with no data change and an insufficient-permissions
 * error.
 *
 * _Requirements: 1.7, 2.1, 2.2, 2.3, 2.4_
 */

import { Action, Principal } from "../../domain/types.js";
import { isPermitted } from "../../domain/accessPolicy.js";

export class AuthorizationError extends Error {
  readonly code = "not_authorized";
  constructor(action: Action) {
    super(`Tidak diizinkan melakukan aksi: ${action}.`);
    this.name = "AuthorizationError";
  }
}

/**
 * Guards a server operation behind a role/action check. When denied, throws an
 * AuthorizationError before the operation runs, so no data is mutated
 * (Requirement 2.3). When permitted, runs and returns the operation result.
 */
export function authorize<T>(
  role: Principal,
  action: Action,
  op: () => T,
): T {
  if (!isPermitted(role, action)) {
    throw new AuthorizationError(action);
  }
  return op();
}

/** Non-throwing variant returning a discriminated result. */
export function tryAuthorize<T>(
  role: Principal,
  action: Action,
  op: () => T,
): { ok: true; value: T } | { ok: false; code: "not_authorized" } {
  if (!isPermitted(role, action)) {
    return { ok: false, code: "not_authorized" };
  }
  return { ok: true, value: op() };
}
