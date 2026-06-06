/**
 * Campaign and calculation endpoints.
 *
 * Wires the campaign state machine and calculation service to persistence,
 * recording audit records and derived notifications on each transition. All
 * mutating operations are guarded by the access-control middleware.
 *
 * _Requirements: 5.6, 6.1, 6.2, 7.1, 7.2, 7.4, 8.1, 8.2, 8.3, 8.5, 8.8, 9.3_
 */

import {
  Campaign,
  CampaignId,
  CampaignSchedule,
  CampaignScheme,
  EpochMillis,
  Principal,
  UserId,
} from "../domain/types.js";
import {
  CampaignEffect,
  CampaignEvent,
  CampaignSmState,
  transition,
} from "../domain/campaignStateMachine.js";
import { calculate, SchemeInputs } from "../domain/calculation.js";
import {
  isSchemeValid,
  newCampaignFromScheme,
  validateScheme,
  Violation,
} from "../domain/validation.js";
import { Repositories } from "../infra/db/repositories.js";
import { authorize } from "./middleware/accessControl.js";

let auditSeq = 0;
let notifSeq = 0;

export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string; violations?: Violation[] };

function smStateOf(c: Campaign): CampaignSmState {
  return {
    status: c.status,
    step: c.step,
    calculated: c.calculation !== undefined,
    schemeComplete: isSchemeValid(c.scheme),
    schedule:
      c.scheduledStart !== undefined && c.scheduledEnd !== undefined
        ? { start: c.scheduledStart, end: c.scheduledEnd }
        : undefined,
  };
}

export class CampaignService {
  constructor(private readonly repos: Repositories) {}

  /** Persists side effects (audit, notifications) emitted by a transition. */
  private persistEffects(campaignId: CampaignId, effects: CampaignEffect[], at: EpochMillis): void {
    for (const effect of effects) {
      if (effect.type === "audit") {
        this.repos.audit.append({
          id: `audit-${++auditSeq}`,
          campaignId,
          timestamp: effect.at,
          fromStatus: effect.fromStatus,
          toStatus: effect.toStatus,
          fromStep: effect.fromStep,
          toStep: effect.toStep,
          actor: effect.actor,
        });
      } else {
        // notification effect: fan out to all users of the target role
        const recipients = this.usersWithRole(effect.toRole);
        for (const userId of recipients) {
          this.repos.notifications.upsert({
            id: `notif-${++notifSeq}`,
            userId,
            kind: "approval",
            refType: "Campaign",
            refId: campaignId,
            message: effect.message,
            state: "unread",
            createdAt: at,
          });
        }
      }
    }
  }

  /** Resolves the user ids that hold a given role. */
  private usersWithRole(role: string): UserId[] {
    return this.repos.directory.usersWithRole(role);
  }

  /** Creates and persists a new campaign from a scheme (Requirement 5.6). */
  createScheme(
    role: Principal,
    scheme: CampaignScheme,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "CreateScheme", () => {
      const violations = validateScheme(scheme);
      if (violations.length > 0) {
        return { ok: false, reason: "Skema tidak valid.", violations };
      }
      const campaign = newCampaignFromScheme(scheme, now);
      this.repos.campaigns.upsert(campaign);
      return { ok: true, value: campaign };
    });
  }

  private applyEvent(
    campaignId: CampaignId,
    event: CampaignEvent,
    mutate: (c: Campaign) => Campaign,
    at: EpochMillis,
  ): ApiResult<Campaign> {
    const campaign = this.repos.campaigns.get(campaignId);
    if (!campaign) return { ok: false, reason: "Campaign tidak ditemukan." };
    const result = transition(smStateOf(campaign), event);
    if (!result.ok) return { ok: false, reason: result.reason };
    const updated = mutate({
      ...campaign,
      status: result.state.status,
      step: result.state.step,
      updatedAt: at,
    });
    this.repos.campaigns.upsert(updated);
    this.persistEffects(campaignId, result.effects, at);
    return { ok: true, value: updated };
  }

  /** SPV submits a campaign (Requirements 6.1, 6.2). */
  submit(role: Principal, id: CampaignId, actor: UserId, now: EpochMillis): ApiResult<Campaign> {
    return authorize(role, "SubmitCampaign", () =>
      this.applyEvent(id, { kind: "Submit", actor, role: "SPV", at: now }, (c) => c, now),
    );
  }

  /** Admin computes the calculation (Requirements 7.1, 7.2). */
  calculateCampaign(
    role: Principal,
    id: CampaignId,
    inputs: SchemeInputs,
  ): ApiResult<Campaign> {
    return authorize(role, "CalculateCampaign", () => {
      const campaign = this.repos.campaigns.get(id);
      if (!campaign) return { ok: false, reason: "Campaign tidak ditemukan." };
      const calculation = calculate(inputs);
      const updated = { ...campaign, calculation };
      this.repos.campaigns.upsert(updated);
      return { ok: true, value: updated };
    });
  }

  /** Admin approves a calculated campaign to advance to execution (Requirements 8.1, 8.2). */
  approve(role: Principal, id: CampaignId, actor: UserId, now: EpochMillis): ApiResult<Campaign> {
    return authorize(role, "UpdateProgress", () =>
      this.applyEvent(id, { kind: "Approve", actor, role: "Admin", at: now }, (c) => c, now),
    );
  }

  /** Admin schedules an approved campaign (Requirement 8.3). */
  schedule(
    role: Principal,
    id: CampaignId,
    actor: UserId,
    schedule: CampaignSchedule,
    now: EpochMillis,
  ): ApiResult<Campaign> {
    return authorize(role, "UpdateProgress", () =>
      this.applyEvent(
        id,
        { kind: "Schedule", actor, role: "Admin", at: now, schedule },
        (c) => ({ ...c, scheduledStart: schedule.start, scheduledEnd: schedule.end }),
        now,
      ),
    );
  }

  /** SPV approves execution (Requirement 8.5). */
  reviewApprove(role: Principal, id: CampaignId, actor: UserId, now: EpochMillis): ApiResult<Campaign> {
    return authorize(role, "ReviewExecution", () =>
      this.applyEvent(id, { kind: "ReviewApprove", actor, role: "SPV", at: now }, (c) => c, now),
    );
  }

  /** SPV rejects execution (Requirement 8.8). */
  reviewReject(role: Principal, id: CampaignId, actor: UserId, now: EpochMillis): ApiResult<Campaign> {
    return authorize(role, "ReviewExecution", () =>
      this.applyEvent(id, { kind: "ReviewReject", actor, role: "SPV", at: now }, (c) => c, now),
    );
  }
}
