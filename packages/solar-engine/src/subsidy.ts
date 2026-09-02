/**
 * PM Surya Ghar: Muft Bijli Yojana — Central Financial Assistance for
 * residential rooftop solar, as published by MNRE:
 *   - First 2 kW:            ₹30,000 / kW  (max ₹60,000)
 *   - Next 1 kW (2kW→3kW):   ₹18,000 / kW  (max additional ₹18,000)
 *   - Beyond 3 kW:           capped — no additional CFA
 * Total subsidy is capped at ₹78,000 regardless of system size beyond 3kW.
 * MNRE revises these slabs periodically — treat as configurable, not fixed.
 */
const TIER_1_CAP_KW = 2;
const TIER_1_RATE_INR_PER_KW = 30_000;
const TIER_2_CAP_KW = 3;
const TIER_2_RATE_INR_PER_KW = 18_000;
const MAX_SUBSIDY_INR = 78_000;

export function calculatePmSuryaGharSubsidy(systemSizeKw: number): number {
  if (systemSizeKw <= 0) return 0;

  const tier1Kw = Math.min(systemSizeKw, TIER_1_CAP_KW);
  const tier2Kw = Math.max(0, Math.min(systemSizeKw, TIER_2_CAP_KW) - TIER_1_CAP_KW);

  const subsidy = tier1Kw * TIER_1_RATE_INR_PER_KW + tier2Kw * TIER_2_RATE_INR_PER_KW;
  return Math.min(subsidy, MAX_SUBSIDY_INR);
}
