/**
 * Duplikasi Campaign (Requirement 8) — pure, I/O-free deep duplication.
 *
 * `duplicate` produces a fully independent copy of a source Campaign: the
 * `scheme`, its `promoOptions`, the target-store lists, and the optional
 * `calculation` are deep-cloned so later mutations on either Campaign never
 * affect the other (Requirement 8.2). The copy starts at status Menunggu
 * (Requirement 8.1) and its name is the source name prefixed with the copy
 * marker, truncated to at most 200 characters while preserving the marker
 * (Requirement 8.5). Persistence, access control, audit, and the
 * "source no longer available" check (Requirement 8.4) are handled by the API
 * layer that wraps this function.
 *
 * _Requirements: 8.1, 8.2, 8.5_
 */

import {
  Campaign,
  CampaignId,
  CalculationResult,
  CampaignScheme,
  COPY_MARKER,
  DUPLICATE_NAME_MAX,
  EpochMillis,
  PromoOption,
} from "./types.js";

let autoSeq = 0;

/** Deep-clones a PromoOption so the copy shares no mutable reference. */
function clonePromoOption(option: PromoOption): PromoOption {
  return {
    id: option.id,
    label: option.label,
    discountPct: option.discountPct,
  };
}

/** Deep-clones a CampaignScheme, including promo options and target stores. */
function cloneScheme(scheme: CampaignScheme): CampaignScheme {
  return {
    name: scheme.name,
    category: scheme.category,
    timelineStart: scheme.timelineStart,
    timelineEnd: scheme.timelineEnd,
    targetStoreIds: [...scheme.targetStoreIds],
    promoOptions: scheme.promoOptions.map(clonePromoOption),
    baseRevenue: scheme.baseRevenue,
    baseCost: scheme.baseCost,
    additionalCosts: scheme.additionalCosts,
  };
}

/** Deep-clones the optional CalculationResult. */
function cloneCalculation(
  calculation: CalculationResult,
): CalculationResult {
  return {
    totalCost: calculation.totalCost,
    margin: calculation.margin,
    npm: calculation.npm,
    warning: calculation.warning,
  };
}

/**
 * Builds the duplicated Campaign name: COPY_MARKER followed by the source name,
 * truncated to at most DUPLICATE_NAME_MAX characters. Because COPY_MARKER is
 * shorter than the limit, slicing the combined string keeps the marker intact
 * (Requirement 8.5).
 */
function buildDuplicateName(sourceName: string): string {
  return `${COPY_MARKER}${sourceName}`.slice(0, DUPLICATE_NAME_MAX);
}

/**
 * Duplicates a Campaign as an independent deep copy (Requirement 8.2). The
 * result keeps every Skema_Campaign value of the source (promo options,
 * category, target stores, date range), starts at status Menunggu
 * (Requirement 8.1), and gets a copy-marked, ≤ 200-char name (Requirement 8.5).
 */
export function duplicate(
  source: Campaign,
  now: EpochMillis,
  id?: CampaignId,
): Campaign {
  const name = buildDuplicateName(source.name);

  const copy: Campaign = {
    id: id ?? `campaign-${++autoSeq}`,
    name,
    category: source.category,
    status: "Menunggu",
    step: "BuatSkema",
    timelineStart: source.timelineStart,
    timelineEnd: source.timelineEnd,
    scheme: cloneScheme(source.scheme),
    targetStoreIds: [...source.targetStoreIds],
    createdAt: now,
    updatedAt: now,
  };

  if (source.scheduledStart !== undefined) {
    copy.scheduledStart = source.scheduledStart;
  }
  if (source.scheduledEnd !== undefined) {
    copy.scheduledEnd = source.scheduledEnd;
  }
  if (source.calculation !== undefined) {
    copy.calculation = cloneCalculation(source.calculation);
  }

  return copy;
}
