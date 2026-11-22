import { NextResponse, type NextRequest } from 'next/server';
import { isValidSlug, isValidCustomHostname } from '@bizx/utils';

const API_BASE =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'panel', 'api', 'shops']);

const HOST_CACHE_TTL_MS = 30_000;
const HOST_CACHE_MAX_ENTRIES = 500;
const hostCache = new Map<string, { slug: string | null; expiresAt: number }>();

function getCachedSlug(host: string): { hit: boolean; slug: string | null } {
  const entry = hostCache.get(host);
  if (!entry) return { hit: false, slug: null };
  if (entry.expiresAt <= Date.now()) {
    hostCache.delete(host);
    return { hit: false, slug: null };
  }
  return { hit: true, slug: entry.slug };
}

function setCachedSlug(host: string, slug: string | null): void {
  if (hostCache.size >= HOST_CACHE_MAX_ENTRIES) {
    const oldestKey = hostCache.keys().next().value;
    if (oldestKey) hostCache.delete(oldestKey);
  }
  hostCache.set(host, { slug, expiresAt: Date.now() + HOST_CACHE_TTL_MS });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets, Next internals, and already-routed store paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/store/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const hostHeader = (request.headers.get('host') || '').split(':')[0].trim().toLowerCase();
  if (
    !hostHeader ||
    hostHeader === 'localhost' ||
    hostHeader === '127.0.0.1' ||
    hostHeader === 'bizx.ua' ||
    hostHeader === 'www.bizx.ua'
  ) {
    return NextResponse.next();
  }

  // 1. Subdomain routing: <slug>.bizx.ua OR <slug>.localhost
  let subSlug: string | null = null;
  if (hostHeader.endsWith('.bizx.ua')) {
    subSlug = hostHeader.slice(0, -'.bizx.ua'.length);
  } else if (hostHeader.endsWith('.localhost')) {
    subSlug = hostHeader.slice(0, -'.localhost'.length);
  }

  if (subSlug && isValidSlug(subSlug) && !RESERVED_SUBDOMAINS.has(subSlug)) {
    const url = request.nextUrl.clone();
    url.pathname = `/store/${subSlug}`;
    return NextResponse.rewrite(url);
  }

  // 2. Verified custom domain routing (e.g. shop.mycoffee.ua)
  if (!isValidCustomHostname(hostHeader)) {
    return NextResponse.next();
  }

  const cached = getCachedSlug(hostHeader);
  if (cached.hit) {
    if (cached.slug && isValidSlug(cached.slug)) {
      const url = request.nextUrl.clone();
      url.pathname = `/store/${cached.slug}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(
      `${API_BASE}/stores/resolve-host?host=${encodeURIComponent(hostHeader)}`,
      {
        signal: controller.signal,
        redirect: 'error'
      }
    );
    if (res.ok) {
      const json = (await res.json()) as {
        success?: boolean;
        data?: { slug: string } | null;
      };
      const resolvedSlug = json?.success && json.data?.slug ? json.data.slug : null;
      if (resolvedSlug && isValidSlug(resolvedSlug)) {
        setCachedSlug(hostHeader, resolvedSlug);
        const url = request.nextUrl.clone();
        url.pathname = `/store/${resolvedSlug}`;
        return NextResponse.rewrite(url);
      }
      setCachedSlug(hostHeader, null);
    }
  } catch {
    // Fallback to normal landing route if API is unreachable
  } finally {
    clearTimeout(timeout);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
