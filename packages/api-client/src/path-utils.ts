/**
 * Encodes a single dynamic URL path segment and rejects path-traversal attempts
 * (., .., /, \, CR/LF, NUL) before URL construction.
 */
export function encodePathSegment(segment: string): string {
  const trimmed = String(segment ?? '').trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/\r\n\0]/.test(trimmed)) {
    throw new Error('Invalid API path segment');
  }
  return encodeURIComponent(trimmed);
}
