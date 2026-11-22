import { createLogger } from '@bizx/utils';

const logger = createLogger('SecurityConfig');

export const DEV_JWT_FALLBACK_SECRET = 'bizx-jwt-dev-secret-key-32chars-min!';
export const DEV_MEDIA_FALLBACK_SECRET = 'bizx-dev-media-signing-secret';

const KNOWN_DEV_SECRETS = new Set([
  DEV_JWT_FALLBACK_SECRET,
  DEV_MEDIA_FALLBACK_SECRET,
  'changeme',
  'secret',
  'dev-secret'
]);

const DEV_ALLOWED_ORIGINS = [
  'http://localhost:3100',
  'http://localhost:3102',
  'http://localhost:3103',
  'http://localhost:8081',
  'http://localhost:19006',
  'http://127.0.0.1:3100',
  'http://127.0.0.1:3102',
  'http://127.0.0.1:3103',
  'http://127.0.0.1:8081'
];

const PROD_ALLOWED_ORIGINS = [
  'https://bizx.ua',
  'https://www.bizx.ua',
  'https://admin.bizx.ua',
  'https://panel.bizx.ua'
];

export function isLocalDevEnv(): boolean {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  return env === 'development' || env === 'test';
}

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) return configured;
  if (isLocalDevEnv()) return DEV_JWT_FALLBACK_SECRET;
  throw new Error('FATAL: JWT_SECRET environment variable must be configured in production.');
}

export function getPreviewJwtSecret(): string {
  return `${getJwtSecret()}:store_preview`;
}

export function getMediaSigningSecret(): string {
  const configured = process.env.MEDIA_SIGNING_SECRET?.trim();
  if (configured) return configured;
  if (isLocalDevEnv()) return process.env.JWT_SECRET?.trim() || DEV_MEDIA_FALLBACK_SECRET;
  throw new Error(
    'FATAL: MEDIA_SIGNING_SECRET environment variable must be configured separately from JWT_SECRET in production.'
  );
}

/**
 * Fail-fast startup check for cryptographic secrets & transport configuration.
 * Aborts non-dev startup if production secrets are missing, short, or equal to dev placeholders.
 */
export function validateSecurityConfig(): void {
  if (isLocalDevEnv()) {
    if (!process.env.JWT_SECRET?.trim()) {
      logger.warn('Running with development JWT_SECRET fallback (NODE_ENV=development).');
    }
    return;
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() || '';
  if (jwtSecret.length < 32 || KNOWN_DEV_SECRETS.has(jwtSecret)) {
    throw new Error(
      'FATAL [SecurityConfig]: JWT_SECRET must be set to a unique random secret of at least 32 characters in non-development environments.'
    );
  }

  const mediaSecret = process.env.MEDIA_SIGNING_SECRET?.trim() || '';
  if (mediaSecret.length < 32 || KNOWN_DEV_SECRETS.has(mediaSecret) || mediaSecret === jwtSecret) {
    throw new Error(
      'FATAL [SecurityConfig]: MEDIA_SIGNING_SECRET must be set to a unique random secret (>= 32 chars, distinct from JWT_SECRET) in non-development environments.'
    );
  }
}

export function getAllowedOriginsSet(): Set<string> {
  const envOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const base = isLocalDevEnv()
    ? [...DEV_ALLOWED_ORIGINS, ...PROD_ALLOWED_ORIGINS]
    : [...PROD_ALLOWED_ORIGINS];

  return new Set([...base, ...envOrigins]);
}

/**
 * Shared origin allowlist used by both Express CORS and CsrfOriginGuard.
 * - Production: strictly HTTPS only, no localhost, no arbitrary ports.
 * - Development/Test: permits local dev ports (3100/3102/3103/8081/19006) + explicit CORS_ORIGINS.
 */
export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  const normalized = origin.trim().replace(/\/+$/, '');
  if (!normalized || normalized === 'null') return false;

  const allowedSet = getAllowedOriginsSet();
  if (allowedSet.has(normalized)) return true;

  // Allow official BizX HTTPS tenant subdomains (strictly HTTPS, no arbitrary ports in production)
  if (/^https:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.bizx\.ua$/i.test(normalized)) {
    return true;
  }

  // In local dev/test, also allow localhost subdomains (e.g., http://coffee.localhost:3100)
  if (
    isLocalDevEnv() &&
    /^http:\/\/[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.localhost:\d{2,5}$/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

/**
 * Safely parses TRUST_PROXY setting without allowing accidental wildcard spoofing.
 * Examples: "1", "loopback", "10.0.0.0/8,172.16.0.0/12", "false".
 */
export function parseTrustProxySetting(raw?: string): number | string | boolean {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed.toLowerCase() === 'false' || trimmed === '0') {
    return false;
  }
  if (/^\d+$/.test(trimmed)) {
    const hops = Number(trimmed);
    return hops >= 1 && hops <= 5 ? hops : 1;
  }
  if (trimmed.toLowerCase() === 'true') {
    // Avoid blind trust-all in production; clamp to 1 reverse proxy hop
    return 1;
  }
  return trimmed;
}
