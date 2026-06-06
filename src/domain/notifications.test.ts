import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  markRead,
  maybeReminderFor,
  notificationsFor,
  reminderDedupKey,
  unreadCount,
} from "./notifications.js";
import {
  DEADLINE_REMINDER_LEAD_MS,
  Notification,
  Task,
} from "./types.js";

const triggerArb = fc.record({
  kind: fc.constantFrom("approval" as const, "assetStatus" as const),
  refType: fc.string({ minLength: 1, maxLength: 8 }),
  refId: fc.uuid(),
  message: fc.string({ minLength: 1, maxLength: 20 }),
});

describe("notifications", () => {
  // Feature: campaign-hub, Property 26: Triggering events create exactly one notification per recipient
  it("Property 26: exactly one notification per distinct recipient", () => {
    fc.assert(
      fc.property(
        triggerArb,
        fc.array(fc.uuid(), { maxLength: 10 }),
        (event, recipients) => {
          const result = notificationsFor(event, recipients, 1000);
          const distinct = new Set(recipients);
          expect(result.length).toBe(distinct.size);
          // one per distinct recipient, all carry the ref + message
          const userIds = new Set(result.map((n) => n.userId));
          expect(userIds).toEqual(distinct);
          for (const n of result) {
            expect(n.state).toBe("unread");
            expect(n.refId).toBe(event.refId);
            expect(n.message).toBe(event.message);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 27: Deadline reminders fire once at 24h before, with dedup
  it("Property 27: deadline reminder fires once at 24h before with dedup", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: DEADLINE_REMINDER_LEAD_MS + 1, max: 10_000_000_000 }),
        fc.integer({ min: -DEADLINE_REMINDER_LEAD_MS, max: DEADLINE_REMINDER_LEAD_MS }),
        (deadline, offset) => {
          const task: Task = {
            id: "t1",
            userId: "u1",
            title: "Tugas",
            status: "Open",
            deadline,
            reminderSent: false,
          };
          const triggerAt = deadline - DEADLINE_REMINDER_LEAD_MS;
          const now = triggerAt + offset;
          const first = maybeReminderFor(task, now, new Set());

          const inWindow = now >= triggerAt && now < deadline;
          if (inWindow) {
            expect(first).not.toBeNull();
            // dedup: a second tick with the key present yields null
            const key = reminderDedupKey(task.id, task.deadline);
            const second = maybeReminderFor(task, now, new Set([key]));
            expect(second).toBeNull();
          } else {
            expect(first).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 28: Unread count equals the number of unread notifications
  it("Property 28: unread count equals number of unread", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("unread" as const, "read" as const), {
          maxLength: 30,
        }),
        (states) => {
          const notifs: Notification[] = states.map((state, i) => ({
            id: String(i),
            userId: "u",
            kind: "approval",
            refType: "X",
            refId: "y",
            message: "m",
            state,
            createdAt: i,
          }));
          const expected = states.filter((s) => s === "unread").length;
          expect(unreadCount(notifs)).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-hub, Property 29: Marking read decrements by one and is idempotent
  it("Property 29: mark-read decrements by one and is idempotent", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("unread" as const, "read" as const), {
          minLength: 1,
          maxLength: 20,
        }),
        fc.nat(),
        (states, idx) => {
          const notifs: Notification[] = states.map((state, i) => ({
            id: String(i),
            userId: "u",
            kind: "approval",
            refType: "X",
            refId: "y",
            message: "m",
            state,
            createdAt: i,
          }));
          const target = String(idx % states.length);
          const before = unreadCount(notifs);
          const wasUnread =
            notifs.find((n) => n.id === target)?.state === "unread";
          const after = markRead(notifs, target);
          const afterCount = unreadCount(after);
          expect(afterCount).toBe(wasUnread ? before - 1 : before);
          // idempotent
          const again = markRead(after, target);
          expect(unreadCount(again)).toBe(afterCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
