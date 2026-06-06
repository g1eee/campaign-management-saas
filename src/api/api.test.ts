import { describe, expect, it } from "vitest";
import { createRepositories } from "../infra/db/repositories.js";
import { CampaignService } from "./campaign.js";
import { TaskService } from "./operations.js";
import { AuthorizationError } from "./middleware/accessControl.js";
import { CampaignScheme, Task } from "../domain/types.js";

function validScheme(): CampaignScheme {
  return {
    name: "Promo 6.6",
    category: "FlashSale",
    timelineStart: 0,
    timelineEnd: 1000,
    targetStoreIds: ["s1"],
    promoOptions: [{ id: "p1", label: "Disc", discountPct: 10 }],
    baseRevenue: 1000,
    baseCost: 400,
    additionalCosts: 50,
  };
}

describe("API (integration)", () => {
  it("denies a campaign-create action for an unauthorized role (no data change)", () => {
    const repos = createRepositories();
    const svc = new CampaignService(repos);
    // Admin is not permitted to CreateScheme (SPV-only).
    expect(() => svc.createScheme("Admin", validScheme(), 1000)).toThrow(
      AuthorizationError,
    );
    expect(repos.campaigns.all()).toHaveLength(0);
  });

  it("denies unauthenticated requests", () => {
    const repos = createRepositories();
    const svc = new CampaignService(repos);
    expect(() => svc.createScheme(null, validScheme(), 1000)).toThrow(
      AuthorizationError,
    );
  });

  it("runs the campaign lifecycle and records audit + inline calculation", () => {
    const repos = createRepositories();
    const svc = new CampaignService(repos);

    const created = svc.createScheme("SPV", validScheme(), 1000);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.value.id;

    expect(svc.submit("SPV", id, "spv1", 1100).ok).toBe(true);
    // approval before calculation is rejected by the state machine
    expect(svc.approve("Admin", id, "adm1", 1150).ok).toBe(false);

    const calc = svc.calculateCampaign("Admin", id, {
      baseRevenue: 1000,
      baseCost: 400,
      additionalCosts: 50,
      discountPcts: [10],
    });
    expect(calc.ok).toBe(true);
    if (calc.ok) expect(calc.value.calculation).toBeDefined();

    expect(svc.approve("Admin", id, "adm1", 1200).ok).toBe(true);
    expect(svc.reviewApprove("SPV", id, "spv1", 1300).ok).toBe(true);

    const campaign = repos.campaigns.get(id)!;
    expect(campaign.status).toBe("Review");
    // audit records exist for the transitions
    expect(repos.audit.forCampaign(id).length).toBeGreaterThanOrEqual(3);
  });

  it("persists inline task status updates", () => {
    const repos = createRepositories();
    const task: Task = {
      id: "t1",
      userId: "u1",
      title: "Buat Banner",
      status: "Open",
      deadline: 5000,
      reminderSent: false,
    };
    repos.tasks.upsert(task);
    const svc = new TaskService(repos);
    const r = svc.updateStatus("u1", "t1", "InProgress");
    expect(r.ok).toBe(true);
    expect(repos.tasks.get("t1")?.status).toBe("InProgress");
    // invalid status rejected
    expect(svc.updateStatus("u1", "t1", "Bogus" as never).ok).toBe(false);
  });
});
