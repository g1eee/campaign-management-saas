import { describe, expect, it } from "vitest";
import { AuthService } from "./authService.js";
import { LOCKOUT_DURATION_MS, SESSION_INACTIVITY_MS } from "../../domain/types.js";

function service(): AuthService {
  const auth = new AuthService();
  auth.registerAccount({
    userId: "u1",
    username: "spv",
    passwordHash: "secret",
    role: "SPV",
  });
  return auth;
}

describe("AuthService (integration)", () => {
  it("establishes a session on valid credentials and terminates on sign-out", () => {
    const auth = service();
    const result = auth.signIn("spv", "secret", 1000);
    expect(result.ok).toBe(true);
    expect(auth.getActiveSession("u1", 1000)).not.toBeNull();
    auth.signOut("u1");
    expect(auth.getActiveSession("u1", 1000)).toBeNull();
  });

  it("rejects invalid credentials", () => {
    const auth = service();
    const result = auth.signIn("spv", "wrong", 1000);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_credentials");
  });

  it("expires a session after 30 minutes of inactivity", () => {
    const auth = service();
    auth.signIn("spv", "secret", 1000);
    expect(auth.getActiveSession("u1", 1000 + SESSION_INACTIVITY_MS - 1)).not.toBeNull();
    expect(auth.getActiveSession("u1", 1000 + SESSION_INACTIVITY_MS)).toBeNull();
  });

  it("locks the account after 5 consecutive failures for 15 minutes", () => {
    const auth = service();
    for (let i = 0; i < 5; i++) auth.signIn("spv", "wrong", 1000 + i);
    const lockAt = 1004;
    expect(auth.isLocked("spv", lockAt)).toBe(true);
    // even correct credentials are denied while locked
    const denied = auth.signIn("spv", "secret", lockAt + 1);
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.reason).toBe("locked");
    // unlocks after the window
    expect(auth.isLocked("spv", lockAt + LOCKOUT_DURATION_MS)).toBe(false);
  });
});
