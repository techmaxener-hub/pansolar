'use client';

import { useState } from 'react';
import { GlassBadge, GlassButton, GlassCard } from '@solaros/ui';
import { setSubscriptionTier } from './actions';

const PLANS = [
  {
    tier: 'standard' as const,
    name: 'Standard',
    price: '₹0/mo',
    description: 'Shared PostgreSQL cluster, RLS-isolated. Ideal for solo installers.',
    features: ['Shared cluster (RLS-isolated)', 'Up to 50 projects/mo', 'Basic BOM engine'],
  },
  {
    tier: 'wholesaler_pro' as const,
    name: 'Wholesaler Pro',
    price: '₹4,999/mo',
    description: 'Shared cluster with higher limits — built for B2B volume sellers.',
    features: ['Shared cluster, higher connection limits', 'Unlimited projects', 'Tiered volume pricing + GSTIN validation'],
  },
  {
    tier: 'enterprise_dedicated' as const,
    name: 'Enterprise Dedicated',
    price: '₹24,999/mo',
    description: 'A personal, isolated Postgres instance provisioned just for you in ap-south-1 (Mumbai).',
    features: ['Dedicated Neon/Supabase instance', 'Zero noisy-neighbor risk', 'Same-day schema migrations, distributed'],
  },
];

export function SubscriptionClient({
  tenantSlug,
  currentTier,
  dbMode,
  managedDatabase,
}: {
  tenantSlug: string;
  currentTier: string;
  dbMode: string;
  managedDatabase: { provider: string; instance_id: string; region: string; provisioned_at: string } | null;
}) {
  const [tier, setTier] = useState(currentTier);
  const [switching, setSwitching] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [provisionDone, setProvisionDone] = useState(!!managedDatabase);

  const selectPlan = async (nextTier: string) => {
    setSwitching(true);
    await setSubscriptionTier(tenantSlug, nextTier);
    setTier(nextTier);
    setSwitching(false);
  };

  const provisionDedicated = async () => {
    setProvisioning(true);
    setProvisionError(null);
    const res = await fetch('/api/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantSlug }),
    });
    const data = await res.json();
    if (!res.ok) {
      setProvisionError(data.error);
    } else {
      setProvisionDone(true);
    }
    setProvisioning(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <GlassCard key={plan.tier} glow={tier === plan.tier ? 'emerald' : 'none'}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-100">{plan.name}</h3>
              {tier === plan.tier && <GlassBadge tone="emerald">Current</GlassBadge>}
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-100">{plan.price}</p>
            <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            {tier !== plan.tier && (
              <GlassButton className="mt-4 w-full" onClick={() => selectPlan(plan.tier)} disabled={switching}>
                {switching ? 'Switching…' : `Switch to ${plan.name}`}
              </GlassButton>
            )}
          </GlassCard>
        ))}
      </div>

      {tier === 'enterprise_dedicated' && (
        <GlassCard glow="cyan">
          <h3 className="mb-2 font-semibold text-cyan-300">Dedicated Database Instance</h3>
          {provisionDone ? (
            <div className="text-sm text-slate-300">
              <p>
                Status: <GlassBadge tone="emerald">{dbMode === 'dedicated_instance' ? 'Active' : 'Provisioning'}</GlassBadge>
              </p>
              {managedDatabase && (
                <p className="mt-2 text-slate-400">
                  {managedDatabase.provider} · {managedDatabase.instance_id} · {managedDatabase.region} · since{' '}
                  {new Date(managedDatabase.provisioned_at).toLocaleDateString('en-IN')}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-400">
                Spin up an isolated serverless Postgres instance in ap-south-1 (Mumbai), migrate the schema, and
                route this tenant's traffic there — no redeploy required.
              </p>
              <GlassButton onClick={provisionDedicated} disabled={provisioning} variant="cyan">
                {provisioning ? 'Provisioning… this can take a minute' : 'Provision Dedicated Instance'}
              </GlassButton>
              {provisionError && <p className="mt-2 text-sm text-red-300">{provisionError}</p>}
            </>
          )}
        </GlassCard>
      )}
    </div>
  );
}
