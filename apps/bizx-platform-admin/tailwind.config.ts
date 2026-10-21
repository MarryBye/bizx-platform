import sharedConfig from '@bizx/tailwind-config';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [sharedConfig],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'
  ]
};

export default config;
