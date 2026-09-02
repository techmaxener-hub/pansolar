import { cn } from './cn';

export interface SolarStatGaugeProps {
  label: string;
  value: number;
  maxValue: number;
  unit?: string;
  accent?: 'emerald' | 'amber' | 'cyan';
  formatValue?: (value: number) => string;
}

const ACCENT_STROKE: Record<NonNullable<SolarStatGaugeProps['accent']>, string> = {
  emerald: '#10B981',
  amber: '#F59E0B',
  cyan: '#06B6D4',
};

const ACCENT_TEXT: Record<NonNullable<SolarStatGaugeProps['accent']>, string> = {
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  cyan: 'text-cyan-400',
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function SolarStatGauge({
  label,
  value,
  maxValue,
  unit = '',
  accent = 'emerald',
  formatValue = (v) => v.toLocaleString('en-IN'),
}: SolarStatGaugeProps) {
  const ratio = maxValue > 0 ? Math.min(1, Math.max(0, value / maxValue)) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - ratio);

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl shadow-glass-inner">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 128 128" className="h-32 w-32 -rotate-90">
          <circle cx="64" cy="64" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="64"
            cy="64"
            r={RADIUS}
            fill="none"
            stroke={ACCENT_STROKE[accent]}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="transition-[stroke-dashoffset] duration-700 ease-out animate-pulse-glow"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-2xl font-semibold tabular-nums', ACCENT_TEXT[accent])}>
            {formatValue(value)}
            <span className="ml-1 text-sm font-normal text-slate-400">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}
