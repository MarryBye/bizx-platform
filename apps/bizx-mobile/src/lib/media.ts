import { mobileApi } from './api';

/**
 * Перетворює відносний шлях медіа (наприклад, /storage/file/stores/logos/...)
 * у повноцінний абсолютний URL (наприклад, http://localhost:3101/storage/file/stores/logos/...),
 * який React Native <Image /> може успішно завантажити по мережі.
 * Також відфільтровує SVG-заглушки, оскільки нативний компонент Image в React Native
 * не підтримує SVG без сторонніх бібліотек.
 */
export function resolveMobileMediaUrl(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  const trimmed = urlOrPath.trim();
  if (!trimmed) return null;

  // Якщо це вже абсолютний URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Отримуємо повний базовий URL бекенда через mobileApi
  return mobileApi.storage.resolveMediaUrl(trimmed);
}
