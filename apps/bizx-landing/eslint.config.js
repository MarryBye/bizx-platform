import nextConfig from '@bizx/eslint-config/next';

export default [
  ...nextConfig,
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts']
  }
];
