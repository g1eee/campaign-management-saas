/**
 * Presentation color registry (pure).
 *
 * Single source of truth mapping each CampaignStatus and each CampaignCategory
 * to one distinct pastel color. Consumed identically by Dashboard, Calendar,
 * and all module views so a value always renders with the same color.
 *
 * _Requirements: 23.3, 23.4, 15.4_
 */

import {
  CampaignCategory,
  CampaignStatus,
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
} from "./types.js";

export type ColorKind = "status" | "category";

/** Pastel hex colors, one distinct value per status. */
const STATUS_COLORS: Record<CampaignStatus, string> = {
  Menunggu: "#FDE2C4", // soft peach
  Proses: "#C7DBF5", // soft blue
  Review: "#F6D6E8", // soft pink
  Live: "#CDEBD3", // soft green
  Selesai: "#DAD2F0", // soft lavender
};

/** Pastel hex colors, one distinct value per category. */
const CATEGORY_COLORS: Record<CampaignCategory, string> = {
  FlashSale: "#BFE3C0", // green
  BrandDay: "#BBD7F2", // blue
  Payday: "#F7C9C9", // red/pink
  MegaBonus: "#D8C9F0", // purple
  Weekend: "#F8E0AE", // amber
  Lokal: "#B7E5DD", // teal
};

/**
 * Returns the assigned pastel color for a status or category value.
 * Pure: the result depends only on (kind, value), never on call site.
 */
export function colorFor(kind: "status", value: CampaignStatus): string;
export function colorFor(kind: "category", value: CampaignCategory): string;
export function colorFor(
  kind: ColorKind,
  value: CampaignStatus | CampaignCategory,
): string {
  if (kind === "status") {
    return STATUS_COLORS[value as CampaignStatus];
  }
  return CATEGORY_COLORS[value as CampaignCategory];
}

/** All status colors as an ordered list (for legends, etc.). */
export function statusColorEntries(): { value: CampaignStatus; color: string }[] {
  return CAMPAIGN_STATUSES.map((value) => ({ value, color: STATUS_COLORS[value] }));
}

/** All category colors as an ordered list (for legends, etc.). */
export function categoryColorEntries(): {
  value: CampaignCategory;
  color: string;
}[] {
  return CAMPAIGN_CATEGORIES.map((value) => ({
    value,
    color: CATEGORY_COLORS[value],
  }));
}
