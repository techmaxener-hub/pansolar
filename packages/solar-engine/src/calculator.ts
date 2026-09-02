import { generateParametricBom, bomTotalInr } from './bom-engine';
import { getBlendedTariff, getGenerationFactor } from './tariff-table';
import { calculatePmSuryaGharSubsidy } from './subsidy';
import type { CatalogProduct, SolarSizingInput, SolarSizingResult } from './types';

const REQUIRED_AREA_SQFT_PER_KW = 100; // 540W mono-bifacial + mounting, India rooftop benchmark
const BENCHMARK_INSTALL_COST_PER_KW_INR = 60_000; // used only as a sanity check against the computed BOM total
const MIN_SYSTEM_SIZE_KW = 1;
const MAX_RESIDENTIAL_SYSTEM_SIZE_KW = 10; // PM Surya Ghar residential net-metering ceiling in most states
const SIZE_ROUNDING_STEP_KW = 0.5;

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Consumer Solar Sizing Calculator: turns a monthly electricity bill and
 * DISCOM into a recommended system size, feasibility check against
 * available roof area, full parametric BOM, and net cost after the PM
 * Surya Ghar central subsidy. This is the entry point the D2C storefront
 * calculator UI calls on every slider change.
 */
export function calculateSolarSizing(input: SolarSizingInput, catalogProducts?: CatalogProduct[]): SolarSizingResult {
  const warnings: string[] = [];

  const blendedTariff = getBlendedTariff(input.discom);
  const generationFactor = getGenerationFactor(input.siteState);

  const estimatedMonthlyUnits = input.monthlyBillInr / blendedTariff;
  const estimatedDailyUnits = estimatedMonthlyUnits / 30;

  let systemSizeKw = roundToStep(estimatedDailyUnits / generationFactor, SIZE_ROUNDING_STEP_KW);
  systemSizeKw = Math.max(MIN_SYSTEM_SIZE_KW, systemSizeKw);

  if (input.sanctionedLoadKw && systemSizeKw > input.sanctionedLoadKw) {
    warnings.push(
      `Recommended size (${systemSizeKw}kW) exceeds the sanctioned load (${input.sanctionedLoadKw}kW). ` +
        `A load enhancement application to the DISCOM will be required before net-metering sanction.`
    );
  }

  if (systemSizeKw > MAX_RESIDENTIAL_SYSTEM_SIZE_KW) {
    warnings.push(
      `Recommended size (${systemSizeKw}kW) exceeds the typical ${MAX_RESIDENTIAL_SYSTEM_SIZE_KW}kW residential ` +
        `net-metering ceiling — this project should be quoted as a commercial/C&I installation.`
    );
  }

  const requiredAreaSqft = systemSizeKw * REQUIRED_AREA_SQFT_PER_KW;
  const areaFeasible =
    input.availableAreaSqft === undefined ? null : input.availableAreaSqft >= requiredAreaSqft;

  if (areaFeasible === false) {
    const maxFeasibleKw = roundToStep((input.availableAreaSqft ?? 0) / REQUIRED_AREA_SQFT_PER_KW, SIZE_ROUNDING_STEP_KW);
    warnings.push(
      `Available shadow-free area (${input.availableAreaSqft} sq ft) only supports ~${maxFeasibleKw}kW — ` +
        `below the ${systemSizeKw}kW recommended for this bill. Consider bifacial vertical mounting or a smaller system.`
    );
  }

  const bom = generateParametricBom(systemSizeKw, catalogProducts);
  const bomTotal = bomTotalInr(bom);

  const benchmarkCost = systemSizeKw * BENCHMARK_INSTALL_COST_PER_KW_INR;
  if (Math.abs(bomTotal - benchmarkCost) / benchmarkCost > 0.25) {
    warnings.push(
      `Computed BOM total (₹${bomTotal.toLocaleString('en-IN')}) deviates >25% from the ₹${BENCHMARK_INSTALL_COST_PER_KW_INR.toLocaleString(
        'en-IN'
      )}/kW benchmark — verify catalog pricing for this tenant.`
    );
  }

  const subsidyAmountInr = calculatePmSuryaGharSubsidy(systemSizeKw);
  const netCostInr = Math.max(0, bomTotal - subsidyAmountInr);

  return {
    systemSizeKw,
    estimatedDailyUnits: Math.round(estimatedDailyUnits * 10) / 10,
    estimatedMonthlyUnits: Math.round(estimatedMonthlyUnits),
    requiredAreaSqft,
    areaFeasible,
    blendedTariffInrPerUnit: blendedTariff,
    bom,
    bomTotalInr: bomTotal,
    estimatedCostInr: bomTotal,
    subsidyAmountInr,
    netCostInr,
    netMeteringCapKw: input.sanctionedLoadKw ?? null,
    warnings,
  };
}
