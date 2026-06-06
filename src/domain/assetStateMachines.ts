/**
 * Asset state machines (pure).
 *
 * One pure transition function per asset type (Banner, IG Story, Host Live,
 * Ads CPAS) over closed status sets. All require an existing associated campaign
 * at creation. SPV rejections route back per type and emit an Admin notification.
 * Schedule events are guarded on strictly-future times; Ads CPAS setup and IG
 * Story upload are guarded on completeness.
 *
 * _Requirements: 11.*, 12.*, 13.*, 14.*_
 */

import {
  AdsCPASStatus,
  BannerStatus,
  CampaignId,
  EpochMillis,
  HostLiveStatus,
  IGStoryStatus,
  Role,
} from "./types.js";

export interface AssetNotification {
  type: "notification";
  toRole: Role;
  kind: "rejection";
  message: string;
}

export type AssetTransition<S> =
  | { ok: true; status: S; notifications: AssetNotification[] }
  | { ok: false; status: S; reason: string };

function ok<S>(status: S, notifications: AssetNotification[] = []): AssetTransition<S> {
  return { ok: true, status, notifications };
}
function bad<S>(status: S, reason: string): AssetTransition<S> {
  return { ok: false, status, reason };
}

const REJECTION_NOTE: AssetNotification = {
  type: "notification",
  toRole: "Admin",
  kind: "rejection",
  message: "Aset ditolak oleh SPV dan dikembalikan untuk perbaikan.",
};

// ---------------------------------------------------------------------------
// Asset creation guard (Requirements 11.1/11.8, 12.1/12.6, 13.1, 14.1)
// ---------------------------------------------------------------------------

/**
 * Validates that an asset request references an existing campaign.
 * `existingCampaignIds` is the set of known campaign ids.
 */
export function canCreateAsset(
  campaignId: CampaignId | null | undefined,
  existingCampaignIds: ReadonlySet<CampaignId>,
): boolean {
  return (
    campaignId !== null &&
    campaignId !== undefined &&
    existingCampaignIds.has(campaignId)
  );
}

// ---------------------------------------------------------------------------
// Banner: Request -> Design -> Review -> Approve -> Schedule -> Live
// ---------------------------------------------------------------------------

export type BannerEvent =
  | { kind: "Upload"; hasFile: boolean }
  | { kind: "Review" }
  | { kind: "Approve" }
  | { kind: "Reject" }
  | { kind: "Schedule"; goLiveAt: EpochMillis; now: EpochMillis }
  | { kind: "TimerLive" };

export function bannerTransition(
  status: BannerStatus,
  event: BannerEvent,
): AssetTransition<BannerStatus> {
  switch (event.kind) {
    case "Upload":
      if (status !== "Request") return bad(status, "Upload invalid in current status.");
      if (!event.hasFile) return bad(status, "Design file is required.");
      return ok<BannerStatus>("Design");
    case "Review":
      if (status !== "Design") return bad(status, "Review invalid in current status.");
      return ok<BannerStatus>("Review");
    case "Approve":
      if (status !== "Review") return bad(status, "Approve invalid in current status.");
      return ok<BannerStatus>("Approve");
    case "Reject":
      // Banner Review -> Design + notify (Requirement 11.7)
      if (status !== "Review") return bad(status, "Reject invalid in current status.");
      return ok<BannerStatus>("Design", [REJECTION_NOTE]);
    case "Schedule":
      if (status !== "Approve") return bad(status, "Schedule invalid in current status.");
      if (event.goLiveAt <= event.now)
        return bad(status, "Go-live time must be in the future.");
      return ok<BannerStatus>("Schedule");
    case "TimerLive":
      if (status !== "Schedule") return bad(status, "TimerLive invalid in current status.");
      return ok<BannerStatus>("Live");
    default:
      return bad(status, "Unknown event.");
  }
}

// ---------------------------------------------------------------------------
// IG Story: Request -> Design -> Approve
// ---------------------------------------------------------------------------

