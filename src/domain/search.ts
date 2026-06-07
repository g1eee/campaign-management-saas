/**
 * Layanan_Pencarian (Search & Filter) — pure board search (Requirement 11).
 *
 * Filters a list of Campaigns by a case-insensitive name substring AND an
 * optional Campaign_Category. Whitespace-only search text is ignored so that
 * only the active category filter applies, and search text whose trimmed
 * length exceeds the maximum is rejected without changing the displayed result.
 * This module is I/O-free; the UI layer wires the criteria and renders results.
 *
 * _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
 */

import { Campaign, CampaignCategory, SEARCH_MAX } from "./types.js";

export { SEARCH_MAX };

export interface SearchCriteria {
  /** Trimmed before use; empty/whitespace-only text is ignored (Requirement 11.5). */
  text?: string;
  /** Optional Campaign_Category filter (Requirement 11.2). */
  category?: CampaignCategory;
}

export type SearchResult =
  | { ok: true; matched: Campaign[] }
  | { ok: false; reason: string };

/**
 * Filters campaigns: a campaign matches when (the search text is empty after
 * trimming OR its name contains the text as a case-insensitive substring) AND
 * (no category is selected OR its category equals the selected one).
 *
 * - Empty/whitespace-only text applies only the category filter (Requirement 11.5).
 * - Empty criteria (no text, no category) returns all campaigns (Requirement 11.4).
 * - Text whose trimmed length exceeds SEARCH_MAX is rejected; callers keep the
 *   previously displayed result unchanged (Requirement 11.6).
 *
 * Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6.
 */
export function searchCampaigns(
  campaigns: readonly Campaign[],
  criteria: SearchCriteria,
): SearchResult {
  const trimmed = (criteria.text ?? "").trim();

  // Trimmed text longer than the limit cannot be a valid 1..100 query (Req 11.6).
  if (trimmed.length > SEARCH_MAX) {
    return {
      ok: false,
      reason: `Teks pencarian maksimum ${SEARCH_MAX} karakter.`,
    };
  }

  const textActive = trimmed.length > 0;
  const needle = trimmed.toLowerCase();
  const category = criteria.category;

  const matched = campaigns.filter((campaign) => {
    const nameMatches =
      !textActive || campaign.name.toLowerCase().includes(needle);
    const categoryMatches =
      category === undefined || campaign.category === category;
    return nameMatches && categoryMatches;
  });

  return { ok: true, matched };
}
