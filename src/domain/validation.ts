/**
 * Validation Engine (pure).
 *
 * Shared field-constraint evaluator used by every form. Returns the list of
 * violations; an empty list means the value set is acceptable. Also provides
 * the new-campaign initializer and the real-time scheme preview derivation.
 *
 * _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7, 7.6, 8.4, 18.6, 20.4, 20.5, 21.4,
 *  22.1, 22.2, 22.3, 22.4_
 */

import {
  Campaign,
  CampaignScheme,
  CampaignId,
  EpochMillis,
  MAX_DISCOUNT_PCT,
  MAX_PROMO_OPTIONS,
  MIN_DISCOUNT_PCT,
  PromoOption,
} from "./types.js";
import { calculate } from "./calculation.js";

export interface Violation {
  field: string;
  reason: string;
}

const NAME_MIN = 1;
const NAME_MAX = 100;

/**
 * Validates a campaign scheme against all field constraints (Requirement 5).
 * Returns every violation found so the UI can report them all at once.
 */
export function validateScheme(scheme: CampaignScheme): Violation[] {
  const violations: Violation[] = [];

  const trimmedName = scheme.name?.trim() ?? "";
  if (trimmedName.length < NAME_MIN) {
    violations.push({ field: "name", reason: "Nama wajib diisi." });
  } else if (scheme.name.length > NAME_MAX) {
    violations.push({
      field: "name",
      reason: `Nama maksimal ${NAME_MAX} karakter.`,
    });
  }

  if (scheme.category === null) {
    violations.push({ field: "category", reason: "Kategori wajib dipilih." });
  }

  if (scheme.timelineStart === null) {
    violations.push({
      field: "timelineStart",
      reason: "Tanggal mulai wajib diisi.",
    });
  }
  if (scheme.timelineEnd === null) {
    violations.push({
      field: "timelineEnd",
      reason: "Tanggal selesai wajib diisi.",
    });
  }
  if (
    scheme.timelineStart !== null &&
    scheme.timelineEnd !== null &&
    scheme.timelineEnd < scheme.timelineStart
  ) {
    // (Requirement 5.5)
    violations.push({
      field: "timelineEnd",
      reason: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
    });
  }

  if (!scheme.targetStoreIds || scheme.targetStoreIds.length < 1) {
    violations.push({
      field: "targetStoreIds",
      reason: "Minimal satu toko target wajib dipilih.",
    });
  }

  if (!scheme.promoOptions || scheme.promoOptions.length < 1) {
    violations.push({
      field: "promoOptions",
      reason: "Minimal satu opsi promo wajib ditambahkan.",
    });
  } else if (scheme.promoOptions.length > MAX_PROMO_OPTIONS) {
    // (Requirement 5.7)
    violations.push({
      field: "promoOptions",
      reason: `Maksimal ${MAX_PROMO_OPTIONS} opsi promo.`,
    });
  }

  scheme.promoOptions?.forEach((p, idx) => {
    violations.push(...validatePromoOption(p, idx));
  });

  return violations;
}

/** Validates a single promo option's discount bounds (Requirement 5.3). */
export function validatePromoOption(
  promo: PromoOption,
  index: number,
): Violation[] {
  const violations: Violation[] = [];
  const field = `promoOptions[${index}].discountPct`;
  if (!Number.isInteger(promo.discountPct)) {
    violations.push({ field, reason: "Diskon harus bilangan bulat." });
  }
  if (
    promo.discountPct < MIN_DISCOUNT_PCT ||
    promo.discountPct > MAX_DISCOUNT_PCT
  ) {
    violations.push({
      field,
      reason: `Diskon harus antara ${MIN_DISCOUNT_PCT} dan ${MAX_DISCOUNT_PCT}.`,
    });
  }
  return violations;
}

/** Whether a promo option may be added to a scheme (Requirement 5.7). */
export function canAddPromoOption(scheme: CampaignScheme): boolean {
  return scheme.promoOptions.length < MAX_PROMO_OPTIONS;
}

/** True iff the scheme satisfies all constraints. */
export function isSchemeValid(scheme: CampaignScheme): boolean {
  return validateScheme(scheme).length === 0;
}

/**
 * Validates a numeric calculation input (Requirement 7.6). Returns a violation
 * when the value is non-numeric or outside the permitted range.
 */
export function validateNumericInput(
  field: string,
  value: number,
  opts: { min?: number; max?: number } = {},
): Violation | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return { field, reason: "Nilai harus berupa angka." };
  }
  if (opts.min !== undefined && value < opts.min) {
    return { field, reason: `Nilai minimal ${opts.min}.` };
  }
  if (opts.max !== undefined && value > opts.max) {
    return { field, reason: `Nilai maksimal ${opts.max}.` };
  }
  return null;
}

/** Validates a schedule's start/end order (Requirement 8.4). */
export function validateSchedule(
  start: EpochMillis,
  end: EpochMillis,
): Violation | null {
  if (end <= start) {
    return {
      field: "schedule",
      reason: "Waktu selesai harus setelah waktu mulai.",
    };
  }
  return null;
}

let autoSeq = 0;

/**
 * Initializes a new Campaign from a valid scheme, starting at status Menunggu
 * and step BuatSkema (Requirement 5.6).
 */
export function newCampaignFromScheme(
  scheme: CampaignScheme,
  now: EpochMillis,
  id?: CampaignId,
): Campaign {
  if (!isSchemeValid(scheme)) {
    throw new Error("Cannot create a campaign from an invalid scheme.");
  }
  return {
    id: id ?? `campaign-${++autoSeq}`,
    name: scheme.name,
    category: scheme.category!,
    status: "Menunggu",
    step: "BuatSkema",
    timelineStart: scheme.timelineStart!,
    timelineEnd: scheme.timelineEnd!,
    scheme,
    targetStoreIds: [...scheme.targetStoreIds],
    createdAt: now,
    updatedAt: now,
  };
}

export interface SchemePreview {
  name: string;
  category: CampaignScheme["category"];
  promoCount: number;
  totalDiscountPct: number;
  calculation: ReturnType<typeof calculate>;
}

/**
 * Pure preview derivation for the scheme form (Requirement 22.2). The output
 * is fully determined by the current scheme values.
 */
export function previewFor(scheme: CampaignScheme): SchemePreview {
  const discountPcts = scheme.promoOptions.map((p) => p.discountPct);
  return {
    name: scheme.name,
    category: scheme.category,
    promoCount: scheme.promoOptions.length,
    totalDiscountPct: Math.min(
      100,
      discountPcts.reduce((s, p) => s + p, 0),
    ),
    calculation: calculate({
      baseRevenue: scheme.baseRevenue,
      baseCost: scheme.baseCost,
      additionalCosts: scheme.additionalCosts,
      discountPcts,
    }),
  };
}
