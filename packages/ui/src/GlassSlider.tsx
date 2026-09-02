'use client';

import type { ChangeEvent } from 'react';
import { cn } from './cn';

export interface GlassSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  accent?: 'emerald' | 'amber' | 'cyan';
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

const ACCENT_CLASS: Record<NonNullable<GlassSliderProps['accent']>, string> = {
  emerald: 'accent-solar-emerald',
  amber: 'accent-solar-amber',
  cyan: 'accent-solar-cyan',
};

export function GlassSlider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  accent = 'emerald',
  onChange,
  formatValue = (v) => v.toLocaleString('en-IN'),
}: GlassSliderProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-semibold text-slate-100 tabular-nums">
          {formatValue(value)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={cn('h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10', ACCENT_CLASS[accent])}
      />
    </div>
  );
}
