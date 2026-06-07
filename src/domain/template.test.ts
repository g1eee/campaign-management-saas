import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { instantiate, validateTemplate } from "./template.js";
import {
  invalidTemplateArb,
  templateArb,
  timestampArb,
} from "./testArbitraries.js";
import { CampaignTemplate } from "./types.js";

describe("template (campaign-manager)", () => {
  // Feature: campaign-manager, Property 25: Penyimpanan template dalam batas diterima
  it("Property 25: a template within all save bounds is accepted by validateTemplate", () => {
    fc.assert(
      fc.property(templateArb, timestampArb, (template, now) => {
        // A template with exactly one category, 1..50 promo options, and
        // 1..1000 target stores validates successfully (Requirement 7.1).
        const result = validateTemplate(template, now);
        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.template.category).toBe(template.category);
          expect(result.template.promoOptions).toEqual(template.promoOptions);
          expect(result.template.targetStoreIds).toEqual(
            template.targetStoreIds,
          );
          expect(result.template.createdAt).toBe(now);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 26: Template tanpa field wajib ditolak
  it("Property 26: a template missing a required field is rejected with no template produced", () => {
    fc.assert(
      fc.property(invalidTemplateArb, timestampArb, (draft, now) => {
        // Restrict to missing-required-field violations: no category, empty
        // promo list, or empty target-store list (Requirement 7.2).
        const promoCount = draft.promoOptions?.length ?? 0;
        const storeCount = draft.targetStoreIds?.length ?? 0;
        fc.pre(
          draft.category === null ||
            draft.category === undefined ||
            promoCount === 0 ||
            storeCount === 0,
        );
        const result = validateTemplate(draft, now);
        // Rejected; no template is produced (Requirement 7.2).
        expect(result.ok).toBe(false);
        expect(result).not.toHaveProperty("template");
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 27: Template melampaui batas entri ditolak
  it("Property 27: a template exceeding entry limits is rejected with a limit message", () => {
    fc.assert(
      fc.property(invalidTemplateArb, timestampArb, (draft, now) => {
        // Restrict to limit-exceeded violations: > 50 promo options or
        // > 1000 target stores (Requirement 7.3).
        const promoCount = draft.promoOptions?.length ?? 0;
        const storeCount = draft.targetStoreIds?.length ?? 0;
        fc.pre(promoCount > 50 || storeCount > 1000);
        const result = validateTemplate(draft, now);
        // Rejected with a "limit exceeded" message; no template produced.
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toContain("Maksimal");
        }
        expect(result).not.toHaveProperty("template");
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 28: Instansiasi template menyalin field dan berstatus Menunggu
  it("Property 28: instantiating a valid template copies fields and sets status Menunggu", () => {
    fc.assert(
      fc.property(templateArb, timestampArb, (template, now) => {
        // A valid template yields a campaign whose category, promo options,
        // and target stores equal the template's, at status Menunggu (Req 7.4).
        const result = instantiate(template, now);
        expect(result.ok).toBe(true);
        if (result.ok) {
          const c = result.campaign;
          expect(c.status).toBe("Menunggu");
          expect(c.category).toBe(template.category);
          expect(c.scheme.category).toBe(template.category);
          expect(c.scheme.promoOptions).toEqual(template.promoOptions);
          expect(c.scheme.targetStoreIds).toEqual(template.targetStoreIds);
          expect(c.targetStoreIds).toEqual(template.targetStoreIds);
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 29: Campaign dari template adalah salinan independen
  it("Property 29: a campaign created from a template is an independent copy", () => {
    fc.assert(
      fc.property(templateArb, timestampArb, (template, now) => {
        const result = instantiate(template, now);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const c = result.campaign;

        const templatePromoLenBefore = template.promoOptions.length;
        const templateStoreLenBefore = template.targetStoreIds.length;
        const campaignPromoLenBefore = c.scheme.promoOptions.length;
        const campaignStoreLenBefore = c.targetStoreIds.length;

        // Mutating the campaign must not change the template (Requirement 7.5).
        c.scheme.promoOptions.push({ id: "x", label: "x", discountPct: 1 });
        c.scheme.targetStoreIds.push("store-x");
        c.targetStoreIds.push("store-y");
        if (c.scheme.promoOptions.length > 0) {
          c.scheme.promoOptions[0] = {
            ...c.scheme.promoOptions[0],
            discountPct: 999,
          };
        }
        expect(template.promoOptions.length).toBe(templatePromoLenBefore);
        expect(template.targetStoreIds.length).toBe(templateStoreLenBefore);

        // Mutating the template must not change the campaign (Requirement 7.5).
        template.promoOptions.push({ id: "y", label: "y", discountPct: 2 });
        template.targetStoreIds.push("store-z");
        expect(c.scheme.promoOptions.length).toBe(campaignPromoLenBefore + 1); // only the campaign's own push
        expect(c.targetStoreIds.length).toBe(campaignStoreLenBefore + 1);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 30: Instansiasi memvalidasi ulang konten template
  it("Property 30: instantiation re-validates template content and rejects invalid content", () => {
    fc.assert(
      fc.property(invalidTemplateArb, timestampArb, (draft, now) => {
        // Promote the invalid draft to a full template by stamping createdAt;
        // its content still fails re-validation (Requirement 7.7).
        const template = { ...draft, createdAt: now } as CampaignTemplate;
        const result = instantiate(template, now);
        // Instantiation is rejected and no campaign is produced (Req 7.7).
        expect(result.ok).toBe(false);
        expect(result).not.toHaveProperty("campaign");
      }),
      { numRuns: 100 },
    );
  });
});
