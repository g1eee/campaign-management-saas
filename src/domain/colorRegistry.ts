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
 * Uniform neutral pastel fallback for a Campaign_Category that has no
 * registered color (Requirement 2.5). Used by the board view to color
 * Campaign cards whose category is not present in `CATEGORY_COLORS`.
 */
export const NEUTRAL_CATEGORY_COLOR = "#E6E6EA"; // soft neutral gray

/**
 * Returns the assigned category color, or the uniform neutral fallback when
 * the category is missing/empty or has no registered color (Requirement 2.5).
 * Unlike `colorFor`, this never throws for an unregistered value.
 */
export function categoryColorOrDefault(
  category: CampaignCategory | string | null | undefined,
): string {
  if (category != null && Object.prototype.hasOwnProperty.call(CATEGORY_COLORS, category)) {
    return CATEGORY_COLORS[category as CampaignCategory];
  }
  return NEUTRAL_CATEGORY_COLOR;
}

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
