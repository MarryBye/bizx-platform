import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@bizx/ui', '@bizx/common-types', '@bizx/utils']
};

export default nextConfig;
