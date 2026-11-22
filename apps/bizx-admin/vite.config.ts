import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:3101';
  const apiOrigin = (() => {
    try {
      return new URL(apiTarget).origin;
    } catch {
      return 'http://localhost:3101';
    }
  })();

  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      mode === 'production'
        ? "script-src 'self'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https: ${apiOrigin}`,
      "font-src 'self' data:",
      `connect-src 'self' ${apiOrigin} ws://localhost:* https://*.bizx.ua`
    ].join('; ')
  };

  return {
    plugins: [react()],
    server: {
      port: 3102,
      headers: securityHeaders,
      proxy: {
        '/storage': {
          target: apiTarget,
          changeOrigin: true
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      headers: securityHeaders
    }
  };
});
