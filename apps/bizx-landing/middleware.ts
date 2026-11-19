import { NextResponse, type NextRequest } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3101';
const RESERVED_SUBDOMAINS = new Set(['www', 'admin', 'panel', 'api', 'shops']);

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

  if (subSlug && !subSlug.includes('.') && !RESERVED_SUBDOMAINS.has(subSlug)) {
    const url = request.nextUrl.clone();
    url.pathname = `/store/${subSlug}`;
    return NextResponse.rewrite(url);
  }

  // 2. Verified custom domain routing (e.g. shop.mycoffee.ua)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(
      `${API_BASE}/stores/resolve-host?host=${encodeURIComponent(hostHeader)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (res.ok) {
      const json = (await res.json()) as {
        success?: boolean;
        data?: { slug: string } | null;
      };
      if (json?.success && json.data?.slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/store/${json.data.slug}`;
        return NextResponse.rewrite(url);
      }
    }
  } catch {
    // Fallback to normal landing route if API is unreachable
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
