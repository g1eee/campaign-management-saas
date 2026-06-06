import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  canDelete,
  checkUniqueIdentifier,
  MasterDataReference,
} from "./masterData.js";
import { MasterDataRecord } from "./types.js";

const recordArb: fc.Arbitrary<MasterDataRecord> = fc.record({
  id: fc.uuid(),
  type: fc.constantFrom("StoreCategory", "PromoType"),
  uniqueId: fc.string({ minLength: 1, maxLength: 6 }),
  fields: fc.constant({}),
});

describe("masterData", () => {
  // Feature: campaign-hub, Property 42: Referenced records cannot be deleted; unreferenced can
  it("Property 42: referenced records cannot be deleted; unreferenced can", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(
          fc.record({ recordId: fc.uuid(), refLabel: fc.string({ minLength: 1 }) }),
          { maxLength: 10 },
        ),
        (recordId, refs) => {
          // ensure some references may point at recordId
          const references: MasterDataReference[] = refs;
          const result = canDelete(recordId, references);
          const matching = references.filter((r) => r.recordId === recordId);
          if (matching.length > 0) {
            expect(result.ok).toBe(false);
            if (!result.ok) {
              expect(result.referencedBy.length).toBe(matching.length);
            }
          } else {
            expect(result.ok).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("references pointing at the target block deletion", () => {
    const refs: MasterDataReference[] = [
      { recordId: "r1", refLabel: "Campaign A" },
      { recordId: "r2", refLabel: "Banner B" },
    ];
    expect(canDelete("r1", refs).ok).toBe(false);
    expect(canDelete("r3", refs).ok).toBe(true);
  });

  // Feature: campaign-hub, Property 43: Unique identifiers stay unique
  it("Property 43: unique identifiers stay unique", () => {
    fc.assert(
      fc.property(
        fc.array(recordArb, { maxLength: 15 }),
        recordArb,
        (existing, candidate) => {
          const result = checkUniqueIdentifier(candidate, existing);
          const conflict = existing.some(
            (r) => r.type === candidate.type && r.uniqueId === candidate.uniqueId,
          );
          expect(result.ok).toBe(!conflict);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("editing a record does not conflict with itself", () => {
    const existing: MasterDataRecord[] = [
      { id: "a", type: "PromoType", uniqueId: "X", fields: {} },
    ];
    const edit = { type: "PromoType", uniqueId: "X" };
    expect(checkUniqueIdentifier(edit, existing, "a").ok).toBe(true);
  });
});
