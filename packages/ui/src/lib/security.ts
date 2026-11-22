/**
 * Zero-dependency UI security helpers for @bizx/ui components.
 * Ensures all shared UI components sanitize URLs and validate client uploads by default.
 */

const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;

export const SAFE_RASTER_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
export const SAFE_CHAT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

const ALLOWED_CHAT_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
]);

const ALLOWED_CHAT_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
const MAX_UI_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Sanitizes URLs rendered in <a href> and <img src> inside shared UI components.
 * Strictly blocks javascript:, data:, vbscript:, file:, blob:, and protocol-relative // URLs.
 */
export function sanitizeUiUrl(
  raw: string | null | undefined,
  options: { allowRelative?: boolean } = { allowRelative: true }
): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed || CONTROL_CHAR_RE.test(trimmed)) return null;

  if (options.allowRelative !== false && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    if (trimmed.includes('..') || trimmed.includes('\\')) return null;
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function validateChatUploadFile(
  file: File,
  locale: 'uk' | 'en' = 'uk'
): { ok: true } | { ok: false; message: string } {
  if (file.size <= 0) {
    return {
      ok: false,
      message: locale === 'en' ? 'Selected file is empty' : 'Обраний файл порожній'
    };
  }
  if (file.size > MAX_UI_UPLOAD_BYTES) {
    return {
      ok: false,
      message:
        locale === 'en'
          ? 'File size exceeds the 10 MB limit'
          : 'Розмір файлу перевищує ліміт 10 МБ'
    };
  }
  const mime = (file.type || '').toLowerCase().trim();
  const name = (file.name || '').toLowerCase().trim();
  const hasAllowedExt = !name || ALLOWED_CHAT_EXTS.some((ext) => name.endsWith(ext));

  if (
    mime.includes('svg') ||
    mime.includes('html') ||
    name.endsWith('.svg') ||
    !ALLOWED_CHAT_MIMES.has(mime) ||
    !hasAllowedExt
  ) {
    return {
      ok: false,
      message:
        locale === 'en'
          ? 'Only JPG, PNG, WebP images and PDF documents are allowed'
          : 'Дозволені лише зображення JPG, PNG, WebP та PDF-документи'
    };
  }

  return { ok: true };
}
