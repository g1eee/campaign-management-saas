/**
 * Asset endpoints.
 *
 * Wires the four asset state machines to persistence for
 * request/upload/review/approve/reject/schedule/setup, persisting state and
 * derived rejection notifications.
 *
 * _Requirements: 11.*, 12.*, 13.*, 14.* (request/design/approve flows)_
 */

import {
  AdsCPAS,
  AssetId,
  Banner,
  CampaignId,
  EpochMillis,
  HostLive,
  IGStory,
  Principal,
} from "../domain/types.js";
import {
  adsCPASTransition,
  AdsCPASEvent,
  AssetNotification,
  bannerTransition,
  BannerEvent,
  canCreateAsset,
  hostLiveTransition,
  HostLiveEvent,
  igStoryTransition,
  IGStoryEvent,
} from "../domain/assetStateMachines.js";
import { Repositories } from "../infra/db/repositories.js";
import { authorize } from "./middleware/accessControl.js";

export type AssetApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

let assetSeq = 0;
let notifSeq = 0;

export class AssetService {
  // In-memory asset stores (kept local to the service for this layer).
  readonly banners = new Map<AssetId, Banner>();
  readonly igStories = new Map<AssetId, IGStory>();
  readonly hostLives = new Map<AssetId, HostLive>();
  readonly adsCPAS = new Map<AssetId, AdsCPAS>();

  constructor(private readonly repos: Repositories) {}

  private existingCampaignIds(): Set<CampaignId> {
    return new Set(this.repos.campaigns.all().map((c) => c.id));
  }

  private fanOutRejections(refId: string, notes: AssetNotification[], at: EpochMillis): void {
    for (const note of notes) {
      for (const userId of this.repos.directory.usersWithRole(note.toRole)) {
        this.repos.notifications.upsert({
          id: `notif-${++notifSeq}`,
          userId,
          kind: "assetStatus",
          refType: "Asset",
          refId,
          message: note.message,
          state: "unread",
          createdAt: at,
        });
      }
    }
  }

  // --- Banner ---
  requestBanner(role: Principal, campaignId: CampaignId): AssetApiResult<Banner> {
    return authorize(role, "PrepareAsset", () => {
      if (!canCreateAsset(campaignId, this.existingCampaignIds())) {
        return { ok: false, reason: "Campaign terkait tidak ditemukan." };
      }
      const banner: Banner = { id: `banner-${++assetSeq}`, campaignId, status: "Request" };
      this.banners.set(banner.id, banner);
      return { ok: true, value: banner };
    });
  }

  bannerEvent(role: Principal, id: AssetId, event: BannerEvent, now: EpochMillis): AssetApiResult<Banner> {
    return authorize(role, this.actionForBanner(event), () => {
      const banner = this.banners.get(id);
      if (!banner) return { ok: false, reason: "Banner tidak ditemukan." };
      const r = bannerTransition(banner.status, event);
      if (!r.ok) return { ok: false, reason: r.reason };
      const updated: Banner = {
        ...banner,
        status: r.status,
        ...(event.kind === "Schedule" ? { goLiveAt: event.goLiveAt } : {}),
      };
      this.banners.set(id, updated);
      this.fanOutRejections(id, r.notifications, now);
      return { ok: true, value: updated };
    });
  }

  private actionForBanner(event: BannerEvent) {
    // SPV performs review/approve/reject; Admin performs upload/schedule.
    return event.kind === "Review" || event.kind === "Approve" || event.kind === "Reject"
      ? ("ReviewExecution" as const)
      : ("PrepareAsset" as const);
  }

  // --- IG Story ---
  requestIGStory(role: Principal, campaignId: CampaignId): AssetApiResult<IGStory> {
    return authorize(role, "PrepareAsset", () => {
      if (!canCreateAsset(campaignId, this.existingCampaignIds())) {
        return { ok: false, reason: "Campaign terkait tidak ditemukan." };
      }
      const story: IGStory = { id: `ig-${++assetSeq}`, campaignId, status: "Request" };
      this.igStories.set(story.id, story);
      return { ok: true, value: story };
    });
  }

  igStoryEvent(role: Principal, id: AssetId, event: IGStoryEvent, now: EpochMillis): AssetApiResult<IGStory> {
    const action = event.kind === "Upload" ? ("PrepareAsset" as const) : ("ReviewExecution" as const);
    return authorize(role, action, () => {
      const story = this.igStories.get(id);
      if (!story) return { ok: false, reason: "IG Story tidak ditemukan." };
      const r = igStoryTransition(story.status, event);
      if (!r.ok) return { ok: false, reason: r.reason };
      const updated: IGStory = { ...story, status: r.status };
      this.igStories.set(id, updated);
      this.fanOutRejections(id, r.notifications, now);
      return { ok: true, value: updated };
    });
  }

  // --- Host Live ---
  requestHostLive(role: Principal, campaignId: CampaignId): AssetApiResult<HostLive> {
    return authorize(role, "PrepareAsset", () => {
      if (!canCreateAsset(campaignId, this.existingCampaignIds())) {
        return { ok: false, reason: "Campaign terkait tidak ditemukan." };
      }
      const hl: HostLive = { id: `hl-${++assetSeq}`, campaignId, status: "Request" };
      this.hostLives.set(hl.id, hl);
      return { ok: true, value: hl };
    });
  }

  hostLiveEvent(role: Principal, id: AssetId, event: HostLiveEvent, now: EpochMillis): AssetApiResult<HostLive> {
    const action =
      event.kind === "Upload" || event.kind === "Schedule"
        ? ("PrepareAsset" as const)
        : ("ReviewExecution" as const);
    return authorize(role, action, () => {
      const hl = this.hostLives.get(id);
      if (!hl) return { ok: false, reason: "Host Live tidak ditemukan." };
      const r = hostLiveTransition(hl.status, event);
      if (!r.ok) return { ok: false, reason: r.reason };
      const updated: HostLive = {
        ...hl,
        status: r.status,
        ...(event.kind === "Schedule" ? { sessionAt: event.sessionAt } : {}),
      };
      this.hostLives.set(id, updated);
      this.fanOutRejections(id, r.notifications, now);
      return { ok: true, value: updated };
    });
  }

  // --- Ads CPAS ---
  requestAdsCPAS(role: Principal, campaignId: CampaignId): AssetApiResult<AdsCPAS> {
    return authorize(role, "PrepareAsset", () => {
      if (!canCreateAsset(campaignId, this.existingCampaignIds())) {
        return { ok: false, reason: "Campaign terkait tidak ditemukan." };
      }
      const ad: AdsCPAS = { id: `ads-${++assetSeq}`, campaignId, status: "Request" };
      this.adsCPAS.set(ad.id, ad);
      return { ok: true, value: ad };
    });
  }

  adsCPASEvent(role: Principal, id: AssetId, event: AdsCPASEvent, now: EpochMillis): AssetApiResult<AdsCPAS> {
    const action =
      event.kind === "Upload" || event.kind === "Setup"
        ? ("PrepareAsset" as const)
        : ("ReviewExecution" as const);
    return authorize(role, action, () => {
      const ad = this.adsCPAS.get(id);
      if (!ad) return { ok: false, reason: "Ads CPAS tidak ditemukan." };
      const r = adsCPASTransition(ad.status, event);
      if (!r.ok) return { ok: false, reason: r.reason };
      const updated: AdsCPAS = { ...ad, status: r.status };
      this.adsCPAS.set(id, updated);
      this.fanOutRejections(id, r.notifications, now);
      return { ok: true, value: updated };
    });
  }
}
