'use client';

import { useEffect, useMemo, useState } from 'react';
import { GlassCard, GlassSlider, GlassTable, GlassBadge, GlassButton, SolarStatGauge } from '@solaros/ui';
import type { SolarSizingResult } from '@solaros/solar-engine';
import { bookSiteSurvey } from './actions';

const DISCOM_OPTIONS = [
  'MSEDCL',
  'BESCOM',
  'PGVCL',
  'UGVCL',
  'TANGEDCO',
  'TSSPDCL',
  'UPPCL',
  'PSPCL',
  'BSES Rajdhani',
  'WBSEDCL',
];

const STATE_OPTIONS = [
  'Maharashtra',
  'Karnataka',
  'Gujarat',
  'TamilNadu',
  'Telangana',
  'UttarPradesh',
  'Punjab',
  'Delhi',
  'WestBengal',
  'Rajasthan',
];

function formatInr(value: number): string {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

export function CalculatorClient({ tenantSlug }: { tenantSlug: string }) {
  const [monthlyBillInr, setMonthlyBillInr] = useState(3500);
  const [discom, setDiscom] = useState(DISCOM_OPTIONS[0]!);
  const [siteState, setSiteState] = useState(STATE_OPTIONS[0]!);
  const [availableAreaSqft, setAvailableAreaSqft] = useState(500);
  const [result, setResult] = useState<SolarSizingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [bookingState, setBookingState] = useState<'idle' | 'saving' | 'done'>('idle');

  const requestBody = useMemo(
    () => ({ tenantSlug, monthlyBillInr, discom, siteState, availableAreaSqft }),
    [tenantSlug, monthlyBillInr, discom, siteState, availableAreaSqft]
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      fetch('/api/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).error ?? 'Calculation failed');
          return res.json();
        })
        .then((data: SolarSizingResult) => setResult(data))
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setError(err.message);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestBody]);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-4">
        <GlassCard>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">Your Details</h2>
          <div className="flex flex-col gap-4">
            <GlassSlider
              label="Average Monthly Electricity Bill"
              value={monthlyBillInr}
              min={500}
              max={25000}
              step={100}
              unit="₹"
              onChange={setMonthlyBillInr}
              formatValue={(v) => v.toLocaleString('en-IN')}
            />
            <GlassSlider
              label="Available Shadow-Free Roof Area"
              value={availableAreaSqft}
              min={100}
              max={5000}
              step={50}
              unit="sq ft"
              accent="cyan"
              onChange={setAvailableAreaSqft}
            />
            <label className="block text-sm text-slate-400">
              DISCOM
              <select
                value={discom}
                onChange={(e) => setDiscom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100 backdrop-blur-xl"
              >
                {DISCOM_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-400">
              State
              <select
                value={siteState}
                onChange={(e) => setSiteState(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100 backdrop-blur-xl"
              >
                {STATE_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </GlassCard>

        {result && (
          <div className="grid grid-cols-2 gap-4">
            <SolarStatGauge
              label="System Size"
              value={result.systemSizeKw}
              maxValue={10}
              unit="kW"
              accent="emerald"
            />
            <SolarStatGauge
              label="Net Cost"
              value={result.netCostInr}
              maxValue={result.estimatedCostInr}
              unit="₹"
              accent="amber"
              formatValue={(v) => (v / 1000).toFixed(0) + 'k'}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {error && (
          <GlassCard className="border-red-500/30">
            <p className="text-sm text-red-300">{error}</p>
          </GlassCard>
        )}

        {result && (
          <>
            <GlassCard glow="emerald">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Est. cost" value={formatInr(result.estimatedCostInr)} />
                <Stat label="Subsidy" value={formatInr(result.subsidyAmountInr)} tone="emerald" />
                <Stat label="Net cost" value={formatInr(result.netCostInr)} tone="amber" />
                <Stat label="Roof area needed" value={`${result.requiredAreaSqft.toLocaleString('en-IN')} sq ft`} />
              </div>
              {result.areaFeasible === false && (
                <div className="mt-4">
                  <GlassBadge tone="amber">Roof area may be insufficient</GlassBadge>
                </div>
              )}
            </GlassCard>

            {result.warnings.length > 0 && (
              <GlassCard className="border-amber-500/20">
                <ul className="list-disc space-y-1 pl-4 text-sm text-amber-200/90">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </GlassCard>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Parametric Bill of Materials
              </h3>
              <GlassTable
                rowKey={(row) => row.description}
                columns={[
                  { key: 'description', header: 'Item', render: (r) => r.description },
                  { key: 'qty', header: 'Qty', align: 'right', render: (r) => `${r.quantity} ${r.unit}` },
                  { key: 'price', header: 'Unit Price', align: 'right', render: (r) => formatInr(r.unitPriceInr) },
                  { key: 'total', header: 'Total', align: 'right', render: (r) => formatInr(r.lineTotalInr) },
                ]}
                rows={result.bom}
              />
            </div>

            <GlassCard>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Book a Free Shading Survey
              </h3>
              {bookingState === 'done' ? (
                <p className="text-sm text-emerald-300">
                  Thanks! Our EPC team will call you within 24 hours to schedule your site survey.
                </p>
              ) : (
                <form
                  className="flex flex-col gap-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!result) return;
                    setBookingState('saving');
                    await bookSiteSurvey({
                      tenantSlug,
                      customerName,
                      customerPhone,
                      siteAddress,
                      siteState,
                      discom,
                      monthlyBillInr,
                      sizing: result,
                    });
                    setBookingState('done');
                  }}
                >
                  <input
                    required
                    placeholder="Full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
                  />
                  <input
                    required
                    placeholder="Phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
                  />
                  <input
                    required
                    placeholder="Site address"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                    className="rounded-xl border border-white/10 bg-slate-900/60 p-2.5 text-slate-100"
                  />
                  <GlassButton type="submit" disabled={bookingState === 'saving'}>
                    {bookingState === 'saving' ? 'Booking…' : 'Book Free Survey'}
                  </GlassButton>
                </form>
              )}
            </GlassCard>
          </>
        )}

        {loading && !result && <p className="text-sm text-slate-400">Calculating…</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'emerald' | 'amber' }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={
          tone === 'emerald' ? 'text-lg font-semibold text-emerald-300' : tone === 'amber' ? 'text-lg font-semibold text-amber-300' : 'text-lg font-semibold text-slate-100'
        }
      >
        {value}
      </p>
    </div>
  );
}
