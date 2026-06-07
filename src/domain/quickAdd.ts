/**
 * Tambah_Cepat (Quick Add) — pure draft creation (Requirement 3).
 *
 * Validates a submitted campaign name (trimmed length 1..100) and builds an
 * I/O-free Campaign_Draft. A draft starts at status Menunggu with a neutral
 * default category and empty promo/target-store lists. Persistence, access
 * control, and audit are handled by the API layer that wraps this function.
 *
 * _Requirements: 3.1, 3.4, 3.5_
 */

import {
  Campaign,
  CampaignCategory,
  CampaignScheme,
  CampaignId,
  EpochMillis,
} from "./types.js";

/** Minimum trimmed length of a Tambah_Cepat campaign name (Requirement 3.1). */
export const QUICK_ADD_NAME_MIN = 1;
/** Maximum trimmed length of a Tambah_Cepat campaign name (Requirement 3.1, 3.5). */
export const QUICK_ADD_NAME_MAX = 100;

export type QuickAddResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; reason: string };

let autoSeq = 0;

/**
 * Creates a Campaign_Draft from a raw name. Trims leading/trailing whitespace,
 * then rejects when the trimmed length is 0 (Requirement 3.4) or greater than
 * 100 (Requirement 3.5). On success the draft has status Menunggu, the supplied
 * neutral default category, and empty promo/target-store lists (Requirement 3.1).
 */
export function createDraft(
  rawName: string,
  now: EpochMillis,
  defaultCategory: CampaignCategory,
  id?: CampaignId,
): QuickAddResult {
  const name = (rawName ?? "").trim();

  if (name.length < QUICK_ADD_NAME_MIN) {
    return { ok: false, reason: "Nama campaign wajib diisi." };
  }
  if (name.length > QUICK_ADD_NAME_MAX) {
    return {
      ok: false,
      reason: `Nama campaign maksimum ${QUICK_ADD_NAME_MAX} karakter.`,
    };
  }

  const scheme: CampaignScheme = {
    name,
    category: defaultCategory,
    timelineStart: now,
    timelineEnd: now,
    targetStoreIds: [],
    promoOptions: [],
    baseRevenue: 0,
    baseCost: 0,
    additionalCosts: 0,
  };

  const campaign: Campaign = {
    id: id ?? `campaign-${++autoSeq}`,
    name,
    category: defaultCategory,
    status: "Menunggu",
    step: "BuatSkema",
    timelineStart: now,
    timelineEnd: now,
    scheme,
    targetStoreIds: [],
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, campaign };
}
