import { describe, expect, it } from "vitest";
import { createRepositories } from "./repositories.js";
import {
  Campaign,
  CampaignTemplate,
  MasterDataRecord,
} from "../../domain/types.js";

function sampleTemplate(id: string): CampaignTemplate {
  return {
    id,
    name: "T",
    category: "FlashSale",
    promoOptions: [{ id: "p", label: "p", discountPct: 10 }],
    targetStoreIds: ["s1"],
    createdAt: 0,
  };
}

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

describe("TemplateRepository (unit)", () => {
  it("saves and retrieves a template by id (save/get round trip)", () => {
    const repos = createRepositories();
    repos.templates.upsert(sampleTemplate("t1"));
    const saved = repos.templates.get("t1");
    expect(saved).toBeDefined();
    expect(saved?.name).toBe("T");
    expect(saved?.category).toBe("FlashSale");
    expect(saved?.promoOptions).toHaveLength(1);
    expect(saved?.targetStoreIds).toEqual(["s1"]);
  });

  it("returns undefined for a template id that was never saved", () => {
    const repos = createRepositories();
    expect(repos.templates.get("missing")).toBeUndefined();
  });

  it("upsert overwrites an existing template with the same id", () => {
    const repos = createRepositories();
    repos.templates.upsert(sampleTemplate("t1"));
    repos.templates.upsert({ ...sampleTemplate("t1"), name: "Updated" });
    expect(repos.templates.get("t1")?.name).toBe("Updated");
    // Overwrite must not create a duplicate entry.
    expect(repos.templates.all()).toHaveLength(1);
  });

  it("lists all saved templates", () => {
    const repos = createRepositories();
    expect(repos.templates.all()).toHaveLength(0);
    repos.templates.upsert(sampleTemplate("t1"));
    repos.templates.upsert(sampleTemplate("t2"));
    const ids = repos.templates.all().map((t) => t.id).sort();
    expect(ids).toEqual(["t1", "t2"]);
  });

  it("deletes a saved template and reports success", () => {
    const repos = createRepositories();
    repos.templates.upsert(sampleTemplate("t1"));
    expect(repos.templates.delete("t1")).toBe(true);
    expect(repos.templates.get("t1")).toBeUndefined();
    expect(repos.templates.all()).toHaveLength(0);
  });

  it("delete of an unknown template id reports failure and changes nothing", () => {
    const repos = createRepositories();
    repos.templates.upsert(sampleTemplate("t1"));
    expect(repos.templates.delete("missing")).toBe(false);
    expect(repos.templates.all()).toHaveLength(1);
  });
});
