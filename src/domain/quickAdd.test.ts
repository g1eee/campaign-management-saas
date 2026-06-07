import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  createDraft,
  QUICK_ADD_NAME_MAX,
  QUICK_ADD_NAME_MIN,
} from "./quickAdd.js";
import { DEFAULT_DRAFT_CATEGORY, EpochMillis } from "./types.js";

/** A single non-whitespace, printable character. */
const nonWsCharArb = fc.char().filter((c) => c.trim().length === 1);

/** Zero or more whitespace characters used to pad names front/back. */
const whitespaceArb = fc.stringOf(fc.constantFrom(" ", "\t", "\n", "\r"), {
  maxLength: 8,
});

/** A timestamp argument for createDraft. */
const nowArb: fc.Arbitrary<EpochMillis> = fc.integer({
  min: 0,
  max: 4_000_000_000_000,
});

describe("quickAdd.createDraft", () => {
  // Feature: campaign-manager, Property 12: Tambah Cepat membuat draft dari nama valid
  it("Property 12: name with trimmed length 1..100 yields a draft with the trimmed name and status Menunggu", () => {
    // A core (non-whitespace at both ends) with trimmed length 1..100, padded
    // with arbitrary surrounding whitespace so trimming is exercised.
    const validRawArb = fc
      .record({
        core: fc.stringOf(nonWsCharArb, {
          minLength: QUICK_ADD_NAME_MIN,
          maxLength: QUICK_ADD_NAME_MAX,
        }),
        lead: whitespaceArb,
        trail: whitespaceArb,
      })
      .map(({ core, lead, trail }) => ({ raw: lead + core + trail, core }));

    fc.assert(
      fc.property(validRawArb, nowArb, ({ raw, core }, now) => {
        const result = createDraft(raw, now, DEFAULT_DRAFT_CATEGORY);
        expect(result.ok).toBe(true);
        if (result.ok) {
          const trimmedLen = core.length;
          expect(trimmedLen).toBeGreaterThanOrEqual(QUICK_ADD_NAME_MIN);
          expect(trimmedLen).toBeLessThanOrEqual(QUICK_ADD_NAME_MAX);
          expect(result.campaign.name).toBe(core);
          expect(result.campaign.scheme.name).toBe(core);
          expect(result.campaign.status).toBe("Menunggu");
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 13: Nama kosong (setelah pemangkasan) ditolak
  it("Property 13: whitespace-only name (empty after trimming) is rejected and no campaign is created", () => {
    const blankRawArb = fc.stringOf(
      fc.constantFrom(" ", "\t", "\n", "\r", "\f", "\v"),
      { maxLength: 20 },
    );

    fc.assert(
      fc.property(blankRawArb, nowArb, (raw, now) => {
        // Precondition: this generator only produces strings that trim to empty.
        expect(raw.trim().length).toBe(0);
        const result = createDraft(raw, now, DEFAULT_DRAFT_CATEGORY);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toMatch(/wajib diisi/i);
          expect(result).not.toHaveProperty("campaign");
        }
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 14: Nama melebihi 100 karakter ditolak
  it("Property 14: name with trimmed length greater than 100 is rejected and no campaign is created", () => {
    // Core with trimmed length 101..200 (non-whitespace at both ends), padded
    // with arbitrary surrounding whitespace.
    const overLongRawArb = fc
      .record({
        core: fc.stringOf(nonWsCharArb, {
          minLength: QUICK_ADD_NAME_MAX + 1,
          maxLength: QUICK_ADD_NAME_MAX + 100,
        }),
        lead: whitespaceArb,
        trail: whitespaceArb,
      })
      .map(({ core, lead, trail }) => ({ raw: lead + core + trail, core }));

    fc.assert(
      fc.property(overLongRawArb, nowArb, ({ raw, core }, now) => {
        expect(core.length).toBeGreaterThan(QUICK_ADD_NAME_MAX);
        const result = createDraft(raw, now, DEFAULT_DRAFT_CATEGORY);
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toMatch(/100 karakter/i);
          expect(result).not.toHaveProperty("campaign");
        }
      }),
      { numRuns: 100 },
    );
  });
});
