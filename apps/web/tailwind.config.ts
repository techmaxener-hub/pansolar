import type { Config } from 'tailwindcss';
import preset from '@solaros/ui/tailwind-preset.js';

const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
