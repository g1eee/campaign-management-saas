/**
 * Unit tests for the Template_Campaign API error paths (Task 16.2).
 *
 * Exercises `TemplateService.createFrom` rejection behavior:
 * - Requirement 7.6: instantiating from a template that has been deleted from
 *   the repository is rejected, no Campaign is created, and the failure reports
 *   the template is no longer available.
 * - Requirement 7.7: when the stored template content fails re-validation at
 *   instantiation time, creation is rejected and no Campaign is created.
 *
 * SPV saves the template (CreateTemplate is SPV-only); Admin instantiates it
 * (CreateCampaign is Admin-only).
 */

import { describe, expect, it } from "vitest";
import { createRepositories } from "../infra/db/repositories.js";
import { TemplateService } from "./template.js";
import { TemplateDraft } from "../domain/template.js";
import { CampaignTemplate } from "../domain/types.js";

/** A Template_Campaign draft that satisfies all save constraints. */
function validDraft(id = "tpl-1"): TemplateDraft {
  return {
    id,
    name: "Template Flash Sale",
    category: "FlashSale",
    promoOptions: [{ id: "p1", label: "Disc 10%", discountPct: 10 }],
    targetStoreIds: ["s1", "s2"],
  };
}

describe("TemplateService.createFrom error paths", () => {
  it("rejects instantiation when the template has been deleted (Req 7.6)", () => {
    const repos = createRepositories();
    const svc = new TemplateService(repos);

    // SPV saves a valid template.
    const saved = svc.save("SPV", validDraft(), 1000);
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const templateId = saved.value.id;

    // The template is later deleted from the repository.
    expect(repos.templates.delete(templateId)).toBe(true);
    expect(repos.templates.get(templateId)).toBeUndefined();

    // Admin attempts to create a Campaign from the now-missing template.
    const result = svc.createFrom("Admin", templateId, 2000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/tidak lagi tersedia/i);
    }
    // No Campaign is created.
    expect(repos.campaigns.all()).toHaveLength(0);
  });

  it("rejects instantiation when stored template content is invalid (Req 7.7)", () => {
    const repos = createRepositories();
    const svc = new TemplateService(repos);

    // A template whose content cannot pass re-validation is present in the
    // repository (e.g. its promo-option list has been emptied since save).
    const invalidStored: CampaignTemplate = {
      id: "tpl-invalid",
      name: "Template Rusak",
      category: "FlashSale",
      promoOptions: [],
      targetStoreIds: ["s1"],
      createdAt: 1000,
    };
    repos.templates.upsert(invalidStored);

    // Admin attempts to create a Campaign from the invalid-content template.
    const result = svc.createFrom("Admin", invalidStored.id, 2000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/konten template tidak valid/i);
    }
    // No Campaign is created.
    expect(repos.campaigns.all()).toHaveLength(0);
  });
});
