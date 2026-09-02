import Link from 'next/link';
import { GlassButton, GlassCard } from '@solaros/ui';

export default async function StorefrontHome({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = await params;

  return (
    <div className="flex flex-col items-center gap-10 text-center">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
          Size your rooftop solar system in{' '}
          <span style={{ color: 'var(--tenant-brand-primary)' }}>60 seconds</span>
        </h1>
        <p className="mt-4 text-slate-400">
          Enter your monthly electricity bill — we calculate the ideal system size, generate a full
          Bill of Materials, and apply your PM Surya Ghar subsidy automatically.
        </p>
      </div>

      <Link href={`/${tenant}/calculator`}>
        <GlassButton size="lg">Calculate My Solar Savings →</GlassButton>
      </Link>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        <GlassCard glow="emerald">
          <h3 className="font-semibold text-emerald-300">Parametric BOM</h3>
          <p className="mt-2 text-sm text-slate-400">
            540W Mono Bifacial panels, string inverter, ACDB/DCDB, and mounting — auto-generated for
            your exact system size.
          </p>
        </GlassCard>
        <GlassCard glow="amber">
          <h3 className="font-semibold text-amber-300">Central Subsidy Applied</h3>
          <p className="mt-2 text-sm text-slate-400">
            PM Surya Ghar: Muft Bijli Yojana CFA is deducted from your net cost, live, on the
            calculator.
          </p>
        </GlassCard>
        <GlassCard glow="cyan">
          <h3 className="font-semibold text-cyan-300">7-Stage EPC Tracking</h3>
          <p className="mt-2 text-sm text-slate-400">
            From shading survey to subsidy disbursal — track your installation end-to-end.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
