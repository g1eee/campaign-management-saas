import { describe, expect, it } from "vitest";
import { createRepositories } from "../db/repositories.js";
import { AssetService } from "../../api/assets.js";
import { Scheduler } from "./tick.js";
import {
  deliverBroadcast,
  InMemoryDeliveryChannel,
} from "../delivery/broadcast.js";
import { buildBroadcastResult } from "../../domain/stores.js";
import { Campaign, Task } from "../../domain/types.js";

function liveReadyCampaign(id: string, start: number, end: number): Campaign {
  return {
    id,
    name: "C",
    category: "FlashSale",
    status: "Review",
    step: "Review",
    timelineStart: start,
    timelineEnd: end,
    scheduledStart: start,
    scheduledEnd: end,
    scheme: {
      name: "C",
      category: "FlashSale",
      timelineStart: start,
      timelineEnd: end,
      targetStoreIds: ["s1"],
      promoOptions: [{ id: "p", label: "p", discountPct: 10 }],
      baseRevenue: 100,
      baseCost: 10,
      additionalCosts: 0,
    },
    calculation: { totalCost: 20, margin: 80, npm: 0.8, warning: false },
    targetStoreIds: ["s1"],
    createdAt: 0,
    updatedAt: 0,
  };
}

const MINUTE = 60 * 1000;

describe("Scheduler (integration, controllable clock)", () => {
  it("advances a campaign to Live within the 60s SLA of its scheduled start", () => {
    const repos = createRepositories();
    const assets = new AssetService(repos);
    const scheduler = new Scheduler(repos, assets);

    const start = 10 * MINUTE;
    const end = 20 * MINUTE;
    repos.campaigns.upsert(liveReadyCampaign("c1", start, end));

    // Before start: no change.
    scheduler.tick(start - 1);
    expect(repos.campaigns.get("c1")?.status).toBe("Review");

    // A tick within 60s of the scheduled start advances to Live.
    scheduler.tick(start + 30 * 1000);
    expect(repos.campaigns.get("c1")?.status).toBe("Live");

    // A tick at/after the end sets Selesai.
    scheduler.tick(end + 10 * 1000);
    expect(repos.campaigns.get("c1")?.status).toBe("Selesai");

    // Audit recorded for the System transitions.
    const audits = repos.audit.forCampaign("c1");
    expect(audits.some((a) => a.actor === "System")).toBe(true);
  });

  it("creates a deadline reminder once and does not duplicate across ticks", () => {
    const repos = createRepositories();
    const assets = new AssetService(repos);
    const scheduler = new Scheduler(repos, assets);

    const deadline = 100 * MINUTE;
    const task: Task = {
      id: "t1",
      userId: "u1",
      title: "Tugas",
      status: "Open",
      deadline,
      reminderSent: false,
    };
    repos.tasks.upsert(task);

    const within24h = deadline - 60 * MINUTE; // inside the 24h window
    const r1 = scheduler.tick(within24h);
    expect(r1.remindersCreated).toBe(1);
    // subsequent ticks do not duplicate
    const r2 = scheduler.tick(within24h + 30 * 1000);
    expect(r2.remindersCreated).toBe(0);
    expect(repos.notifications.forUser("u1").filter((n) => n.kind === "deadline")).toHaveLength(1);
  });

  it("records per-store delivery status, surfacing failures", () => {
    const channel = new InMemoryDeliveryChannel(new Set(["s2"]));
    const outcomes = deliverBroadcast(channel, ["s1", "s2", "s3"], "Halo toko");
    const result = buildBroadcastResult("b1", { message: "Halo toko", storeIds: ["s1", "s2", "s3"] }, outcomes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deliveries).toHaveLength(3);
      expect(result.failedStoreIds).toEqual(["s2"]);
    }
  });
});
