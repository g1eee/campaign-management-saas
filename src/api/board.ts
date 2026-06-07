/**
 * Board endpoints — Campaign Manager pivot (BoardService).
 *
 * Wires the pure board-domain modules (quickAdd, boardTransition, validation,
 * duplication, bulkActions, search) to persistence, recording transition audit
 * records. All mutating operations are guarded by the access-control
 * middleware, mirroring the conventions used by `CampaignService`.
 *
 * The domain modules are deterministic and I/O-free; this layer is the single
 * place where access control, persistence, and audit logging are applied:
 * - Tambah_Cepat (Requirement 3): `quickAdd`.
 * - Seret-dan-lepas / status moves (Requirements 6, 9): `moveCampaign`.
 * - Inline edit / detail panel (Requirements 4, 5): `editField`, `addPromoOption`.
 * - Duplikasi (Requirement 8): `duplicateCampaign`.
 * - Aksi massal (Requirement 10): `bulkSetCategory`, `bulkMove`, `bulkDelete`.
 * - Pencarian (Requirement 11): `search`.
 *
 * _Requirements: 3.1, 4.1, 5.2, 6.1, 6.2, 8.1, 8.3, 9.5, 10.1, 10.2, 10.5, 11.1_
 */

import {
  Campaign,
  CampaignCategory,
  CampaignId,
  CampaignStatus,
  DEFAULT_DRAFT_CATEGORY,
  EpochMillis,
  Principal,
  UserId,
} from "../domain/types.js";
import { createDraft } from "../domain/quickAdd.js";
import { transitionStatus } from "../domain/boardTransition.js";
import {
  addPromoOption as addPromoOptionToScheme,
  applyFieldPatch,
  SchemePatch,
} from "../domain/validation.js";
import { duplicate } from "../domain/duplication.js";
import {
  BulkFailure,
  bulkMove as bulkMoveDomain,
  bulkSetCategory as bulkSetCategoryDomain,
  validateSelection,
} from "../domain/bulkActions.js";
import { searchCampaigns, SearchCriteria } from "../domain/search.js";
import { Repositories } from "../infra/db/repositories.js";
import { authorize } from "./middleware/accessControl.js";
import { ApiResult } from "./campaign.js";

let auditSeq = 0;

/** Result of a bulk update action: how many were updated, plus per-item failures. */
export interface BulkOutcome {
  updated: number;
  failures: BulkFailure[];
}

export class BoardService {
  constructor(private readonly repos: Repositories) {}

  /**
   * Records a single board status transition in the append-only audit log
   * (Requirements 6.2, 9.5). The board model does not change the legacy `step`,
   * so the step fields are kept stable at the campaign's current step.
   */
  private appendTransitionAudit(
    campaignId: CampaignId,
    fromStatus: CampaignStatus,
    toStatus: CampaignStatus,
    step: Campaign["step"],
    actor: UserId,
    at: EpochMillis,
  ): void {
    this.repos.audit.append({
      id: `board-audit-${++auditSeq}`,
      campaignId,
      timestamp: at,
      fromStatus,
      toStatus,
      fromStep: step,
      toStep: step,
      actor,
    });
  }

