/**
 * Scheduler tick job.
 *
 * Runs at a <=30s interval, evaluating due time-triggered transitions through
 * the same pure state machines and notification derivation, recording the actor
 * as "System", and guarding with dedup keys against overlapping ticks. This
 * guarantees the 60-second SLA (Requirements 8.6, 8.7, 11.6, 13.5, 17.2).
 *
 * _Requirements: 8.6, 8.7, 11.6, 13.5, 17.2, 17.3, 9.3_
 */

import { EpochMillis } from "../../domain/types.js";
import { CampaignEffect, transition } from "../../domain/campaignStateMachine.js";
import {
  bannerTransition,
  hostLiveTransition,
} from "../../domain/assetStateMachines.js";
import { maybeReminderFor, reminderDedupKey } from "../../domain/notifications.js";
import { AssetService } from "../../api/assets.js";
import { Repositories } from "../db/repositories.js";

export interface TickReport {
  campaignsStarted: number;
  campaignsEnded: number;
  bannersLive: number;
  hostLivesLive: number;
  remindersCreated: number;
}

let auditSeq = 0;
let notifSeq = 0;

export class Scheduler {
  /** Dedup set of reminder keys already emitted (Requirement 17.3). */
  private readonly emittedReminders = new Set<string>();

  constructor(
    private readonly repos: Repositories,
    private readonly assets: AssetService,
  ) {}

  /** Processes all due time-triggered work as of `now`. Idempotent across ticks. */
  tick(now: EpochMillis): TickReport {
    const report: TickReport = {
      campaignsStarted: 0,
      campaignsEnded: 0,
      bannersLive: 0,
      hostLivesLive: 0,
      remindersCreated: 0,
    };

    for (const campaign of this.repos.campaigns.all()) {
      // Review -> Live when scheduled start reached (Requirement 8.6)
      if (
        campaign.status === "Review" &&
        campaign.scheduledStart !== undefined &&
        now >= campaign.scheduledStart
      ) {
        const r = transition(
          {
            status: campaign.status,
            step: campaign.step,
            calculated: campaign.calculation !== undefined,
            schemeComplete: true,
          },
          { kind: "TimerStart", at: now },
        );
        if (r.ok) {
          this.repos.campaigns.upsert({ ...campaign, status: r.state.status, step: r.state.step, updatedAt: now });
          this.recordAudits(campaign.id, r.effects, now);
          report.campaignsStarted += 1;
        }
      } else if (
        // Live -> Selesai when scheduled end reached (Requirement 8.7)
        campaign.status === "Live" &&
        campaign.scheduledEnd !== undefined &&
        now >= campaign.scheduledEnd
      ) {
        const r = transition(
          {
            status: campaign.status,
            step: campaign.step,
            calculated: campaign.calculation !== undefined,
            schemeComplete: true,
          },
          { kind: "TimerEnd", at: now },
        );
        if (r.ok) {
          this.repos.campaigns.upsert({ ...campaign, status: r.state.status, updatedAt: now });
          this.recordAudits(campaign.id, r.effects, now);
          report.campaignsEnded += 1;
        }
      }
    }

    // Banner go-live (Requirement 11.6)
    for (const banner of this.assets.banners.values()) {
      if (banner.status === "Schedule" && banner.goLiveAt !== undefined && now >= banner.goLiveAt) {
        const r = bannerTransition(banner.status, { kind: "TimerLive" });
        if (r.ok) {
          this.assets.banners.set(banner.id, { ...banner, status: r.status });
          report.bannersLive += 1;
        }
      }
    }

    // Host Live session start (Requirement 13.5)
    for (const hl of this.assets.hostLives.values()) {
      if (hl.status === "Schedule" && hl.sessionAt !== undefined && now >= hl.sessionAt) {
        const r = hostLiveTransition(hl.status, { kind: "TimerLive" });
        if (r.ok) {
          this.assets.hostLives.set(hl.id, { ...hl, status: r.status });
          report.hostLivesLive += 1;
        }
      }
    }

    // Deadline reminders 24h before, deduped (Requirements 17.2, 17.3)
    for (const task of this.repos.tasks.all()) {
      const reminder = maybeReminderFor(task, now, this.emittedReminders);
      if (reminder) {
        this.repos.notifications.upsert({ ...reminder, id: `notif-${++notifSeq}` });
        this.emittedReminders.add(reminderDedupKey(task.id, task.deadline));
        this.repos.tasks.upsert({ ...task, reminderSent: true });
        report.remindersCreated += 1;
      }
    }

    return report;
  }

  private recordAudits(
    campaignId: string,
    effects: CampaignEffect[],
    _now: EpochMillis,
  ): void {
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
      }
    }
  }
}
