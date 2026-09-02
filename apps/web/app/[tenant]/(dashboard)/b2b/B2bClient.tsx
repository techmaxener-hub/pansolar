'use client';

import { useMemo, useState } from 'react';
import { GlassButton, GlassCard, GlassBadge, GlassTable } from '@solaros/ui';
import { calculateLineTotal, computeGst, type PriceTier } from '@solaros/solar-engine';

export interface B2bProduct {
  id: string;
  name: string;
  category: string;
  tiers: PriceTier[];
}

const SELLER_STATE_CODE = '24'; // Gujarat — tenant's registered GSTIN state, would come from tenant settings in production

export function B2bClient({ products }: { products: B2bProduct[] }) {
  const [gstin, setGstin] = useState('');
  const [gstinResult, setGstinResult] = useState<{ valid: boolean; reason?: string; stateCode?: string | null } | null>(
    null
  );
  const [checking, setChecking] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [quantity, setQuantity] = useState(10);

  const product = products.find((p) => p.id === productId);
  const lineResult = useMemo(() => (product ? calculateLineTotal(product.tiers, quantity) : null), [product, quantity]);

  const gst = useMemo(() => {
    if (!lineResult || !gstinResult?.valid || !gstinResult.stateCode) return null;
    return computeGst(lineResult.totalInr, 'bos_composite', SELLER_STATE_CODE, gstinResult.stateCode);
  }, [lineResult, gstinResult]);

  const verifyGstin = async () => {
    setChecking(true);
    const res = await fetch('/api/gstin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gstin }),
    });
    setGstinResult(await res.json());
    setChecking(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Buyer GSTIN Verification</h3>
        <div className="flex items-center gap-3">
          <input
            placeholder="15-character GSTIN"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            maxLength={15}
            className="w-64 rounded-xl border border-white/10 bg-slate-900/60 p-2.5 font-mono text-slate-100"
          />
          <GlassButton onClick={verifyGstin} disabled={checking || gstin.length !== 15}>
            {checking ? 'Checking…' : 'Verify'}
          </GlassButton>
          {gstinResult && (
            <GlassBadge tone={gstinResult.valid ? 'emerald' : 'amber'}>
              {gstinResult.valid ? `Valid — state ${gstinResult.stateCode}` : gstinResult.reason}
            </GlassBadge>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Volume Order Pricing</h3>
        <div className="mb-4 flex items-end gap-3">
          <label className="text-sm text-slate-400">
            Product
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 block rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Quantity
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 block w-32 rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
            />
          </label>
        </div>

        {product && (
          <GlassTable
            rowKey={(t) => t.tierLabel}
            columns={[
              { key: 'tier', header: 'Tier', render: (t) => t.tierLabel },
              { key: 'range', header: 'Qty Range', render: (t) => `${t.minQty}${t.maxQty ? `–${t.maxQty}` : '+'}` },
              { key: 'price', header: 'Unit Price', align: 'right', render: (t) => `₹${t.unitPriceInr.toLocaleString('en-IN')}` },
              {
                key: 'active',
                header: '',
                align: 'center',
                render: (t) => (t.tierLabel === lineResult?.tier.tierLabel ? <GlassBadge tone="emerald">Applied</GlassBadge> : null),
              },
            ]}
            rows={product.tiers}
          />
        )}

        {lineResult && (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Applied Tier</p>
              <p className="font-semibold text-emerald-300">{lineResult.tier.tierLabel}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Subtotal</p>
              <p className="font-semibold text-slate-100">₹{lineResult.totalInr.toLocaleString('en-IN')}</p>
            </div>
            {gst && (
              <>
                <div>
                  <p className="text-xs uppercase text-slate-500">GST ({gst.gstRatePercent}%)</p>
                  <p className="font-semibold text-slate-100">₹{gst.totalGstInr.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Total</p>
                  <p className="font-semibold text-amber-300">₹{gst.totalWithGstInr.toLocaleString('en-IN')}</p>
                </div>
              </>
            )}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