  /**
   * Tambah_Cepat: creates a Campaign_Draft from a name (Requirement 3.1). The
   * draft always starts at status Menunggu with the neutral default category,
   * regardless of the column it was activated on.
   */
  quickAdd(
    role: Principal,
    name: string,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "CreateCampaign", () => {
      const result = createDraft(name, now, DEFAULT_DRAFT_CATEGORY);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      this.repos.campaigns.upsert(result.campaign);
      return { ok: true, value: result.campaign };
    });
  }

  /**
   * Moves a Campaign to a target status via the board transition model
   * (Requirements 6.1, 6.3, 9.x). On a valid change the new status is persisted
   * and a complete audit record is written (Requirements 6.2, 9.5). A move to
   * the same column is a valid no-op with no audit (Requirement 6.4).
   */
  moveCampaign(
    role: Principal,
    id: CampaignId,
    toStatus: CampaignStatus,
    actor: UserId,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "MoveCampaign", () => {
      const campaign = this.repos.campaigns.get(id);
      if (!campaign) {
        return { ok: false, reason: "Campaign tidak ditemukan." };
      }

      // Treat an empty/whitespace actor as unauthenticated (Requirement 9.7).
      const effectiveActor =
        actor && actor.trim().length > 0 ? actor : null;

      const result = transitionStatus(
        campaign.status,
        toStatus,
        effectiveActor,
        now,
        id,
      );
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }

      // No audit means a same-column no-op: keep the campaign unchanged.
      if (!result.audit) {
        return { ok: true, value: campaign };
      }

      const updated: Campaign = {
        ...campaign,
        status: result.status,
        updatedAt: now,
      };
      this.repos.campaigns.upsert(updated);
      this.appendTransitionAudit(
        id,
        result.audit.fromStatus,
        result.audit.toStatus,
        campaign.step,
        result.audit.actor,
        result.audit.timestamp,
      );
      return { ok: true, value: updated };
    });
  }

  /**
   * Applies an inline field patch to a Campaign's scheme (Requirements 4.1,
   * 5.2). Valid values are saved; invalid values are rejected with the offending
   * field reported and the previous value preserved (Requirements 4.4, 5.3).
   */
  editField(
    role: Principal,
    id: CampaignId,
    patch: SchemePatch,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "EditCampaign", () => {
      const campaign = this.repos.campaigns.get(id);
      if (!campaign) {
        return { ok: false, reason: "Campaign tidak ditemukan." };
      }

      const result = applyFieldPatch(campaign.scheme, patch);
      if (!result.ok) {
        return {
          ok: false,
          reason: "Nilai tidak valid.",
          violations: result.violations,
        };
      }

      const nextScheme = result.scheme;
      const updated: Campaign = {
        ...campaign,
        name: nextScheme.name,
        category: nextScheme.category ?? campaign.category,
        timelineStart: nextScheme.timelineStart ?? campaign.timelineStart,
        timelineEnd: nextScheme.timelineEnd ?? campaign.timelineEnd,
        targetStoreIds: [...nextScheme.targetStoreIds],
        scheme: nextScheme,
        updatedAt: now,
      };
      this.repos.campaigns.upsert(updated);
      return { ok: true, value: updated };
    });
  }

  /**
   * Adds a single Opsi_Promo to a Campaign's scheme (Requirements 5.4, 5.5,
   * 5.6). Rejects when the discount is invalid or the 20-option limit is
   * reached, leaving the campaign unchanged.
   */
  addPromoOption(
    role: Principal,
    id: CampaignId,
    discountPct: number,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "EditCampaign", () => {
      const campaign = this.repos.campaigns.get(id);
      if (!campaign) {
        return { ok: false, reason: "Campaign tidak ditemukan." };
      }

      const result = addPromoOptionToScheme(campaign.scheme, discountPct);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }

      const updated: Campaign = {
        ...campaign,
        scheme: result.scheme,
        updatedAt: now,
      };
      this.repos.campaigns.upsert(updated);
      return { ok: true, value: updated };
    });
  }

  /**
   * Duplicates a Campaign as an independent copy at status Menunggu
   * (Requirements 8.1, 8.2, 8.3). Rejects when the source no longer exists,
   * leaving all campaigns unchanged (Requirement 8.4).
   */
  duplicateCampaign(
    role: Principal,
    id: CampaignId,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "DuplicateCampaign", () => {
      const source = this.repos.campaigns.get(id);
      if (!source) {
        return { ok: false, reason: "Campaign sumber tidak lagi tersedia." };
      }

      const copy = duplicate(source, now);
      this.repos.campaigns.upsert(copy);
      return { ok: true, value: copy };
    });
  }

  /** Resolves the existing Campaigns for a list of ids, skipping unknown ids. */
  private resolveSelection(ids: readonly CampaignId[]): Campaign[] {
    const found: Campaign[] = [];
    for (const id of ids) {
      const campaign = this.repos.campaigns.get(id);
      if (campaign) {
        found.push(campaign);
      }
    }
    return found;
  }

  /**
   * Applies one Campaign_Category to every selected Campaign (Requirement 10.1).
   * Rejects an out-of-bounds selection (Requirements 10.7, 10.8).
   */
  bulkSetCategory(
    role: Principal,
    ids: CampaignId[],
    category: CampaignCategory,
    now: EpochMillis,
  ): ApiResult<BulkOutcome> {
    return authorize(role, "BulkAction", () => {
      const selected = this.resolveSelection(ids);
      const result = bulkSetCategoryDomain(selected, category, now);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      for (const campaign of result.updated) {
        this.repos.campaigns.upsert(campaign);
      }
      return {
        ok: true,
        value: { updated: result.updated.length, failures: result.failures },
      };
    });
  }

  /**
   * Applies a status move to every selected Campaign whose move is a
   * Transisi_Valid; the rest are reported as failures for a partial-success
   * report (Requirements 10.2, 10.3). Each successful move is audited
   * (Requirement 9.5). Rejects an out-of-bounds selection (Requirements 10.7,
   * 10.8).
   */
  bulkMove(
    role: Principal,
    ids: CampaignId[],
    toStatus: CampaignStatus,
    actor: UserId,
    now: EpochMillis,
  ): ApiResult<BulkOutcome> {
    return authorize(role, "BulkAction", () => {
      const selected = this.resolveSelection(ids);
      const priorStatusById = new Map<CampaignId, CampaignStatus>(
        selected.map((c) => [c.id, c.status]),
      );

      const result = bulkMoveDomain(selected, toStatus, actor, now);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }

      for (const campaign of result.updated) {
        this.repos.campaigns.upsert(campaign);
        const fromStatus = priorStatusById.get(campaign.id);
        if (fromStatus !== undefined && fromStatus !== campaign.status) {
          this.appendTransitionAudit(
            campaign.id,
            fromStatus,
            campaign.status,
            campaign.step,
            actor,
            now,
          );
        }
      }
      return {
        ok: true,
        value: { updated: result.updated.length, failures: result.failures },
      };
    });
  }

  /**
   * Deletes every selected Campaign (Requirement 10.5); the confirmation flow
   * is handled by the UI (Requirements 10.4, 10.6). Rejects an out-of-bounds
   * selection (Requirements 10.7, 10.8), leaving all campaigns unchanged.
   */
  bulkDelete(
    role: Principal,
    ids: CampaignId[],
    now: EpochMillis,
  ): ApiResult<{ deleted: number }> {
    // `now` is part of the stable signature for symmetry with other bulk ops;
    // deletion itself carries no timestamped state.
    void now;
    return authorize(role, "BulkAction", () => {
      const sizeCheck = validateSelection(ids.length);
      if (!sizeCheck.ok) {
        return { ok: false, reason: sizeCheck.reason };
      }

      let deleted = 0;
      for (const id of ids) {
        if (this.repos.campaigns.delete(id)) {
          deleted += 1;
        }
      }
      return { ok: true, value: { deleted } };
    });
  }

  /**
   * Searches/filters all Campaigns by case-insensitive name substring AND an
   * optional category (Requirements 11.1-11.5). Rejects search text longer than
   * the limit, leaving callers to keep their previous result (Requirement 11.6).
   */
  search(criteria: SearchCriteria): ApiResult<Campaign[]> {
    const result = searchCampaigns(this.repos.campaigns.all(), criteria);
    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }
    return { ok: true, value: result.matched };
  }
}
