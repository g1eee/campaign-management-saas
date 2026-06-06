/**
 * Ordering, filtering, and aggregation (pure).
 *
 * Generic sort/filter helpers plus campaign/asset grouping, dashboard summary
 * counts, date-range overlap filtering, and bounded upcoming/recent lists.
 *
 * _Requirements: 4.1, 4.2, 7.3, 17.5, 18.1, 18.2, 19.1, 19.2, 19.3, 19.4, 19.5_
 */

import {
  Campaign,
  CampaignCategory,
  CampaignStatus,
  CAMPAIGN_CATEGORIES,
  CAMPAIGN_STATUSES,
  DASHBOARD_LIST_LIMIT,
  EpochMillis,
} from "./types.js";

export type SortDirection = "asc" | "desc";

/** Stable sort by a numeric or string key. */
export function sortBy<T>(
  items: readonly T[],
  key: (item: T) => number | string,
  direction: SortDirection = "asc",
): T[] {
  const decorated = items.map((item, index) => ({ item, index, k: key(item) }));
  decorated.sort((a, b) => {
    let cmp: number;
    if (typeof a.k === "number" && typeof b.k === "number") {
      cmp = a.k - b.k;
    } else {
      cmp = String(a.k).localeCompare(String(b.k));
    }
    if (cmp === 0) cmp = a.index - b.index; // stable
    return direction === "asc" ? cmp : -cmp;
  });
  return decorated.map((d) => d.item);
}

/** Filter returning exactly the members satisfying a predicate. */
export function filterBy<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): T[] {
  return items.filter(predicate);
}

export interface DateRange {
  start: EpochMillis;
  end: EpochMillis;
}

export type RangeResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; reason: string };

/**
 * Two intervals overlap iff aStart <= bEnd and bStart <= aEnd.
 */
export function rangesOverlap(
  aStart: EpochMillis,
  aEnd: EpochMillis,
  bStart: EpochMillis,
  bEnd: EpochMillis,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Filters items whose [start,end] timeline overlaps the given range. Rejects
 * inverted ranges (end < start) (Requirement 19.5).
 */
export function filterByDateRange<T>(
  items: readonly T[],
  range: DateRange,
  timeline: (item: T) => { start: EpochMillis; end: EpochMillis },
): RangeResult<T> {
  if (range.end < range.start) {
    return { ok: false, reason: "Tanggal akhir tidak boleh sebelum tanggal awal." };
  }
  const result = items.filter((item) => {
    const t = timeline(item);
    return rangesOverlap(t.start, t.end, range.start, range.end);
  });
  return { ok: true, items: result };
}

/** Counts campaigns by status; the per-status counts sum to the total. */
export function countByStatus(
  campaigns: readonly Campaign[],
): Record<CampaignStatus, number> {
  const out = Object.fromEntries(
    CAMPAIGN_STATUSES.map((s) => [s, 0]),
  ) as Record<CampaignStatus, number>;
  for (const c of campaigns) out[c.status] += 1;
  return out;
}

/** Counts campaigns by category; the per-category counts sum to the total. */
export function countByCategory(
  campaigns: readonly Campaign[],
): Record<CampaignCategory, number> {
  const out = Object.fromEntries(
    CAMPAIGN_CATEGORIES.map((c) => [c, 0]),
  ) as Record<CampaignCategory, number>;
  for (const c of campaigns) out[c.category] += 1;
  return out;
}

/**
 * Upcoming campaigns: those whose scheduled start (falling back to timelineStart)
 * is on or after `now`, ordered ascending, capped at the dashboard limit.
 * (Requirement 4.2)
 */
export function upcomingCampaigns(
  campaigns: readonly Campaign[],
  now: EpochMillis,
  limit: number = DASHBOARD_LIST_LIMIT,
): Campaign[] {
  const startOf = (c: Campaign) => c.scheduledStart ?? c.timelineStart;
  const future = campaigns.filter((c) => startOf(c) >= now);
  const sorted = sortBy(future, startOf, "asc");
  return sorted.slice(0, limit);
}

/** Generic bounded most-recent list by a recency key, capped at limit. */
export function mostRecent<T>(
  items: readonly T[],
  recency: (item: T) => number,
  limit: number = DASHBOARD_LIST_LIMIT,
): T[] {
  return sortBy(items, recency, "desc").slice(0, limit);
}
