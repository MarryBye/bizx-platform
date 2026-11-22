import { sanitizeMediaUrl } from '@bizx/utils';
import { mobileApi } from './api';

/**
 * Перетворює та валідує URL медіафайлу для React Native <Image /> і вкладень.
 * Блокує небезпечні схеми (javascript:, data:, vbscript:) та SVG-файли.
 */
export function resolveMobileMediaUrl(urlOrPath: string | null | undefined): string | null {
  return sanitizeMediaUrl(urlOrPath, mobileApi.client.getBaseUrl(), [], {
    allowLocalBlobPreview: false,
    blockSvg: true
  });
}
