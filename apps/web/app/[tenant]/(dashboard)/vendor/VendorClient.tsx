'use client';

import { useState } from 'react';
import { GlassBadge, GlassButton, GlassCard, GlassTable } from '@solaros/ui';
import { createAsnWithSerials, createPurchaseOrder } from './actions';

export interface PoRow {
  id: string;
  poNumber: string;
  vendorName: string;
  status: string;
  totalValueInr: number;
}

export interface Option {
  id: string;
  label: string;
}

export function VendorClient({
  tenantSlug,
  purchaseOrders,
  products,
  warehouses,
}: {
  tenantSlug: string;
  purchaseOrders: PoRow[];
  products: Option[];
  warehouses: Option[];
}) {
  const [vendorName, setVendorName] = useState('');
  const [vendorGstin, setVendorGstin] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [totalValueInr, setTotalValueInr] = useState(0);
  const [poError, setPoError] = useState<string | null>(null);
  const [savingPo, setSavingPo] = useState(false);

  const [purchaseOrderId, setPurchaseOrderId] = useState(purchaseOrders[0]?.id ?? '');
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? '');
  const [asnNumber, setAsnNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [serialCsvText, setSerialCsvText] = useState('');
  const [asnResult, setAsnResult] = useState<string | null>(null);
  const [savingAsn, setSavingAsn] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <GlassCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Purchase Orders</h3>
        <GlassTable
          rowKey={(r) => r.id}
          columns={[
            { key: 'po', header: 'PO #', render: (r) => r.poNumber },
            { key: 'vendor', header: 'Vendor', render: (r) => r.vendorName },
            { key: 'status', header: 'Status', render: (r) => <GlassBadge tone="cyan">{r.status}</GlassBadge> },
            { key: 'value', header: 'Value', align: 'right', render: (r) => `₹${r.totalValueInr.toLocaleString('en-IN')}` },
          ]}
          rows={purchaseOrders}
          emptyMessage="No purchase orders yet."
        />

        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPoError(null);
            setSavingPo(true);
            try {
              await createPurchaseOrder(tenantSlug, { vendorName, vendorGstin, poNumber, totalValueInr });
              setVendorName('');
              setVendorGstin('');
              setPoNumber('');
              setTotalValueInr(0);
            } catch (err) {
              setPoError((err as Error).message);
            } finally {
              setSavingPo(false);
            }
          }}
        >
          <input placeholder="Vendor name" value={vendorName} onChange={(e) => setVendorName(e.target.value)} required className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100" />
          <input placeholder="Vendor GSTIN" value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value.toUpperCase())} required maxLength={15} className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 font-mono text-slate-100" />
          <input placeholder="PO number" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} required className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100" />
          <input type="number" placeholder="Total value (₹)" value={totalValueInr || ''} onChange={(e) => setTotalValueInr(Number(e.target.value))} required className="w-40 rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100" />
          <GlassButton type="submit" disabled={savingPo}>
            {savingPo ? 'Creating…' : 'Create PO'}
          </GlassButton>
        </form>
        {poError && <p className="mt-2 text-sm text-red-300">{poError}</p>}
      </GlassCard>

      <GlassCard>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Advanced Shipping Notice — CSV Serial Ingestion
        </h3>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setSavingAsn(true);
            setAsnResult(null);
            const { serialsIngested } = await createAsnWithSerials(tenantSlug, {
              purchaseOrderId,
              productId,
              warehouseId,
              asnNumber,
              carrier,
              serialCsvText,
            });
            setAsnResult(`Ingested ${serialsIngested} serials into inventory.`);
            setSerialCsvText('');
            setSavingAsn(false);
          }}
        >
          <div className="flex flex-wrap gap-3">
            <select value={purchaseOrderId} onChange={(e) => setPurchaseOrderId(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100">
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber}
                </option>
              ))}
            </select>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100">
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.label}
                </option>
              ))}
            </select>
            <input placeholder="ASN number" value={asnNumber} onChange={(e) => setAsnNumber(e.target.value)} required className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100" />
            <input placeholder="Carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} required className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100" />
          </div>
          <textarea
            placeholder={'One serial number per line, e.g.\nMOD-540-000123\nMOD-540-000124'}
            value={serialCsvText}
            onChange={(e) => setSerialCsvText(e.target.value)}
            required
            rows={6}
            className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 font-mono text-sm text-slate-100"
          />
          <div>
            <GlassButton type="submit" disabled={savingAsn || !purchaseOrderId}>
              {savingAsn ? 'Ingesting…' : 'Dispatch ASN'}
            </GlassButton>
          </div>
          {asnResult && <p className="text-sm text-emerald-300">{asnResult}</p>}
        </form>
      </GlassCard>
    </div>
  );
}
