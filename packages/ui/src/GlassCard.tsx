import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glow?: 'emerald' | 'amber' | 'cyan' | 'none';
  padding?: 'sm' | 'md' | 'lg';
}

const GLOW_CLASS: Record<NonNullable<GlassCardProps['glow']>, string> = {
  emerald: 'shadow-glass-glow-emerald',
  amber: 'shadow-glass-glow-amber',
  cyan: 'shadow-glass-glow-cyan',
  none: '',
};

const PADDING_CLASS: Record<NonNullable<GlassCardProps['padding']>, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function GlassCard({ children, glow = 'none', padding = 'md', className, ...rest }: GlassCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-xl',
        'shadow-glass-inner',
        GLOW_CLASS[glow],
        PADDING_CLASS[padding],
        className
      )}
      {...rest}
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}