export type IGStoryEvent =
  | { kind: "Upload"; hasFile: boolean }
  | { kind: "Approve" }
  | { kind: "Reject" };

export function igStoryTransition(
  status: IGStoryStatus,
  event: IGStoryEvent,
): AssetTransition<IGStoryStatus> {
  switch (event.kind) {
    case "Upload":
      if (status !== "Request") return bad(status, "Upload invalid in current status.");
      if (!event.hasFile) return bad(status, "Design file is required.");
      return ok<IGStoryStatus>("Design");
    case "Approve":
      if (status !== "Design") return bad(status, "Approve invalid in current status.");
      return ok<IGStoryStatus>("Approve");
    case "Reject":
      // Stays Design + notify (Requirement 12.4)
      if (status !== "Design") return bad(status, "Reject invalid in current status.");
      return ok<IGStoryStatus>("Design", [REJECTION_NOTE]);
    default:
      return bad(status, "Unknown event.");
  }
}

// ---------------------------------------------------------------------------
// Host Live: Request -> Design -> Approve -> Schedule -> Live
// ---------------------------------------------------------------------------

export type HostLiveEvent =
  | { kind: "Upload"; hasFile: boolean }
  | { kind: "Approve" }
  | { kind: "Reject" }
  | { kind: "Schedule"; sessionAt: EpochMillis; now: EpochMillis }
  | { kind: "TimerLive" };

export function hostLiveTransition(
  status: HostLiveStatus,
  event: HostLiveEvent,
): AssetTransition<HostLiveStatus> {
  switch (event.kind) {
    case "Upload":
      if (status !== "Request") return bad(status, "Upload invalid in current status.");
      if (!event.hasFile) return bad(status, "Design file is required.");
      return ok<HostLiveStatus>("Design");
    case "Approve":
      if (status !== "Design") return bad(status, "Approve invalid in current status.");
      return ok<HostLiveStatus>("Approve");
    case "Reject":
      // Stays Design + notify (Requirement 13.6)
      if (status !== "Design") return bad(status, "Reject invalid in current status.");
      return ok<HostLiveStatus>("Design", [REJECTION_NOTE]);
    case "Schedule":
      if (status !== "Approve") return bad(status, "Schedule invalid in current status.");
      if (event.sessionAt <= event.now)
        return bad(status, "Session time must be in the future.");
      return ok<HostLiveStatus>("Schedule");
    case "TimerLive":
      if (status !== "Schedule") return bad(status, "TimerLive invalid in current status.");
      return ok<HostLiveStatus>("Live");
    default:
      return bad(status, "Unknown event.");
  }
}

// ---------------------------------------------------------------------------
// Ads CPAS: Request -> Design -> Approve -> Setup_Complete
// ---------------------------------------------------------------------------

export type AdsCPASEvent =
  | { kind: "Upload"; hasFile: boolean }
  | { kind: "Approve" }
  | { kind: "Reject" }
  | { kind: "Setup"; missingFields: string[] };

export function adsCPASTransition(
  status: AdsCPASStatus,
  event: AdsCPASEvent,
): AssetTransition<AdsCPASStatus> {
  switch (event.kind) {
    case "Upload":
      if (status !== "Request") return bad(status, "Upload invalid in current status.");
      if (!event.hasFile) return bad(status, "Design file is required.");
      return ok<AdsCPASStatus>("Design");
    case "Approve":
      if (status !== "Design") return bad(status, "Approve invalid in current status.");
      return ok<AdsCPASStatus>("Approve");
    case "Reject":
      // Stays Design + notify (Requirement 14.6)
      if (status !== "Design") return bad(status, "Reject invalid in current status.");
      return ok<AdsCPASStatus>("Design", [REJECTION_NOTE]);
    case "Setup":
      // Requires all config fields (Requirement 14.5)
      if (status !== "Approve") return bad(status, "Setup invalid in current status.");
      if (event.missingFields.length > 0)
        return bad(status, "Required configuration fields are missing.");
      return ok<AdsCPASStatus>("Setup_Complete");
    default:
      return bad(status, "Unknown event.");
  }
}
