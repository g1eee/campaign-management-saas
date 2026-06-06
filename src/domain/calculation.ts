/**
 * Calculation_Service (pure).
 *
 * Deterministic, I/O-free derivation of total cost, margin, and NPM from
 * Campaign_Scheme economic inputs. This is the prime property-based-testing
 * target.
 *
 * _Requirements: 7.1, 7.2, 7.5_
 */

import { CalculationResult, NpmValue } from "./types.js";

export interface SchemeInputs {
  /** Base gross revenue before promo discounts (>= 0). */
  baseRevenue: number;
  /** Base cost of goods/operations (>= 0). */
  baseCost: number;
  /** Additional fixed costs (>= 0). */
  additionalCosts: number;
  /** Discount percentages of the promo options, each 0..100. */
  discountPcts: number[];
}

/**
 * Computes total cost, margin, and NPM.
 *
 * - Effective revenue is base revenue reduced by the aggregate promo discount.
 *   Each promo discount applies to base revenue; the combined discount is
 *   capped at 100% so revenue never goes negative.
 * - totalCost = baseCost + additionalCosts + promo cost (the revenue given up
 *   to discounts, i.e. baseRevenue - effectiveRevenue).
 * - margin = effectiveRevenue - totalCost.
 * - npm = margin / effectiveRevenue when effectiveRevenue > 0, else "undefined".
 * - warning is set when npm < 0 or npm is "undefined" (Requirement 7.5).
 */
export function calculate(inputs: SchemeInputs): CalculationResult {
  const { baseRevenue, baseCost, additionalCosts, discountPcts } = inputs;

  const totalDiscountPct = Math.min(
    100,
    discountPcts.reduce((sum, p) => sum + p, 0),
  );
  const effectiveRevenue = baseRevenue * (1 - totalDiscountPct / 100);
  const promoCost = baseRevenue - effectiveRevenue;

  const totalCost = baseCost + additionalCosts + promoCost;
  const margin = effectiveRevenue - totalCost;

  let npm: NpmValue;
  if (effectiveRevenue > 0) {
    npm = margin / effectiveRevenue;
  } else {
    npm = "undefined";
  }

  const warning = npm === "undefined" || npm < 0;

  return { totalCost, margin, npm, warning };
}

/** True once a campaign has a computed calculation (gate for approval). */
export function isCalculated(result: CalculationResult | undefined): boolean {
  return result !== undefined;
}
