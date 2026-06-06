/**
 * Notification Derivation (pure).
 *
 * Maps domain events to notifications with exactly-one-per-recipient semantics,
 * deduped deadline reminders, an unread-count derivation, and an idempotent
 * mark-read operation.
 *
 * _Requirements: 6.2, 8.8, 17.1, 17.2, 17.3, 17.4, 17.6, 17.7_
 */

import {
  DEADLINE_REMINDER_LEAD_MS,
  EpochMillis,
  Notification,
  NotificationKind,
  Task,
  UserId,
} from "./types.js";

export interface ApprovalEvent {
  kind: "approval";
  refType: string;
  refId: string;
  message: string;
}

export interface AssetStatusEvent {
  kind: "assetStatus";
  refType: string;
  refId: string;
  message: string;
}

export type TriggerEvent = ApprovalEvent | AssetStatusEvent;

let seq = 0;
function nextId(): string {
  return `notif-${++seq}`;
}

/**
 * Creates exactly one notification per responsible recipient for an approval
 * or asset-status event (Requirements 6.2, 8.8, 17.1, 17.4).
 */
export function notificationsFor(
  event: TriggerEvent,
  recipients: readonly UserId[],
  now: EpochMillis,
): Notification[] {
  const unique = Array.from(new Set(recipients));
  const kind: NotificationKind = event.kind;
  return unique.map((userId) => ({
    id: nextId(),
    userId,
    kind,
    refType: event.refType,
    refId: event.refId,
    message: event.message,
    state: "unread" as const,
    createdAt: now,
  }));
}

/** The dedup key for a task's deadline reminder. */
export function reminderDedupKey(taskId: string, deadline: EpochMillis): string {
  return `${taskId}:${deadline}`;
}

/**
 * Produces a deadline-reminder notification for a task if and only if the
 * current time has reached 24h-before-deadline, the task is not yet done, and
 * no reminder already exists for that (task, deadline) pair (Requirements
 * 17.2, 17.3).
 */
export function maybeReminderFor(
  task: Task,
  now: EpochMillis,
  existingDedupKeys: ReadonlySet<string>,
): Notification | null {
  const triggerAt = task.deadline - DEADLINE_REMINDER_LEAD_MS;
  if (now < triggerAt) return null;
  if (now >= task.deadline) return null;
  if (task.status === "Done") return null;
  const key = reminderDedupKey(task.id, task.deadline);
  if (task.reminderSent || existingDedupKeys.has(key)) return null;
  return {
    id: nextId(),
    userId: task.userId,
    kind: "deadline",
    refType: "Task",
    refId: task.id,
    message: `Tugas "${task.title}" mendekati tenggat.`,
    state: "unread",
    createdAt: now,
    dedupKey: key,
  };
}

/** Number of a user's notifications currently in the unread state (Requirement 17.6). */
export function unreadCount(notifications: readonly Notification[]): number {
  return notifications.reduce((n, x) => (x.state === "unread" ? n + 1 : n), 0);
}

/**
 * Marks a notification read by id. Idempotent: marking an already-read
 * notification leaves the set unchanged (Requirement 17.7).
 */
export function markRead(
  notifications: readonly Notification[],
  id: string,
): Notification[] {
  return notifications.map((n) =>
    n.id === id && n.state === "unread" ? { ...n, state: "read" } : n,
  );
}
