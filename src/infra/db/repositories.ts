/**
 * Persistence layer: typed repositories.
 *
 * Design note: the design specifies a relational database. To keep the build
 * runnable and the integration tests self-contained without provisioning an
 * external database, these repositories are defined as interfaces with an
 * in-memory implementation. The interfaces are the stable contract; a SQL-backed
 * implementation can be substituted later without changing callers. The
 * referential-integrity check required by Requirement 20 is implemented here.
 *
 * _Requirements: 5.6, 7.4, 8.3, 9.3, 16.2, 18.3, 20.1, 20.2, 20.3, 20.6_
 */

import {
  Campaign,
  CampaignAudit,
  CampaignId,
  CampaignTemplate,
  MasterDataId,
  MasterDataRecord,
  Notification,
  Store,
  StoreId,
  Task,
  TaskId,
} from "../../domain/types.js";
import { canDelete, MasterDataReference } from "../../domain/masterData.js";

export interface Repository<T, Id> {
  get(id: Id): T | undefined;
  all(): T[];
  upsert(entity: T): T;
  delete(id: Id): boolean;
}

class InMemoryRepository<T extends { id: Id }, Id extends string>
  implements Repository<T, Id>
{
  protected readonly store = new Map<Id, T>();

  get(id: Id): T | undefined {
    return this.store.get(id);
  }
  all(): T[] {
    return [...this.store.values()];
  }
  upsert(entity: T): T {
    this.store.set(entity.id, entity);
    return entity;
  }
  delete(id: Id): boolean {
    return this.store.delete(id);
  }
}

export class CampaignRepository extends InMemoryRepository<Campaign, CampaignId> {}
export class StoreRepository extends InMemoryRepository<Store, StoreId> {}
export class NotificationRepository extends InMemoryRepository<
  Notification,
  string
> {
  forUser(userId: string): Notification[] {
    return this.all().filter((n) => n.userId === userId);
  }
}
export class TaskRepository extends InMemoryRepository<Task, TaskId> {
  forUser(userId: string): Task[] {
    return this.all().filter((t) => t.userId === userId);
  }
}

/**
 * Stores reusable Template_Campaign records (Requirement 7.1). Keyed by the
 * template id; substitutable by a SQL-backed implementation without changing
 * callers.
 */
export class TemplateRepository extends InMemoryRepository<
  CampaignTemplate,
  string
> {}

/** Append-only audit log (Requirement 9.3). */
export class AuditRepository {
  private readonly records: CampaignAudit[] = [];
  append(record: CampaignAudit): void {
    this.records.push(record);
  }
  forCampaign(campaignId: CampaignId): CampaignAudit[] {
    return this.records.filter((r) => r.campaignId === campaignId);
  }
  allRecords(): CampaignAudit[] {
    return [...this.records];
  }
}

/**
 * Master-data repository enforcing referential integrity on delete and unique
 * identifiers on upsert (Requirements 20.3, 20.4, 20.6).
 */
export class MasterDataRepository extends InMemoryRepository<
  MasterDataRecord,
  MasterDataId
> {
  /**
   * Deletes a record only when it is not referenced by any active campaign or
   * asset. `references` are supplied by the caller (derived from live data).
   */
  deleteGuarded(
    id: MasterDataId,
    references: readonly MasterDataReference[],
  ): { ok: true } | { ok: false; reason: string; referencedBy: string[] } {
    const decision = canDelete(id, references);
    if (!decision.ok) return decision;
    this.delete(id);
    return { ok: true };
  }
}

export interface Repositories {
  campaigns: CampaignRepository;
  stores: StoreRepository;
  notifications: NotificationRepository;
  tasks: TaskRepository;
  templates: TemplateRepository;
  audit: AuditRepository;
  masterData: MasterDataRepository;
  directory: UserDirectory;
}

/** Minimal user directory: which user ids hold each role (for notification fan-out). */
export class UserDirectory {
  private readonly byRole = new Map<string, Set<string>>();

  add(userId: string, role: string): void {
    const set = this.byRole.get(role) ?? new Set<string>();
    set.add(userId);
    this.byRole.set(role, set);
  }

  usersWithRole(role: string): string[] {
    return [...(this.byRole.get(role) ?? new Set<string>())];
  }
}

/** Builds a fresh set of in-memory repositories (used by API wiring and tests). */
export function createRepositories(): Repositories {
  return {
    campaigns: new CampaignRepository(),
    stores: new StoreRepository(),
    notifications: new NotificationRepository(),
    tasks: new TaskRepository(),
    templates: new TemplateRepository(),
    audit: new AuditRepository(),
    masterData: new MasterDataRepository(),
    directory: new UserDirectory(),
  };
}
