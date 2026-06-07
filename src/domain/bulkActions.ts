/**
 * Aksi Massal (Requirement 10) — pure, I/O-free bulk operations.
 *
 * Applies a single change to a selection of Campaigns at once. This module is
 * deterministic and side-effect free: persistence, access control, the delete
 * confirmation flow (Requirements 10.4–10.6), and audit logging live in the API
 * layer that wraps these functions. Each function returns new Campaign objects
 * rather than mutating the inputs, so callers keep full control over what is
 * persisted.
 *
 * - `validateSelection` enforces the shared selection-size bounds: at least one
 *   and at most 100 Campaigns (Requirements 10.7, 10.8).
 * - `bulkSetCategory` applies one Campaign_Category to every selected Campaign
 *   (Requirement 10.1).
 * - `bulkMove` applies a status move only to the selected Campaigns whose move
 *   is a Transisi_Valid, reporting the rest as failures so callers can render a
 *   partial-success report (Requirements 10.2, 10.3).
 *
 * _Requirements: 10.1, 10.2, 10.3, 10.7, 10.8_
 */

import { isValidTransition } from "./boardTransition.js";
import {
  BULK_MAX,
  BULK_MIN,
  Campaign,
  CampaignCategory,
  CampaignStatus,
  EpochMillis,
  UserId,
} from "./types.js";

/** A single Campaign that could not be processed in a bulk action. */
export interface BulkFailure {
  campaignId: string;
  reason: string;
}

/**
 * Outcome of a bulk action. A `false` result means the action was rejected
 * outright because the selection size was invalid (0 selected or > 100,
 * Requirements 10.7, 10.8). A `true` result carries the successfully updated
 * Campaigns plus any per-Campaign failures, supporting partial success
 * (Requirement 10.3).
 */
export type BulkResult<T> =
  | { ok: true; updated: T[]; failures: BulkFailure[] }
  | { ok: false; reason: string };

/**
 * Validates the size of a bulk selection (Requirements 10.7, 10.8). Rejects an
 * empty selection (Requirement 10.7) and a selection larger than 100
 * (Requirement 10.8); accepts any count in the inclusive range 1..100.
 */
export function validateSelection(
  count: number,
): { ok: true } | { ok: false; reason: string } {
  if (count < BULK_MIN) {
    return {
      ok: false,
      reason: "Pilih setidaknya satu campaign untuk aksi massal.",
    };
  }
  if (count > BULK_MAX) {
    return {
      ok: false,
      reason: `Maksimal ${BULK_MAX} campaign dapat diproses dalam satu aksi massal.`,
    };
  }
  return { ok: true };
}

/**
 * Applies a single Campaign_Category to every selected Campaign
 * (Requirement 10.1). Rejects the whole action when the selection size is out
 * of bounds (Requirements 10.7, 10.8). On success returns independent copies of
 * each Campaign with the new category (kept in sync with `scheme.category`) and
 * a refreshed `updatedAt`; the inputs are never mutated. No per-Campaign
 * failures are possible for a category change, so `failures` is always empty.
 */
export function bulkSetCategory(
  selected: readonly Campaign[],
  category: CampaignCategory,
  now: EpochMillis,
): BulkResult<Campaign> {
  const sizeCheck = validateSelection(selected.length);
  if (!sizeCheck.ok) {
    return sizeCheck;
  }

  const updated = selected.map((campaign) => ({
    ...campaign,
    category,
    scheme: { ...campaign.scheme, category },
    updatedAt: now,
  }));

  return { ok: true, updated, failures: [] };
}

/**
 * Applies a status move to every selected Campaign whose move from its current
 * status to `toStatus` is a Transisi_Valid (Requirement 10.2); Campaigns whose
 * move is not valid are left unchanged and reported as failures, yielding a
 * partial-success result (Requirement 10.3). Rejects the whole action when the
 * selection size is out of bounds (Requirements 10.7, 10.8) or when no acting
 * user is supplied (a status transition requires an authenticated user).
 *
 * Updated Campaigns are independent copies with the new status and a refreshed
 * `updatedAt`; the inputs are never mutated.
 */
export function bulkMove(
  selected: readonly Campaign[],
  toStatus: CampaignStatus,
  actor: UserId,
  now: EpochMillis,
): BulkResult<Campaign> {
  const sizeCheck = validateSelection(selected.length);
  if (!sizeCheck.ok) {
    return sizeCheck;
  }
  if (actor.trim().length === 0) {
    return {
      ok: false,
      reason: "Transisi memerlukan pengguna terautentikasi.",
    };
  }

  const updated: Campaign[] = [];
  const failures: BulkFailure[] = [];

  for (const campaign of selected) {
    if (isValidTransition(campaign.status, toStatus)) {
      updated.push({ ...campaign, status: toStatus, updatedAt: now });
    } else {
      failures.push({
        campaignId: campaign.id,
        reason: `Transisi dari ${campaign.status} ke ${toStatus} tidak diizinkan.`,
      });
    }
  }

  return { ok: true, updated, failures };
}
