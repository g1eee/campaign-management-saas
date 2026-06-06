/**
 * Calendar overlap logic (pure).
 *
 * Determines whether a campaign or scheduled asset occurs on a given day
 * (inclusive start/end overlap), and derives the per-item detail shown when a
 * date is selected.
 *
 * _Requirements: 8.3, 13.4, 15.1, 15.2, 15.3, 15.5, 15.6_
 */

import {
  CampaignCategory,
  CampaignStatus,
  EpochMillis,
} from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Start-of-day (UTC) epoch millis for a timestamp. */
export function startOfDay(ts: EpochMillis): EpochMillis {
  return Math.floor(ts / DAY_MS) * DAY_MS;
}

/** End-of-day (UTC, exclusive boundary expressed inclusively) for a timestamp. */
export function endOfDay(ts: EpochMillis): EpochMillis {
  return startOfDay(ts) + DAY_MS - 1;
}

export interface CalendarItem {
  id: string;
  name: string;
  category: CampaignCategory;
  status: CampaignStatus | string;
  start: EpochMillis;
  end: EpochMillis;
}

/**
 * An item occurs on `day` iff the day's [00:00, 23:59:59.999] window overlaps
 * the item's [start, end] timeline inclusively (Requirement 15.6).
 */
export function occursOnDay(
  item: { start: EpochMillis; end: EpochMillis },
  day: EpochMillis,
): boolean {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  return item.start <= dayEnd && dayStart <= item.end;
}

/** Items occurring within a [periodStart, periodEnd] window (month/week/day). */
export function itemsInPeriod<T extends { start: EpochMillis; end: EpochMillis }>(
  items: readonly T[],
  periodStart: EpochMillis,
  periodEnd: EpochMillis,
): T[] {
  return items.filter(
    (i) => i.start <= periodEnd && periodStart <= i.end,
  );
}

export interface CalendarDetail {
  id: string;
  name: string;
  category: CampaignCategory;
  status: CampaignStatus | string;
  start: EpochMillis;
  end: EpochMillis;
}

/**
 * Detail for each item occurring on the selected date: name, category, current
 * status, and scheduled timeline (Requirement 15.5).
 */
export function detailFor(
  date: EpochMillis,
  items: readonly CalendarItem[],
): CalendarDetail[] {
  return items
    .filter((i) => occursOnDay(i, date))
    .map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      status: i.status,
      start: i.start,
      end: i.end,
    }));
}
