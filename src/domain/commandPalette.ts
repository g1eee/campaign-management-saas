/**
 * Palet_Perintah (Command Palette) — pure command filtering (Requirement 12).
 *
 * Filters a list of commands by a case-insensitive substring match against
 * each command's label. An empty query (empty after trimming) returns the
 * first commands up to a maximum of 50 (Requirement 12.2). A non-empty query
 * returns only commands whose label contains the query text, ignoring case
 * (Requirement 12.3); when nothing matches the result is an empty list, which
 * the UI surfaces as a "no matching command" indication (Requirement 12.4).
 *
 * This module is I/O-free and deterministic. Command execution, keyboard
 * shortcuts, and palette open/close behavior are handled by the UI layer.
 *
 * _Requirements: 12.2, 12.3, 12.4_
 */

import { PALETTE_MAX_VISIBLE, PALETTE_QUERY_MAX } from "./types.js";

/**
 * A runnable command exposed in the Palet_Perintah. `label` is the
 * user-facing text matched against the query; `run` performs the command's
 * action when selected.
 */
export interface Command {
  id: string;
  label: string;
  run: () => void;
}

/**
 * Filters commands by a case-insensitive substring match on the label.
 *
 * - When `query` is empty after trimming, returns the first
 *   `PALETTE_MAX_VISIBLE` (50) commands in their original order
 *   (Requirement 12.2).
 * - Otherwise returns every command whose label contains the trimmed query
 *   text without regard to case (Requirement 12.3). The query is considered up
 *   to `PALETTE_QUERY_MAX` (100) characters, matching the input bound enforced
 *   by the palette. When no command matches, the result is an empty list
 *   (Requirement 12.4).
 *
 * The input array is never mutated.
 */
export function filterCommands(
  commands: readonly Command[],
  query: string,
): Command[] {
  const trimmed = (query ?? "").trim();

  if (trimmed.length === 0) {
    return commands.slice(0, PALETTE_MAX_VISIBLE);
  }

  const needle = trimmed.slice(0, PALETTE_QUERY_MAX).toLowerCase();

  return commands.filter((command) =>
    command.label.toLowerCase().includes(needle),
  );
}
