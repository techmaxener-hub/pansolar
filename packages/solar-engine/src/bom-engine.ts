import type { BomLine, CatalogProduct } from './types';

/** Standard string-inverter ratings a wholesaler stocks; system sizes are rounded up to the nearest one. */
const STANDARD_INVERTER_RATINGS_KW = [1, 2, 3, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50];

/** Fallback catalog pricing (INR) used when a tenant has no matching priced product yet. */
const FALLBACK_PRICING = {
  panel_540w: 12_500,
  inverter_per_kw: 6_500,
  acdb_set: 3_200,
  dcdb_set: 2_800,
  dc_cable_per_meter: 42,
  ac_cable_per_meter: 55,
  earthing_rod_chemical: 3_800,
  lightning_arrestor: 2_200,
  mounting_set_per_panel: 1_600,
};

const PANEL_WATTAGE = 540;
const AVG_DC_CABLE_RUN_METERS_PER_PANEL = 3.5;
const AVG_AC_CABLE_RUN_METERS = 15;

function pickInverterRatingKw(systemSizeKw: number): number {
  const match = STANDARD_INVERTER_RATINGS_KW.find((rating) => rating >= systemSizeKw);
  return match ?? Math.ceil(systemSizeKw / 10) * 10;
}

function priceFor(
  key: keyof typeof FALLBACK_PRICING,
  catalog: CatalogProduct[] | undefined,
  matcher: (p: CatalogProduct) => boolean
): number {
  const catalogMatch = catalog?.find(matcher);
  return catalogMatch?.unitPriceInr ?? FALLBACK_PRICING[key];
}

function inverterUnitPrice(inverterRatingKw: number, catalogProducts?: CatalogProduct[]): number {
  const catalogMatch = catalogProducts?.find((p) => p.category === 'inverter' && p.ratingWattsOrKw === inverterRatingKw);
  if (catalogMatch) return catalogMatch.unitPriceInr;
  return FALLBACK_PRICING.inverter_per_kw! * inverterRatingKw;
}

function line(
  category: BomLine['category'],
  description: string,
  quantity: number,
  unit: string,
  unitPriceInr: number
): BomLine {
  const roundedQty = Math.round(quantity * 100) / 100;
  return {
    category,
    description,
    quantity: roundedQty,
    unit,
    unitPriceInr,
    lineTotalInr: Math.round(roundedQty * unitPriceInr),
  };
}

/**
 * Generates the full parametric Bill of Materials for a given system size —
 * the exact BOM a 5kW project auto-populates with 540W mono-bifacial
 * panels, a correctly-rated string inverter, ACDB/DCDB, sized DC cable
 * runs, chemical earthing, lightning arrestor, and mounting structure sets.
 * `catalogProducts`, when supplied, overrides fallback pricing with the
 * tenant's actual priced SKUs (matched by category + rating).
 */
export function generateParametricBom(systemSizeKw: number, catalogProducts?: CatalogProduct[]): BomLine[] {
  if (systemSizeKw <= 0) return [];

  const panelCount = Math.ceil((systemSizeKw * 1000) / PANEL_WATTAGE);
  const inverterRatingKw = pickInverterRatingKw(systemSizeKw);
  const dcbdSetCount = Math.max(1, Math.ceil(systemSizeKw / 10));
  const acdbSetCount = Math.max(1, Math.ceil(systemSizeKw / 10));
  const earthingRodCount = 2 + Math.floor(Math.max(0, systemSizeKw - 5) / 5);
  const dcCableMeters = panelCount * AVG_DC_CABLE_RUN_METERS_PER_PANEL;
  const acCableMeters = AVG_AC_CABLE_RUN_METERS + Math.ceil(systemSizeKw / 10) * 5;

  const lines: BomLine[] = [
    line(
      'panel',
      `540W Mono Bifacial Solar Panel`,
      panelCount,
      'pcs',
      priceFor('panel_540w', catalogProducts, (p) => p.category === 'panel' && p.ratingWattsOrKw === PANEL_WATTAGE)
    ),
    line('inverter', `${inverterRatingKw}kW On-Grid String Inverter`, 1, 'unit', inverterUnitPrice(inverterRatingKw, catalogProducts)),
    line(
      'acdb',
      'AC Distribution Box (ACDB) — 1-in-1-out, SPD + MCB',
      acdbSetCount,
      'set',
      priceFor('acdb_set', catalogProducts, (p) => p.category === 'acdb')
    ),
    line(
      'dcdb',
      'DC Distribution Box (DCDB) — string fuses + SPD',
      dcbdSetCount,
      'set',
      priceFor('dcdb_set', catalogProducts, (p) => p.category === 'dcdb')
    ),
    line(
      'dc_cable',
      '4 sq.mm DC Solar Cable (Red/Black pair)',
      dcCableMeters,
      'meter',
      priceFor('dc_cable_per_meter', catalogProducts, (p) => p.category === 'dc_cable')
    ),
    line(
      'ac_cable',
      '4 sq.mm AC Armoured Cable',
      acCableMeters,
      'meter',
      priceFor('ac_cable_per_meter', catalogProducts, (p) => p.category === 'ac_cable')
    ),
    line(
      'earthing',
      'Chemical Earthing Rod Set (GI, with earthing pit chamber)',
      earthingRodCount,
      'set',
      priceFor('earthing_rod_chemical', catalogProducts, (p) => p.category === 'earthing')
    ),
    line(
      'lightning_arrestor',
      'Lightning Arrestor with Aluminium Strip',
      1,
      'unit',
      priceFor('lightning_arrestor', catalogProducts, (p) => p.category === 'lightning_arrestor')
    ),
    line(
      'mounting',
      'GI Mounting Structure Set (per panel, wind-load rated)',
      panelCount,
      'set',
      priceFor('mounting_set_per_panel', catalogProducts, (p) => p.category === 'mounting')
    ),
  ];

  return lines;
}

export function bomTotalInr(bom: BomLine[]): number {
  return bom.reduce((sum, l) => sum + l.lineTotalInr, 0);
}
