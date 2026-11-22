import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException
} from '@nestjs/common';
import type { Request } from 'express';
import { isAllowedCorsOrigin } from './security-config.js';

/**
 * Reusable CSRF & Origin guard for cookie-authenticated or session-lifecycle endpoints
 * (e.g., POST /auth/refresh, POST /auth/logout, or any future cookie-authenticated route).
 *
 * Defenses enforced:
 * 1. Validates Origin (or Referer origin fallback) against the strict CORS allowlist.
 * 2. When browser fetch metadata (Origin or Sec-Fetch-Site) is present on cookie-bearing
 *    requests, requires a non-CORS-safelisted header (X-Requested-With or JSON Content-Type)
 *    to defeat simple cross-site HTML form / multipart CSRF submissions.
 */
@Injectable()
export class CsrfOriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const originHeader = typeof req.headers.origin === 'string' ? req.headers.origin.trim() : '';
    const refererHeader = typeof req.headers.referer === 'string' ? req.headers.referer.trim() : '';
    const secFetchSite =
      typeof req.headers['sec-fetch-site'] === 'string'
        ? req.headers['sec-fetch-site'].trim().toLowerCase()
        : '';

    if (originHeader) {
      if (!isAllowedCorsOrigin(originHeader)) {
        throw new ForbiddenException('Запит відхилено політикою безпеки (недозволений Origin)');
      }
    } else if (refererHeader) {
      try {
        const refOrigin = new URL(refererHeader).origin;
        if (!isAllowedCorsOrigin(refOrigin)) {
          throw new ForbiddenException('Запит відхилено політикою безпеки (недозволений Referer)');
        }
      } catch (err) {
        if (err instanceof ForbiddenException) throw err;
        throw new ForbiddenException('Некоректний заголовок Referer');
      }
    }

    const isBrowserContext = Boolean(originHeader || secFetchSite);
    if (isBrowserContext) {
      const hasCustomHeader = Boolean(req.headers['x-requested-with']);
      const contentType = String(req.headers['content-type'] || '').toLowerCase();
      const isJsonContentType = contentType.includes('application/json');

      if (!hasCustomHeader && !isJsonContentType) {
        throw new ForbiddenException('Відсутній обов’язковий CSRF-заголовок запиту');
      }
    }

    return true;
  }
}
