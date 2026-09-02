export type GstLineKind = 'bos_composite' | 'service';

/** Composite BOS (Balance-of-System) hardware supply attracts a blended 13.8% effective rate under the prevailing solar-component GST notification; pure services (installation labor, AMC) attract 18%. */
const GST_RATE_PERCENT: Record<GstLineKind, number> = {
  bos_composite: 13.8,
  service: 18,
};

export interface GstBreakdown {
  taxableValueInr: number;
  gstRatePercent: number;
  cgstInr: number;
  sgstInr: number;
  igstInr: number;
  totalGstInr: number;
  totalWithGstInr: number;
}

/**
 * Computes GST for a line item, splitting CGST+SGST for an intra-state
 * supply or IGST for inter-state, per the buyer's and seller's GSTIN state
 * codes.
 */
export function computeGst(
  taxableValueInr: number,
  kind: GstLineKind,
  sellerStateCode: string,
  buyerStateCode: string
): GstBreakdown {
  const rate = GST_RATE_PERCENT[kind];
  const totalGst = Math.round(taxableValueInr * (rate / 100) * 100) / 100;
  const isIntraState = sellerStateCode === buyerStateCode;

  return {
    taxableValueInr,
    gstRatePercent: rate,
    cgstInr: isIntraState ? Math.round((totalGst / 2) * 100) / 100 : 0,
    sgstInr: isIntraState ? Math.round((totalGst / 2) * 100) / 100 : 0,
    igstInr: isIntraState ? 0 : totalGst,
    totalGstInr: totalGst,
    totalWithGstInr: Math.round((taxableValueInr + totalGst) * 100) / 100,
  };
}
