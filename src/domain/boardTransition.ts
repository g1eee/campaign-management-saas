/**
 * Board transition model (pure) — single authority for Requirement 9.
 *
 * Governs Campaign_Status movements driven by the Kanban board (drag-and-drop
 * and bulk actions). Unlike the legacy event/step state machine
 * (`campaignStateMachine.ts`), this model defines transitions purely over
 * `CampaignStatus`: forward-adjacent and backward-adjacent moves, with Selesai
 * as a terminal status. It is I/O-free and deterministic so the lifecycle
 * integrity guarantees can be property-tested in isolation.
 *
 * Rules enforced by `transitionStatus`:
 * - A transition without an authenticated user (actor null) is rejected
 *   (Requirement 9.7).
 * - Dropping a card on its current column (from === to) is a valid no-op that
 *   produces no audit record (Requirement 6.4).
 * - A move out of Selesai to a different status is rejected; Selesai is
 *   terminal (Requirement 9.4).
 * - Any move that is not a Transisi_Valid is rejected with the status
 *   unchanged (Requirement 9.3).
 *
 * _Requirements: 6.1, 6.4, 9.1, 9.2, 9.3, 9.4, 9.7_
 */

import { CampaignStatus, EpochMillis, UserId } from "./types.js";

/**
 * Transisi_Valid (Requirement 9.2): forward-adjacent plus backward-adjacent
 * moves. Selesai is terminal and has no outgoing transitions (Requirement 9.4).
 *
 * | Dari      | Tujuan valid       |
 * |-----------|--------------------|
 * | Menunggu  | Proses             |
 * | Proses    | Review, Menunggu   |
 * | Review    | Live, Proses       |
 * | Live      | Selesai, Review    |
 * | Selesai   | (tidak ada)        |
 */
export const VALID_TRANSITIONS: Record<
  CampaignStatus,
  readonly CampaignStatus[]
> = {
  Menunggu: ["Proses"],
  Proses: ["Review", "Menunggu"],
  Review: ["Live", "Proses"],
  Live: ["Selesai", "Review"],
  Selesai: [],
} as const;

/**
 * True iff moving from `from` to `to` is allowed. A move to the same status
 * (`from === to`) is treated as a valid no-op (Requirement 6.4); otherwise the
 * move must be listed in `VALID_TRANSITIONS[from]` (Requirement 9.2).
 */
export function isValidTransition(
  from: CampaignStatus,
  to: CampaignStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Audit record emitted when a status actually changes (Requirements 6.2, 9.5).
 */
export interface BoardAudit {
  campaignId: string;
  timestamp: EpochMillis;
  fromStatus: CampaignStatus;
  toStatus: CampaignStatus;
  /** Acting user; required — transitions without a user are rejected (Req 9.7). */
  actor: UserId;
}

/**
 * Result of evaluating a board status move. On success the resulting status is
 * returned; an `audit` record is present only when the status actually changed
 * (a `from === to` no-op succeeds without an audit, Requirement 6.4).
 */
export type StatusTransitionResult =
  | { ok: true; status: CampaignStatus; audit?: BoardAudit }
  | { ok: false; reason: string };

/**
 * Evaluates a board status move. Rejects when: the actor is missing
 * (Requirement 9.7), the current status is Selesai and the target differs
 * (Selesai is terminal, Requirement 9.4), or the move is not a Transisi_Valid
 * (Requirement 9.3). A move where `from === to` succeeds without an audit
 * (Requirement 6.4). Any successful change to a different status emits a
 * complete audit record (Requirements 6.2, 9.5).
 */
export function transitionStatus(
  from: CampaignStatus,
  to: CampaignStatus,
  actor: UserId | null,
  now: EpochMillis,
  campaignId: string,
): StatusTransitionResult {
  // A transition request without an authenticated user is rejected (Req 9.7).
  if (actor === null) {
    return {
      ok: false,
      reason: "Transisi memerlukan pengguna terautentikasi.",
    };
  }

  // Dropping on the same column is a valid no-op with no audit (Req 6.4).
  if (from === to) {
    return { ok: true, status: from };
  }

  // Selesai is terminal: any move to a different status is rejected (Req 9.4).
  if (from === "Selesai") {
    return {
      ok: false,
      reason: "Campaign berstatus Selesai tidak dapat dipindahkan.",
    };
  }

  // Reject any move that is not a Transisi_Valid (Req 9.3).
  if (!isValidTransition(from, to)) {
    return { ok: false, reason: "Transisi status tidak diizinkan." };
  }

  // Valid change: emit a complete audit record (Req 6.2, 9.5).
  return {
    ok: true,
    status: to,
    audit: {
      campaignId,
      timestamp: now,
      fromStatus: from,
      toStatus: to,
      actor,
    },
  };
}
