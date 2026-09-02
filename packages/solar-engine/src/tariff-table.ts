/**
 * Indicative blended residential tariffs (INR/unit) by DISCOM, averaged
 * across slabs for a typical 200-400 unit/month rooftop-solar household.
 * These are illustrative benchmarks for sizing, not live DISCOM rates —
 * refresh from each DISCOM's published tariff order before using for
 * customer-facing billing reconciliation.
 */
export const DISCOM_BLENDED_TARIFF_INR_PER_UNIT: Record<string, number> = {
  MSEDCL: 8.2, // Maharashtra
  BEST: 7.6, // Mumbai
  PGVCL: 6.8, // Gujarat (Paschim Gujarat Vij Company)
  UGVCL: 6.6, // Gujarat (Uttar Gujarat Vij Company)
  BESCOM: 7.1, // Karnataka
  TANGEDCO: 6.4, // Tamil Nadu
  TSSPDCL: 7.3, // Telangana
  TSNPDCL: 7.0, // Telangana
  APSPDCL: 7.4, // Andhra Pradesh
  BSES_RAJDHANI: 7.8, // Delhi
  BSES_YAMUNA: 7.8, // Delhi
  TATA_POWER_DELHI: 7.5, // Delhi
  UPPCL: 6.9, // Uttar Pradesh
  PSPCL: 6.2, // Punjab
  HERC: 6.5, // Haryana
  JVVNL: 7.0, // Rajasthan
  WBSEDCL: 7.2, // West Bengal
  CESC: 8.0, // Kolkata
  DEFAULT: 7.0,
};

export function getBlendedTariff(discom: string): number {
  const key = discom.trim().toUpperCase().replace(/\s+/g, '_');
  return DISCOM_BLENDED_TARIFF_INR_PER_UNIT[key] ?? DISCOM_BLENDED_TARIFF_INR_PER_UNIT.DEFAULT!;
}

/**
 * Average peak-sun-hour-equivalent generation per installed kWp per day,
 * by state — India ranges roughly 3.8 (high-humidity east/northeast) to
 * 5.2 (arid Rajasthan/Gujarat) units/kWp/day. Used to convert consumption
 * into required system size.
 */
export const STATE_GENERATION_UNITS_PER_KWP_PER_DAY: Record<string, number> = {
  Rajasthan: 5.2,
  Gujarat: 5.0,
  MadhyaPradesh: 4.9,
  Maharashtra: 4.7,
  Karnataka: 4.6,
  TamilNadu: 4.6,
  AndhraPradesh: 4.7,
  Telangana: 4.6,
  UttarPradesh: 4.3,
  Punjab: 4.4,
  Haryana: 4.4,
  Delhi: 4.3,
  WestBengal: 3.9,
  Bihar: 4.0,
  Kerala: 4.1,
  Assam: 3.8,
  DEFAULT: 4.5,
};

export function getGenerationFactor(siteState: string): number {
  const key = siteState.trim().replace(/\s+/g, '');
  return STATE_GENERATION_UNITS_PER_KWP_PER_DAY[key] ?? STATE_GENERATION_UNITS_PER_KWP_PER_DAY.DEFAULT!;
}
