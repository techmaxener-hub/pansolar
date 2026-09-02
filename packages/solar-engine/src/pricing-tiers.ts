export interface PriceTier {
  minQty: number;
  maxQty: number | null;
  unitPriceInr: number;
  tierLabel: string;
}

/**
 * Resolves the applicable unit price for a B2B order quantity against the
 * tenant's volume matrix (1–9 pcs retail, 10–99 pcs carton, 100+ pallet/
 * container bulk). Tiers are matched by the highest minQty the ordered
 * quantity satisfies, so wholesalers automatically see bulk pricing apply
 * as they raise the quantity slider.
 */
export function resolveTierPrice(tiers: PriceTier[], quantity: number): PriceTier {
  const applicable = tiers
    .filter((t) => quantity >= t.minQty && (t.maxQty === null || quantity <= t.maxQty))
    .sort((a, b) => b.minQty - a.minQty);

  const resolved = applicable[0];
  if (resolved) return resolved;

  const fallback = [...tiers].sort((a, b) => a.minQty - b.minQty)[0];
  if (!fallback) {
    throw new Error('No price tiers configured for this product.');
  }
  return fallback;
}

export function calculateLineTotal(tiers: PriceTier[], quantity: number): { tier: PriceTier; totalInr: number } {
  const tier = resolveTierPrice(tiers, quantity);
  return { tier, totalInr: Math.round(tier.unitPriceInr * quantity * 100) / 100 };
}
