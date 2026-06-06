/**
 * Authentication, session, and lockout infrastructure.
 *
 * Wires the pure session/lockout decisions into a session store: credential
 * verification, session establish/terminate, 30-minute inactivity expiry, and
 * 5-failure / 15-minute lockout.
 *
 * _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_
 */

import { EpochMillis, Role, Session, UserId } from "../../domain/types.js";
import { AuthAttempt, isExpired, lockoutState } from "../../domain/session.js";

export interface Account {
  userId: UserId;
  username: string;
  /** For this reference implementation, a plain comparison stands in for a hash. */
  passwordHash: string;
  role: Role;
}

export interface SignInSuccess {
  ok: true;
  session: Session;
}
export interface SignInFailure {
  ok: false;
  reason: "invalid_credentials" | "locked";
}
export type SignInResult = SignInSuccess | SignInFailure;

/** Verifies a credential against a stored hash (placeholder comparison). */
export function verifyPassword(input: string, stored: string): boolean {
  return input === stored;
}

export class AuthService {
  private readonly accounts = new Map<string, Account>(); // by username
  private readonly sessions = new Map<UserId, Session>();
  private readonly attempts = new Map<string, AuthAttempt[]>(); // by username

  registerAccount(account: Account): void {
    this.accounts.set(account.username, account);
  }

  /** Whether the account is currently locked (Requirement 1.6). */
  isLocked(username: string, now: EpochMillis): boolean {
    const history = this.attempts.get(username) ?? [];
    return lockoutState(history, now).locked;
  }

  signIn(username: string, password: string, now: EpochMillis): SignInResult {
    if (this.isLocked(username, now)) {
      return { ok: false, reason: "locked" };
    }
    const account = this.accounts.get(username);
    const success = account
      ? verifyPassword(password, account.passwordHash)
      : false;

    const history = this.attempts.get(username) ?? [];
    history.push({ success, at: now });
    this.attempts.set(username, history);

    if (!success || !account) {
      return { ok: false, reason: "invalid_credentials" };
    }

    const session: Session = {
      userId: account.userId,
      role: account.role,
      lastActivityAt: now,
    };
    this.sessions.set(account.userId, session);
    return { ok: true, session };
  }

  /** Returns the active session if present and not expired (Requirement 1.5). */
  getActiveSession(userId: UserId, now: EpochMillis): Session | null {
    const session = this.sessions.get(userId);
    if (!session) return null;
    if (isExpired(session.lastActivityAt, now)) {
      this.sessions.delete(userId);
      return null;
    }
    return session;
  }

  /** Refreshes activity for a live session. */
  touch(userId: UserId, now: EpochMillis): void {
    const session = this.getActiveSession(userId, now);
    if (session) {
      this.sessions.set(userId, { ...session, lastActivityAt: now });
    }
  }

  /** Terminates a session (Requirement 1.4). */
  signOut(userId: UserId): void {
    this.sessions.delete(userId);
  }
}
