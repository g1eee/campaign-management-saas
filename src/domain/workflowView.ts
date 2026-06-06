/**
 * Workflow-visualization and navigation derivations (pure).
 *
 * Classifies each campaign step (and banner stage) as completed/active/upcoming
 * relative to a current step, and derives navigation state guaranteeing exactly
 * one active module and one active sidebar entry.
 *
 * _Requirements: 3.3, 3.4, 10.2, 10.3, 10.5, 10.6_
 */

import {
  BannerStatus,
  BANNER_STATUSES,
  CampaignStep,
  CAMPAIGN_STEPS,
  ModuleId,
} from "./types.js";

export type StepClass = "completed" | "active" | "upcoming";

export interface StepView<S> {
  step: S;
  classification: StepClass;
}

function classifySteps<S>(
  order: readonly S[],
  current: S | null,
): StepView<S>[] {
  const activeIndex = current === null ? -1 : order.indexOf(current);
  return order.map((step, i) => {
    let classification: StepClass;
    if (activeIndex === -1) classification = "upcoming";
    else if (i < activeIndex) classification = "completed";
    else if (i === activeIndex) classification = "active";
    else classification = "upcoming";
    return { step, classification };
  });
}

/**
 * Classifies the five campaign steps relative to the campaign's current step.
 * When `current` is null (no campaign selected), all steps are upcoming
 * (neither active nor completed) (Requirement 10.4).
 */
export function campaignStepView(
  current: CampaignStep | null,
): StepView<CampaignStep>[] {
  return classifySteps(CAMPAIGN_STEPS, current);
}

/** Classifies a banner's stage progression relative to its current status. */
export function bannerStageView(
  current: BannerStatus | null,
): StepView<BannerStatus>[] {
  return classifySteps(BANNER_STATUSES, current);
}

export interface NavigationState {
  activeModule: ModuleId;
  entries: { module: ModuleId; active: boolean }[];
}

/**
 * Derives the navigation state for a set of permitted modules and a requested
 * active module. Guarantees exactly one active entry. If the requested module
 * is not permitted, falls back to the first permitted module.
 * (Requirements 3.3, 3.4)
 */
export function navigationState(
  permitted: readonly ModuleId[],
  requested: ModuleId,
): NavigationState | null {
  if (permitted.length === 0) return null;
  const active = permitted.includes(requested) ? requested : permitted[0];
  return {
    activeModule: active,
    entries: permitted.map((module) => ({ module, active: module === active })),
  };
}
