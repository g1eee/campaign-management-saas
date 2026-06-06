import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { AuthAttempt, isExpired, lockoutState } from "./session.js";
import {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
  SESSION_INACTIVITY_MS,
} from "./types.js";

describe("session", () => {
  // Feature: campaign-hub, Property 4: Inactivity expiry is exact
  it("Property 4: inactivity expiry is exact (>= 30 minutes)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000_000 }),
        fc.integer({ min: 0, max: 5 * SESSION_INACTIVITY_MS }),
        (lastActivity, delta) => {
          const now = lastActivity + delta;
          expect(isExpired(lastActivity, now)).toBe(
            delta >= SESSION_INACTIVITY_MS,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 5: Lockout after five consecutive failures
  it("Property 5: lockout after five consecutive failures within the 15-min window", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            success: fc.boolean(),
            // attempts in chronological order; use a monotonically increasing base later
            gap: fc.integer({ min: 0, max: 1000 }),
          }),
          { maxLength: 30 },
        ),
        fc.integer({ min: 0, max: 2 * LOCKOUT_DURATION_MS }),
        (raw, nowOffset) => {
          // Build chronologically increasing timestamps.
          let t = 1_000_000;
          const attempts: AuthAttempt[] = raw.map((r) => {
            t += r.gap + 1;
            return { success: r.success, at: t };
          });

          // Compute expected consecutive failures and trigger time independently.
          let consec = 0;
          let triggeredAt: number | undefined;
          for (const a of attempts) {
            if (a.success) {
              consec = 0;
              triggeredAt = undefined;
            } else {
              consec += 1;
              if (consec >= MAX_FAILED_ATTEMPTS) triggeredAt = a.at;
            }
          }

          const lastAt = attempts.length ? attempts[attempts.length - 1].at : 0;
          const now = lastAt + nowOffset;
          const state = lockoutState(attempts, now);

          expect(state.consecutiveFailures).toBe(consec);
          const shouldBeLocked =
            consec >= MAX_FAILED_ATTEMPTS &&
            triggeredAt !== undefined &&
            now < triggeredAt + LOCKOUT_DURATION_MS;
          expect(state.locked).toBe(shouldBeLocked);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("locks exactly when 5 failures occur and unlocks after 15 minutes", () => {
    const attempts: AuthAttempt[] = [];
    for (let i = 0; i < 5; i++) attempts.push({ success: false, at: 1000 + i });
    const triggerAt = 1004;
    expect(lockoutState(attempts, triggerAt).locked).toBe(true);
    expect(lockoutState(attempts, triggerAt + LOCKOUT_DURATION_MS - 1).locked).toBe(
      true,
    );
    expect(lockoutState(attempts, triggerAt + LOCKOUT_DURATION_MS).locked).toBe(
      false,
    );
  });

  it("a success resets the failure counter", () => {
    const attempts: AuthAttempt[] = [
      { success: false, at: 1 },
      { success: false, at: 2 },
      { success: false, at: 3 },
      { success: false, at: 4 },
      { success: true, at: 5 },
      { success: false, at: 6 },
    ];
    const state = lockoutState(attempts, 7);
    expect(state.consecutiveFailures).toBe(1);
    expect(state.locked).toBe(false);
  });
});
