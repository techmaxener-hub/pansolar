import type { ReactNode } from 'react';
import { cn } from './cn';

export interface GlassBadgeProps {
  children: ReactNode;
  tone?: 'emerald' | 'amber' | 'cyan' | 'neutral';
}

const TONE_CLASS: Record<NonNullable<GlassBadgeProps['tone']>, string> = {
  emerald: 'border-solar-emerald/30 bg-solar-emerald/10 text-emerald-300',
  amber: 'border-solar-amber/30 bg-solar-amber/10 text-amber-300',
  cyan: 'border-solar-cyan/30 bg-solar-cyan/10 text-cyan-300',
  neutral: 'border-white/10 bg-white/5 text-slate-300',
};

export function GlassBadge({ children, tone = 'neutral' }: GlassBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium backdrop-blur-xl',
        TONE_CLASS[tone]
      )}
    >
      {children}
    </span>
  );
}
