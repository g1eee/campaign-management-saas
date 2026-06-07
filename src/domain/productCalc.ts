/**
 * Product-level campaign calculation (pure).
 *
 * Mirrors the team's "calculate campaign" spreadsheet: every marketplace fee is
 * a percentage of the selling price (Harga Jual). A campaign adds a Campaign
 * Fee (extra promo cost), which lowers NPM. Approval is auto-decided against a
 * configurable target NPM.
 *
 * Verified against the master data sample (e.g. Alea: 19.800 - 7.000 - 7.962 =
 * 4.838 -> 24,4% NPM).
 */

export interface FeeRates {
  adminFee: number; // 0.0825
  shippingFee: number; // 0.055
  promoXtra: number; // 0.045
  feePerOrder: number; // 0.03
  promosiFee: number; // 0.02
  marketingFee: number; // 0.02
  adsSpending: number; // 0.08
  affiliateCommission: number; // 0.0196
  operatingCost: number; // 0.05
}

/** Default rates derived from the master data (sum = 40.21%). */
export const DEFAULT_FEE_RATES: FeeRates = {
  adminFee: 0.0825,
  shippingFee: 0.055,
  promoXtra: 0.045,
  feePerOrder: 0.03,
  promosiFee: 0.02,
  marketingFee: 0.02,
  adsSpending: 0.08,
  affiliateCommission: 0.0196,
  operatingCost: 0.05,
};

/** Sum of all percentage fee rates (≈ 0.4021). */
export function totalFeeRate(rates: FeeRates): number {
  return (
    rates.adminFee +
    rates.shippingFee +
    rates.promoXtra +
    rates.feePerOrder +
    rates.promosiFee +
    rates.marketingFee +
    rates.adsSpending +
    rates.affiliateCommission +
    rates.operatingCost
  );
}

export type ProductCategory = "hjb" | "inner" | "dress/bls" | "Acs" | "mkn";

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  /** Harga Pokok Penjualan (cost of goods). */
  hpp: number;
  /** Harga Jual (selling price). */
  hargaJual: number;
}

export interface LineFees {
  admin: number;
  shipping: number;
  promoXtra: number;
  feePerOrder: number;
  campaignFee: number;
  promosi: number;
  marketing: number;
  ads: number;
  affiliate: number;
  operating: number;
}

export interface LineCalc {
  fees: LineFees;
  totalFees: number;
  marginValue: number;
  marginPct: number;
  npmValue: number;
  npmPct: number;
  approved: boolean;
}

const r = Math.round;

/**
 * Computes the fee breakdown, margin, NPM, and approval for a single product.
 *
 * @param campaignFee Extra campaign cost in Rupiah (e.g. an additional discount
 *   value applied during the campaign). Use 0 for the base (holding) sheet.
 * @param targetNpmPct Minimum NPM ratio (decimal, e.g. 0.15) for auto-approval.
 */
export function calcLine(
  product: Product,
  rates: FeeRates,
  campaignFee: number,
  targetNpmPct: number,
): LineCalc {
  const price = product.hargaJual;
  const fees: LineFees = {
    admin: r(rates.adminFee * price),
    shipping: r(rates.shippingFee * price),
    promoXtra: r(rates.promoXtra * price),
    feePerOrder: r(rates.feePerOrder * price),
    campaignFee: r(campaignFee),
    promosi: r(rates.promosiFee * price),
    marketing: r(rates.marketingFee * price),
    ads: r(rates.adsSpending * price),
    affiliate: r(rates.affiliateCommission * price),
    operating: r(rates.operatingCost * price),
  };

  const totalFees =
    fees.admin +
    fees.shipping +
    fees.promoXtra +
    fees.feePerOrder +
    fees.campaignFee +
    fees.promosi +
    fees.marketing +
    fees.ads +
    fees.affiliate +
    fees.operating;

  const marginValue = price - product.hpp;
  const marginPct = price > 0 ? marginValue / price : 0;
  const npmValue = price - product.hpp - totalFees;
  const npmPct = price > 0 ? npmValue / price : 0;
  const approved = npmPct >= targetNpmPct;

  return { fees, totalFees, marginValue, marginPct, npmValue, npmPct, approved };
}

export interface CampaignCalcSummary {
  productCount: number;
  approvedCount: number;
  avgNpmPct: number;
  totalMargin: number;
  totalNpm: number;
}

/** Aggregates the per-line calculations into a campaign summary. */
export function summarize(lines: LineCalc[]): CampaignCalcSummary {
  const productCount = lines.length;
  const approvedCount = lines.filter((l) => l.approved).length;
  const totalMargin = lines.reduce((s, l) => s + l.marginValue, 0);
  const totalNpm = lines.reduce((s, l) => s + l.npmValue, 0);
  const avgNpmPct =
    productCount === 0
      ? 0
      : lines.reduce((s, l) => s + l.npmPct, 0) / productCount;
  return { productCount, approvedCount, avgNpmPct, totalMargin, totalNpm };
}

/** Campaign fee in Rupiah for a discount percentage of the selling price. */
export function campaignFeeFromDiscount(
  hargaJual: number,
  discountPct: number,
): number {
  return Math.round((discountPct / 100) * hargaJual);
}
