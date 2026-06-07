import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { filterCommands } from "./commandPalette.js";
import { PALETTE_MAX_VISIBLE } from "./types.js";
import { commandListArb } from "./testArbitraries.js";

describe("commandPalette.filterCommands", () => {
  // Feature: campaign-manager, Property 40: Kueri kosong menampilkan hingga 50 perintah
  // For any list of commands, an empty query (empty after trimming) yields
  // exactly the first min(count, 50) commands in their original order.
  // Validates: Requirements 12.2
  it("Feature: campaign-manager, Property 40: Kueri kosong menampilkan hingga 50 perintah", () => {
    // Queries that are empty after trimming all count as an "empty" palette query.
    const emptyQueryArb = fc.constantFrom("", " ", "   ", "\t", "\n", "  \t \n ");

    fc.assert(
      fc.property(commandListArb, emptyQueryArb, (commands, query) => {
        const result = filterCommands(commands, query);

        const expectedLength = Math.min(commands.length, PALETTE_MAX_VISIBLE);
        expect(result).toHaveLength(expectedLength);
        // Exactly the first `expectedLength` commands, in original order.
        expect(result).toEqual(commands.slice(0, PALETTE_MAX_VISIBLE));
        // Never exceeds the 50-command visible cap.
        expect(result.length).toBeLessThanOrEqual(PALETTE_MAX_VISIBLE);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: campaign-manager, Property 41: Penyaringan perintah berdasarkan substring label
  // For any list of commands and a query of 1..100 characters, the result is
  // exactly those commands whose label contains the query as a case-insensitive
  // substring, in original order.
  // Validates: Requirements 12.3
  it("Feature: campaign-manager, Property 41: Penyaringan perintah berdasarkan substring label", () => {
    const nonEmptyQuery = (s: string) => s.trim().length >= 1;

    // Generate commands plus a 1..100-char query. Bias toward substrings drawn
    // from an existing label so non-empty match sets are exercised, while still
    // covering arbitrary (often non-matching) queries.
    const scenarioArb = commandListArb.chain((commands) => {
      const arbitraryQuery = fc
        .string({ minLength: 1, maxLength: 100 })
        .filter(nonEmptyQuery);

      const labels = commands
        .map((c) => c.label)
        .filter((label) => label.trim().length >= 1);

      const queryArb =
        labels.length > 0
          ? fc.oneof(
              arbitraryQuery,
              fc
                .constantFrom(...labels)
                .chain((label) =>
                  fc
                    .tuple(
                      fc.nat({ max: Math.max(0, label.length - 1) }),
                      fc.integer({ min: 1, max: label.length }),
                    )
                    .map(([start, len]) => label.slice(start, start + len)),
                )
                .filter(nonEmptyQuery),
            )
          : arbitraryQuery;

      return fc.record({ commands: fc.constant(commands), query: queryArb });
    });

    fc.assert(
      fc.property(scenarioArb, ({ commands, query }) => {
        const result = filterCommands(commands, query);

        const needle = query.trim().toLowerCase();

        // Every returned command's label contains the query (case-insensitive).
        for (const command of result) {
          expect(command.label.toLowerCase().includes(needle)).toBe(true);
        }

        // Every command whose label contains the query is returned, and no
        // matching command is dropped: result equals the case-insensitive
        // substring filter over the input, preserving original order.
        const expected = commands.filter((command) =>
          command.label.toLowerCase().includes(needle),
        );
        expect(result).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });
});
