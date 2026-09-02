export interface SolarSizingInput {
  monthlyBillInr: number;
  discom: string;
  siteState: string;
  /** Shadow-free rooftop area the customer says they have available, sq ft. Used only to flag feasibility. */
  availableAreaSqft?: number;
  /** Existing DISCOM-sanctioned load in kW, if known — caps net-metering-eligible system size. */
  sanctionedLoadKw?: number;
}

export interface BomLine {
  category: BomCategory;
  description: string;
  quantity: number;
  unit: string;
  unitPriceInr: number;
  lineTotalInr: number;
}

export type BomCategory =
  | 'panel'
  | 'inverter'
  | 'acdb'
  | 'dcdb'
  | 'dc_cable'
  | 'ac_cable'
  | 'earthing'
  | 'lightning_arrestor'
  | 'mounting'
  | 'bos_other';

export interface SolarSizingResult {
  systemSizeKw: number;
  estimatedDailyUnits: number;
  estimatedMonthlyUnits: number;
  requiredAreaSqft: number;
  areaFeasible: boolean | null;
  blendedTariffInrPerUnit: number;
  bom: BomLine[];
  bomTotalInr: number;
  estimatedCostInr: number;
  subsidyAmountInr: number;
  netCostInr: number;
  netMeteringCapKw: number | null;
  warnings: string[];
}

/** A catalog product a tenant has priced, used to override the fallback BOM pricing table when available. */
export interface CatalogProduct {
  id: string;
  category: BomCategory;
  name: string;
  unitPriceInr: number;
  /** Watt rating for panels, kW rating for inverters — used to pick the right SKU for a given size. */
  ratingWattsOrKw?: number;
}
