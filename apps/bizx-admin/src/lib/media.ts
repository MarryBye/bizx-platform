import { api } from './api';

/**
 * Перетворює відносний шлях медіафайлу (наприклад, /storage/file/...)
 * у повноцінний абсолютний URL із доменом бекенда, або повертає blob/http URL без змін.
 */
export function resolveMediaUrl(urlOrPath: string | null | undefined): string | null {
  return api.storage.resolveMediaUrl(urlOrPath);
}
