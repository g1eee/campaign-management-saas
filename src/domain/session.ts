/**
 * Session & lockout domain (pure).
 *
 * Pure decision functions for session inactivity expiry and account lockout.
 * Wired into the Authentication_Service infrastructure later.
 *
 * _Requirements: 1.5, 1.6_
 */

import {
  EpochMillis,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  SESSION_INACTIVITY_MS,
} from "./types.js";

/**
 * A session is expired iff it has been inactive for at least 30 minutes.
 * (Requirement 1.5)
 */
export function isExpired(lastActivity: EpochMillis, now: EpochMillis): boolean {
  return now - lastActivity >= SESSION_INACTIVITY_MS;
}

/** A single authentication attempt outcome. */
export interface AuthAttempt {
  success: boolean;
  at: EpochMillis;
}

export interface LockoutState {
  locked: boolean;
  /** When locked, the epoch millis at which the lockout expires. */
  lockedUntil?: EpochMillis;
  /** Count of consecutive failures at the end of the sequence. */
  consecutiveFailures: number;
}

/**
 * Computes the lockout state for an account given its attempt history and the
 * current time.
 *
 * Rules (Requirement 1.6):
 * - A successful attempt resets the consecutive-failure counter to 0.
 * - After 5 consecutive failures, the account is locked for 15 minutes,
 *   measured from the 5th (most recent triggering) failure.
 * - The account is considered locked only while `now` is within that window.
 */
export function lockoutState(
  attempts: readonly AuthAttempt[],
  now: EpochMillis,
): LockoutState {
  let consecutiveFailures = 0;
  let lockTriggeredAt: EpochMillis | undefined;

  for (const attempt of attempts) {
    if (attempt.success) {
      consecutiveFailures = 0;
      lockTriggeredAt = undefined;
    } else {
      consecutiveFailures += 1;
      // The lockout is (re)triggered on reaching the threshold; track the
      // timestamp of the failure that reached the threshold.
      if (consecutiveFailures === MAX_FAILED_ATTEMPTS) {
        lockTriggeredAt = attempt.at;
      } else if (consecutiveFailures > MAX_FAILED_ATTEMPTS) {
        lockTriggeredAt = attempt.at;
      }
    }
  }

  if (
    consecutiveFailures >= MAX_FAILED_ATTEMPTS &&
    lockTriggeredAt !== undefined
  ) {
    const lockedUntil = lockTriggeredAt + LOCKOUT_DURATION_MS;
    if (now < lockedUntil) {
      return { locked: true, lockedUntil, consecutiveFailures };
    }
  }

  return { locked: false, consecutiveFailures };
}
