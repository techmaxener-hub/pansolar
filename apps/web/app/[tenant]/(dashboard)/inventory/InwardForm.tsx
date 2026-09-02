'use client';

import { useState } from 'react';
import { GlassButton, GlassCard } from '@solaros/ui';
import { inwardSerial } from './actions';

interface Option {
  id: string;
  label: string;
}

export function InwardForm({
  tenantSlug,
  products,
  warehouses,
}: {
  tenantSlug: string;
  products: Option[];
  warehouses: Option[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [serialNumber, setSerialNumber] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <GlassCard>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Inward Serialized Stock
      </h3>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!productId || !warehouseId || !serialNumber) return;
          setSaving(true);
          await inwardSerial(tenantSlug, { productId, warehouseId, serialNumber });
          setSerialNumber('');
          setSaving(false);
        }}
      >
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
        >
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
        <input
          autoFocus
          placeholder="Scan or type serial / barcode"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
        />
        <GlassButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Inward'}
        </GlassButton>
      </form>
    </GlassCard>
  );
}
