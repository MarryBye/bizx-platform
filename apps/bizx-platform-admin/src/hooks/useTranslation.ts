import { useSyncExternalStore, useEffect } from 'react';
import { i18n, translationStore, I18n, type SupportedLocale, type InterpolationParams } from '@bizx/utils';

const STORAGE_KEY = 'bizx_locale';
let isInitialized = false;

export function initPlatformLocale(userPreferred?: string | null) {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(STORAGE_KEY);
  const nav = navigator.language;
  const detected = I18n.detectLocale(userPreferred || stored, nav, 'uk');
  i18n.setLocale(detected);
  localStorage.setItem(STORAGE_KEY, detected);
  isInitialized = true;
}

export function useTranslation() {
  const locale = useSyncExternalStore(
    translationStore.subscribe,
    translationStore.getSnapshot,
    translationStore.getServerSnapshot
  );

  useEffect(() => {
    if (!isInitialized && typeof window !== 'undefined') {
      initPlatformLocale();
    }
  }, []);

  const setLocale = (nextLocale: SupportedLocale) => {
    i18n.setLocale(nextLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, nextLocale);
    }
  };

  const t = (key: string, params?: InterpolationParams): string => {
    return i18n.t(key, params);
  };

  return {
    t,
    locale,
    setLocale
  };
}
