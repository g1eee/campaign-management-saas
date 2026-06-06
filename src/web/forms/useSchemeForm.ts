/**
 * Shared validation/preview form hook.
 *
 * Invokes the pure validation engine for synchronous (<500ms) validation and
 * real-time scheme preview, retaining entered values and blocking saves with
 * errors.
 *
 * _Requirements: 22.1, 22.2, 22.3, 22.4_
 */

import { useMemo, useState } from "react";
import { CampaignScheme } from "../../domain/types.js";
import {
  previewFor,
  SchemePreview,
  validateScheme,
  Violation,
} from "../../domain/validation.js";

export interface SchemeForm {
  scheme: CampaignScheme;
  setScheme: (updater: (s: CampaignScheme) => CampaignScheme) => void;
  violations: Violation[];
  violationFor: (field: string) => string | undefined;
  isValid: boolean;
  preview: SchemePreview;
}

export function useSchemeForm(initial: CampaignScheme): SchemeForm {
  const [scheme, setSchemeState] = useState<CampaignScheme>(initial);

  const violations = useMemo(() => validateScheme(scheme), [scheme]);
  const preview = useMemo(() => previewFor(scheme), [scheme]);

  return {
    scheme,
    setScheme: (updater) => setSchemeState((s) => updater(s)),
    violations,
    violationFor: (field) => violations.find((v) => v.field === field)?.reason,
    isValid: violations.length === 0,
    preview,
  };
}
