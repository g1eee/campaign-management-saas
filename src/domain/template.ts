/**
 * Template_Campaign — pure validation and instantiation (Requirement 7).
 *
 * A Template_Campaign holds the reusable Skema_Campaign values (category,
 * promo options, target stores) that an Admin can copy into a new Campaign.
 * This module is I/O-free: persistence, access control (SPV saves, Admin
 * instantiates), and the "template deleted" check live in the API layer that
 * wraps these functions.
 *
 * `validateTemplate` enforces the save constraints — exactly one category,
 * 1..50 promo options, and 1..1000 target stores (Requirements 7.1, 7.2, 7.3).
 * `instantiate` re-validates the template content (Requirement 7.7) and, when
 * valid, produces a new Campaign at status Menunggu that is a deep, independent
 * copy of the template's values so later edits to either side never leak across
 * (Requirements 7.4, 7.5).
 *
 * _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.7_
 */

import {
  Campaign,
  CampaignId,
  CampaignScheme,
  CampaignTemplate,
  EpochMillis,
  PromoOption,
  StoreId,
  TEMPLATE_MAX_PROMOS,
  TEMPLATE_MAX_STORES,
  TEMPLATE_MIN_PROMOS,
  TEMPLATE_MIN_STORES,
} from "./types.js";

/** A template draft ready to be saved: everything except the assigned createdAt. */
export type TemplateDraft = Omit<CampaignTemplate, "createdAt">;

export type TemplateValidation =
  | { ok: true; template: CampaignTemplate }
  | { ok: false; reason: string };

export type InstantiateResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: string };

/** Deep, independent copy of a promo option list (Requirements 7.5). */
function clonePromoOptions(promoOptions: readonly PromoOption[]): PromoOption[] {
  return promoOptions.map((p) => ({ ...p }));
}

/** Deep, independent copy of a target-store id list (Requirements 7.5). */
function cloneStoreIds(storeIds: readonly StoreId[]): StoreId[] {
  return [...storeIds];
}

/**
 * Validates a Template_Campaign draft for saving (Requirements 7.1, 7.2, 7.3).
 *
 * Rejects when the category is missing (Requirement 7.2), when the promo-option
 * list is empty or the target-store list is empty (Requirement 7.2), or when
 * either list exceeds its maximum — 50 promo options or 1000 target stores
 * (Requirement 7.3). On success the template is stamped with `now` as its
 * `createdAt` and returned ready for persistence (Requirement 7.1).
 */
export function validateTemplate(
  draft: TemplateDraft,
  now: EpochMillis,
): TemplateValidation {
  const promoOptions = draft.promoOptions ?? [];
  const targetStoreIds = draft.targetStoreIds ?? [];

  // Missing required fields (Requirement 7.2).
  if (draft.category === null || draft.category === undefined) {
    return { ok: false, reason: "Kategori campaign wajib dipilih." };
  }
  if (promoOptions.length < TEMPLATE_MIN_PROMOS) {
    return { ok: false, reason: "Minimal satu Opsi_Promo wajib ditambahkan." };
  }
  if (targetStoreIds.length < TEMPLATE_MIN_STORES) {
    return { ok: false, reason: "Minimal satu Toko target wajib dipilih." };
  }

  // Entry-count limits exceeded (Requirement 7.3).
  if (promoOptions.length > TEMPLATE_MAX_PROMOS) {
    return {
      ok: false,
      reason: `Maksimal ${TEMPLATE_MAX_PROMOS} Opsi_Promo.`,
    };
  }
  if (targetStoreIds.length > TEMPLATE_MAX_STORES) {
    return {
      ok: false,
      reason: `Maksimal ${TEMPLATE_MAX_STORES} Toko target.`,
    };
  }

  const template: CampaignTemplate = {
    id: draft.id,
    name: draft.name,
    category: draft.category,
    promoOptions: clonePromoOptions(promoOptions),
    targetStoreIds: cloneStoreIds(targetStoreIds),
    createdAt: now,
  };

  return { ok: true, template };
}

let autoSeq = 0;

/**
 * Creates a new Campaign from a Template_Campaign (Requirements 7.4, 7.5, 7.7).
 *
 * Re-validates the template content against the save constraints first; when it
 * no longer holds (e.g. emptied or over-limit lists), creation is rejected and
 * no Campaign is produced (Requirement 7.7). On success the Campaign copies the
 * template's category, promo options, and target stores as a deep, independent
 * copy — mutating the Campaign never touches the template and vice versa
 * (Requirement 7.5) — and starts at status Menunggu (Requirement 7.4).
 */
export function instantiate(
  template: CampaignTemplate,
  now: EpochMillis,
  id?: CampaignId,
): InstantiateResult {
  // Re-validate template content at instantiation time (Requirement 7.7).
  const revalidated = validateTemplate(template, now);
  if (!revalidated.ok) {
    return { ok: false, reason: "Konten template tidak valid." };
  }

  const scheme: CampaignScheme = {
    name: template.name,
    category: template.category,
    timelineStart: now,
    timelineEnd: now,
    targetStoreIds: cloneStoreIds(template.targetStoreIds),
    promoOptions: clonePromoOptions(template.promoOptions),
    baseRevenue: 0,
    baseCost: 0,
    additionalCosts: 0,
  };

  const campaign: Campaign = {
    id: id ?? `campaign-${++autoSeq}`,
    name: template.name,
    category: template.category,
    status: "Menunggu",
    step: "BuatSkema",
    timelineStart: now,
    timelineEnd: now,
    scheme,
    targetStoreIds: cloneStoreIds(template.targetStoreIds),
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, campaign };
}
