/**
 * Navigation configuration (presentation-only).
 *
 * Controls which modules appear in the sidebar. The domain access policy still
 * governs permissions for every module; this list simply scopes the visible
 * navigation so we can roll out and optimize features incrementally.
 *
 * Notifikasi is intentionally NOT here — it lives as a bell in the top-right
 * header instead of being a primary sidebar feature.
 */

import { ModuleId } from "../domain/types.js";

/** Primary sidebar modules, in display order. */
export const NAV_MODULES: readonly ModuleId[] = [
  "Dashboard",
  "Campaign",
  "TugasSaya",
];
