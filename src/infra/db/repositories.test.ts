import { describe, expect, it } from "vitest";
import { createRepositories } from "./repositories.js";
import { Campaign, MasterDataRecord } from "../../domain/types.js";

function sampleCampaign(id: string): Campaign {
  return {
    id,
    name: "C",
    category: "FlashSale",
    status: "Menunggu",
    step: "BuatSkema",
    timelineStart: 0,
    timelineEnd: 100,
    scheme: {
      name: "C",
      category: "FlashSale",
      timelineStart: 0,
      timelineEnd: 100,
      targetStoreIds: ["s1"],
      promoOptions: [{ id: "p", label: "p", discountPct: 10 }],
      baseRevenue: 100,
      baseCost: 10,
      additionalCosts: 0,
    },
    targetStoreIds: ["s1"],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe("repositories (integration)", () => {
  it("persists and retrieves campaigns (create/edit round trip)", () => {
    const repos = createRepositories();
    repos.campaigns.upsert(sampleCampaign("c1"));
    expect(repos.campaigns.get("c1")?.name).toBe("C");
    repos.campaigns.upsert({ ...sampleCampaign("c1"), name: "Updated" });
    expect(repos.campaigns.get("c1")?.name).toBe("Updated");
  });

  it("master data create/edit persistence and unreferenced deletion", () => {
    const repos = createRepositories();
    const rec: MasterDataRecord = {
      id: "m1",
      type: "PromoType",
      uniqueId: "DISC10",
      fields: {},
    };
    repos.masterData.upsert(rec);
    expect(repos.masterData.get("m1")).toBeDefined();
    const result = repos.masterData.deleteGuarded("m1", []);
    expect(result.ok).toBe(true);
    expect(repos.masterData.get("m1")).toBeUndefined();
  });

  it("rejects deletion of a referenced master-data record", () => {
    const repos = createRepositories();
    repos.masterData.upsert({
      id: "m2",
      type: "StoreCategory",
      uniqueId: "CAT",
      fields: {},
    });
    const result = repos.masterData.deleteGuarded("m2", [
      { recordId: "m2", refLabel: "Campaign A" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.referencedBy).toContain("Campaign A");
    expect(repos.masterData.get("m2")).toBeDefined();
  });

  it("audit log appends and reads back per campaign", () => {
    const repos = createRepositories();
    repos.audit.append({
      id: "a1",
      campaignId: "c1",
      timestamp: 1,
      fromStatus: "Menunggu",
      toStatus: "Proses",
      fromStep: "BuatSkema",
      toStep: "Submit",
      actor: "u1",
    });
    expect(repos.audit.forCampaign("c1")).toHaveLength(1);
  });
});
