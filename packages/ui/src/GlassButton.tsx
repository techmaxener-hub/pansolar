import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

export interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'emerald' | 'amber' | 'cyan' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_CLASS: Record<NonNullable<GlassButtonProps['variant']>, string> = {
  emerald: 'border-solar-emerald/40 bg-solar-emerald/15 text-emerald-300 hover:bg-solar-emerald/25 hover:shadow-glass-glow-emerald',
  amber: 'border-solar-amber/40 bg-solar-amber/15 text-amber-300 hover:bg-solar-amber/25 hover:shadow-glass-glow-amber',
  cyan: 'border-solar-cyan/40 bg-solar-cyan/15 text-cyan-300 hover:bg-solar-cyan/25 hover:shadow-glass-glow-cyan',
  ghost: 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
};

const SIZE_CLASS: Record<NonNullable<GlassButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function GlassButton({ children, variant = 'emerald', size = 'md', className, ...rest }: GlassButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl border backdrop-blur-xl',
        'font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
