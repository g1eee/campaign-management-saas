import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CalendarItem,
  detailFor,
  endOfDay,
  occursOnDay,
  startOfDay,
} from "./calendar.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const itemArb: fc.Arbitrary<CalendarItem> = fc
  .record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 10 }),
    category: fc.constantFrom("FlashSale" as const, "BrandDay" as const),
    status: fc.constantFrom("Live" as const, "Menunggu" as const),
    start: fc.integer({ min: 0, max: 1000 * DAY_MS }),
    duration: fc.integer({ min: 0, max: 30 * DAY_MS }),
  })
  .map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    status: r.status,
    start: r.start,
    end: r.start + r.duration,
  }));

describe("calendar", () => {
  // Feature: campaign-hub, Property 37: An item appears on a day iff its schedule overlaps that day
  it("Property 37: item appears on a day iff its schedule overlaps that day", () => {
    fc.assert(
      fc.property(itemArb, fc.integer({ min: 0, max: 1100 }), (item, dayIdx) => {
        const day = dayIdx * DAY_MS + 12345; // some time within the day
        const dayStart = startOfDay(day);
        const dayEnd = endOfDay(day);
        const expected = item.start <= dayEnd && dayStart <= item.end;
        expect(occursOnDay(item, day)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it("multi-day campaign appears on every day from start through end inclusive", () => {
    const item = { start: 5 * DAY_MS, end: 8 * DAY_MS };
    for (let d = 5; d <= 8; d++) {
      expect(occursOnDay(item, d * DAY_MS)).toBe(true);
    }
    expect(occursOnDay(item, 4 * DAY_MS)).toBe(false);
    expect(occursOnDay(item, 9 * DAY_MS)).toBe(false);
  });

  // Feature: campaign-hub, Property 38: Selected-date detail completeness
  it("Property 38: selected-date detail completeness", () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { maxLength: 20 }),
        fc.integer({ min: 0, max: 1100 }),
        (items, dayIdx) => {
          const day = dayIdx * DAY_MS + 999;
          const details = detailFor(day, items);
          // every detail corresponds to an item occurring on the day, with all fields
          for (const d of details) {
            expect(d.name.length).toBeGreaterThan(0);
            expect(d.category).toBeDefined();
            expect(d.status).toBeDefined();
            expect(typeof d.start).toBe("number");
            expect(typeof d.end).toBe("number");
          }
          // count matches the items overlapping the day
          const expectedCount = items.filter((i) => occursOnDay(i, day)).length;
          expect(details.length).toBe(expectedCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
