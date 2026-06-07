/**
 * Kanban board view derivations (pure).
 *
 * Derives the presentation model for the Papan_Campaign from a list of
 * Campaigns: it groups Campaigns into exactly five Kolom_Status in fixed
 * left-to-right order, derives a Kartu_Campaign (`CardView`) for each, counts
 * cards per column, flags empty columns, applies per-category coloring with a
 * uniform neutral fallback, and normalizes empty/unknown statuses to Menunggu.
 *
 * This module is I/O-free and deterministic: the result depends only on its
 * inputs, never on the call site.
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9_
 */

import { categoryColorOrDefault } from "./colorRegistry.js";
import {
  Campaign,
  CampaignCategory,
  CampaignStatus,
  CAMPAIGN_STATUSES,
} from "./types.js";

/**
 * Compact visual representation of a single Campaign on the board
 * (Requirement 2.3, 2.4, 2.5).
 */
export interface CardView {
  id: string;
  name: string;
  category: CampaignCategory;
  /** Category color from the registry, or neutral fallback (Req 2.4, 2.5). */
  color: string;
  /** Number of Opsi_Promo (= length of scheme.promoOptions) (Req 2.3). */
  promoCount: number;
  /** Number of target Toko (= length of targetStoreIds) (Req 2.3). */
  storeCount: number;
  /** Campaign date range (Req 2.3). */
  timelineStart: number;
  timelineEnd: number;
}

/** A single Kolom_Status on the board. */
export interface ColumnView {
  status: CampaignStatus;
  /** Number of cards in this column, 0..total (Req 2.6). */
  count: number;
  cards: CardView[];
  /** True iff the column contains no cards (Req 2.8). */
  empty: boolean;
}

/** True iff `value` is one of the five valid Campaign_Status values. */
function isKnownStatus(value: unknown): value is CampaignStatus {
  return (
    typeof value === "string" &&
    (CAMPAIGN_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Normalizes a Campaign's status to one of the five valid columns. Empty or
 * unrecognized statuses are placed in Menunggu (Requirement 2.9).
 */
function normalizeStatus(status: unknown): CampaignStatus {
  return isKnownStatus(status) ? status : "Menunggu";
}

/** Derives the Kartu_Campaign (`CardView`) for a single Campaign. */
function toCardView(campaign: Campaign): CardView {
  const promoOptions = campaign.scheme?.promoOptions ?? [];
  const storeIds = campaign.targetStoreIds ?? [];
  return {
    id: campaign.id,
    name: campaign.name,
    category: campaign.category,
    color: categoryColorOrDefault(campaign.category),
    promoCount: promoOptions.length,
    storeCount: storeIds.length,
    timelineStart: campaign.timelineStart,
    timelineEnd: campaign.timelineEnd,
  };
}

/**
 * Groups Campaigns into exactly five columns in the fixed order Menunggu,
 * Proses, Review, Live, Selesai (Req 2.1, 2.2). Each Campaign appears as one
 * card in the column matching its status; empty/unknown statuses fall into
 * Menunggu (Req 2.9). Each column reports its count (Req 2.6) and empty flag
 * (Req 2.8). Cards are colored per category with a neutral fallback (Req 2.4,
 * 2.5). Card order within a column follows the input order, preserving stable
 * placement.
 */
export function buildBoard(campaigns: readonly Campaign[]): ColumnView[] {
  const buckets: Record<CampaignStatus, CardView[]> = {
    Menunggu: [],
    Proses: [],
    Review: [],
    Live: [],
    Selesai: [],
  };

  for (const campaign of campaigns) {
    const column = normalizeStatus(campaign.status);
    buckets[column].push(toCardView(campaign));
  }

  return CAMPAIGN_STATUSES.map((status) => {
    const cards = buckets[status];
    return {
      status,
      count: cards.length,
      cards,
      empty: cards.length === 0,
    };
  });
}
