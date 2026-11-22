import { BadRequestException } from '@nestjs/common';

export const ALLOWED_PUBLIC_STORAGE_PREFIXES = [
  'avatars/',
  'stores/logos/',
  'stores/banners/',
  'products/',
  'broadcasts/'
] as const;

export const PRIVATE_STORAGE_PREFIXES = ['order-chat/', 'inbox/'] as const;

export const ALL_ALLOWED_STORAGE_PREFIXES = [
  ...ALLOWED_PUBLIC_STORAGE_PREFIXES,
  ...PRIVATE_STORAGE_PREFIXES
] as const;

export const MIME_TO_SAFE_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf'
};

export const SAFE_INLINE_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const SAFE_SEGMENT_RE = /^[a-zA-Z0-9._-]+$/;

/**
 * Canonicalizes and strictly validates an R2 object key against an explicit folder allowlist.
 * Defeats path traversal (.., ., \, %2e, %2f, %5c, //, NUL bytes) and unknown bucket prefixes.
 */
export function canonicalizeStorageKey(rawParam: string | string[]): string {
  const joined = Array.isArray(rawParam) ? rawParam.join('/') : String(rawParam ?? '');
  if (!joined || joined.length > 512) {
    throw new BadRequestException('Некоректний шлях до файлу');
  }

  // Reject raw backslashes, control chars, null bytes, or encoded traversal markers
  if (
    /[\u0000-\u001F\u007F\\]/.test(joined) ||
    /%2e|%2f|%5c|%00/i.test(joined)
  ) {
    throw new BadRequestException('Недопустимі символи у шляху до файлу');
  }

  let normalized = joined.replace(/^\/+/, '');
  if (normalized.startsWith('file/')) {
    normalized = normalized.slice('file/'.length);
  }
  normalized = normalized.replace(/^\/+/, '');

  if (!normalized || normalized.includes('//')) {
    throw new BadRequestException('Некоректний шлях до файлу');
  }

  const segments = normalized.split('/');
  if (segments.length < 2 || segments.length > 5) {
    throw new BadRequestException('Некоректна структура шляху до файлу');
  }

  for (const seg of segments) {
    if (!seg || seg === '.' || seg === '..' || !SAFE_SEGMENT_RE.test(seg)) {
      throw new BadRequestException('Недопустимий сегмент шляху до файлу');
    }
  }

  const lower = normalized.toLowerCase();
  const matchesAllowedPrefix = ALL_ALLOWED_STORAGE_PREFIXES.some((prefix) =>
    lower.startsWith(prefix)
  );
  if (!matchesAllowedPrefix) {
    throw new BadRequestException('Доступ до цієї категорії файлів заборонено');
  }

  return normalized;
}

export function isPrivateStorageKey(canonicalKey: string): boolean {
  const lower = canonicalKey.replace(/^\/+/, '').toLowerCase();
  return PRIVATE_STORAGE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function getSafeExtensionForMime(mimeType: string): string {
  const ext = MIME_TO_SAFE_EXT[(mimeType || '').toLowerCase().trim()];
  if (!ext) {
    throw new BadRequestException('Непідтримуваний тип файлу');
  }
  return ext;
}

export function sanitizeAttachmentFileName(rawName: string): string {
  const base = String(rawName || 'attachment')
    .replace(/^.*[\\/]/, '')
    .replace(/[\u0000-\u001F\u007F<>:"/\\|?*]+/g, '_')
    .trim();
  return (base || 'attachment').slice(0, 120);
}
