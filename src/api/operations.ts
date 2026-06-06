/**
 * Store, Notification, Task, Report, and Master Data endpoints.
 *
 * Wires the corresponding pure domain modules to persistence.
 *
 * _Requirements: 16.1, 16.2, 16.3, 16.4, 17.5, 17.6, 17.7, 18.1, 18.3,
 *  19.1, 19.2, 19.4, 20.1, 20.2, 20.3, 20.6_
 */

import {
  Campaign,
  CampaignCategory,
  CampaignStatus,
  MasterDataId,
  MasterDataRecord,
  Notification,
  Principal,
  StoreCategoryId,
  StoreId,
  Task,
  TaskId,
  TaskStatus,
  TASK_STATUSES,
  UserId,
} from "../domain/types.js";
import {
  assignCampaign,
  buildBroadcastResult,
  BroadcastRequest,
  DeliveryOutcome,
  groupStores,
  StoreGroups,
} from "../domain/stores.js";
import {
  markRead,
  unreadCount,
} from "../domain/notifications.js";
import {
  countByCategory,
  countByStatus,
  DateRange,
  filterByDateRange,
  sortBy,
} from "../domain/collections.js";
import { checkUniqueIdentifier } from "../domain/masterData.js";
import { MasterDataReference } from "../domain/masterData.js";
import { Repositories } from "../infra/db/repositories.js";
import { authorize } from "./middleware/accessControl.js";

export type OpResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

// --- Stores ---
export class StoreService {
  constructor(private readonly repos: Repositories) {}

  list(): StoreGroups {
    return groupStores(this.repos.stores.all());
  }

  assignCampaign(role: Principal, storeId: StoreId, campaignId: string): OpResult<void> {
    return authorize(role, "UpdateProgress", () => {
      const store = this.repos.stores.get(storeId);
      if (!store) return { ok: false, reason: "Toko tidak ditemukan." };
      const r = assignCampaign(store, campaignId);
      if (!r.ok) return { ok: false, reason: r.reason };
      this.repos.stores.upsert(r.store);
      return { ok: true, value: undefined };
    });
  }

  assignCategory(role: Principal, storeId: StoreId, categoryId: StoreCategoryId): OpResult<void> {
    return authorize(role, "SetStrategy", () => {
      const store = this.repos.stores.get(storeId);
      if (!store) return { ok: false, reason: "Toko tidak ditemukan." };
      if (!store.categoryIds.includes(categoryId)) {
        this.repos.stores.upsert({
          ...store,
          categoryIds: [...store.categoryIds, categoryId],
        });
      }
      return { ok: true, value: undefined };
    });
  }

  /** Sends a broadcast; `outcomes` are produced by the delivery infrastructure. */
  broadcast(
    role: Principal,
    broadcastId: string,
    request: BroadcastRequest,
    outcomes: DeliveryOutcome[],
  ): OpResult<{ failedStoreIds: StoreId[] }> {
    return authorize(role, "UpdateProgress", () => {
      const result = buildBroadcastResult(broadcastId, request, outcomes);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, value: { failedStoreIds: result.failedStoreIds } };
    });
  }
}

// --- Notifications ---
export class NotificationService {
  constructor(private readonly repos: Repositories) {}

  /** Notifications for a user, most-recent-first (Requirement 17.5). */
  list(userId: UserId): Notification[] {
    return sortBy(this.repos.notifications.forUser(userId), (n) => n.createdAt, "desc");
  }

  unreadCount(userId: UserId): number {
    return unreadCount(this.repos.notifications.forUser(userId));
  }

  markRead(userId: UserId, id: string): void {
    const updated = markRead(this.repos.notifications.forUser(userId), id);
    for (const n of updated) this.repos.notifications.upsert(n);
  }
}

// --- Tasks ---
export class TaskService {
  constructor(private readonly repos: Repositories) {}

  list(userId: UserId): Task[] {
    return sortBy(this.repos.tasks.forUser(userId), (t) => t.deadline, "asc");
  }

  updateStatus(userId: UserId, id: TaskId, status: TaskStatus): OpResult<Task> {
    if (!TASK_STATUSES.includes(status)) {
      return { ok: false, reason: "Status tugas tidak valid." };
    }
    const task = this.repos.tasks.get(id);
    if (!task || task.userId !== userId) {
      return { ok: false, reason: "Tugas tidak ditemukan." };
    }
    const updated = { ...task, status };
    this.repos.tasks.upsert(updated);
    return { ok: true, value: updated };
  }
}

// --- Reports ---
export interface CampaignReport {
  byStatus: Record<CampaignStatus, number>;
  byCategory: Record<CampaignCategory, number>;
}

export class ReportService {
  constructor(private readonly repos: Repositories) {}

  summary(): CampaignReport {
    const campaigns = this.repos.campaigns.all();
    return {
      byStatus: countByStatus(campaigns),
      byCategory: countByCategory(campaigns),
    };
  }

  inRange(range: DateRange): OpResult<Campaign[]> {
    const result = filterByDateRange(
      this.repos.campaigns.all(),
      range,
      (c) => ({ start: c.timelineStart, end: c.timelineEnd }),
    );
    if (!result.ok) return { ok: false, reason: result.reason };
    return { ok: true, value: result.items };
  }
}

// --- Master Data ---
export class MasterDataService {
  constructor(private readonly repos: Repositories) {}

  upsert(
    role: Principal,
    record: MasterDataRecord,
    editingId?: MasterDataId,
  ): OpResult<MasterDataRecord> {
    return authorize(role, "SetStrategy", () => {
      const check = checkUniqueIdentifier(record, this.repos.masterData.all(), editingId);
      if (!check.ok) return { ok: false, reason: check.reason };
      this.repos.masterData.upsert(record);
      return { ok: true, value: record };
    });
  }

  delete(
    role: Principal,
    id: MasterDataId,
    references: MasterDataReference[],
  ): OpResult<void> {
    return authorize(role, "SetStrategy", () => {
      const result = this.repos.masterData.deleteGuarded(id, references);
      if (!result.ok) return { ok: false, reason: result.reason };
      return { ok: true, value: undefined };
    });
  }
}
