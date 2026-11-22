import type { Request, Response, NextFunction } from 'express';
import { isLocalDevEnv } from './security-config.js';

/**
 * Zero-dependency HTTP security headers middleware for NestJS/Express API.
 * Applied globally in main.ts so every current and future endpoint is hardened by default.
 */
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  if (!isLocalDevEnv()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
