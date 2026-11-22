import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
const apiOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101').origin;
  } catch {
    return 'http://localhost:3101';
  }
})();

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  isProd
    ? "script-src 'self' 'unsafe-inline'"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  "font-src 'self' data:",
  `connect-src 'self' ${apiOrigin} https://*.bizx.ua`
].join('; ');

const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  { key: 'Content-Security-Policy', value: cspDirectives },
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : [])
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@bizx/ui', '@bizx/common-types', '@bizx/utils'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: baseSecurityHeaders
      },
      {
        source: '/store/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }]
      }
    ];
  }
};

export default nextConfig;
