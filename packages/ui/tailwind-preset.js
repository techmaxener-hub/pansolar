/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        'solar-void': '#090D16',
        'solar-surface': 'rgba(15, 23, 42, 0.5)',
        'solar-emerald': '#10B981',
        'solar-amber': '#F59E0B',
        'solar-cyan': '#06B6D4',
      },
      backdropBlur: {
        xl: '24px',
      },
      boxShadow: {
        'glass-inner': 'inset 0 1px 0 0 rgba(255,255,255,0.08), inset 0 0 32px 0 rgba(16,185,129,0.06)',
        'glass-glow-emerald': '0 0 24px 0 rgba(16,185,129,0.35)',
        'glass-glow-amber': '0 0 24px 0 rgba(245,158,11,0.35)',
        'glass-glow-cyan': '0 0 24px 0 rgba(6,182,212,0.35)',
      },
      backgroundImage: {
        'solar-grid': 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'solar-grid': '32px 32px',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.6 },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      },
    },
  },
};
