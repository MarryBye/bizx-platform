import { useSyncExternalStore, useEffect } from 'react';
import { i18n, translationStore, type SupportedLocale } from '@bizx/utils';

export function useTranslation() {
  const locale = useSyncExternalStore(
    translationStore.subscribe,
    translationStore.getSnapshot,
    translationStore.getServerSnapshot
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bizx_locale');
      if ((saved === 'uk' || saved === 'en') && saved !== i18n.getLocale()) {
        i18n.setLocale(saved);
      }
    }
  }, []);

  const changeLocale = (newLocale: SupportedLocale) => {
    i18n.setLocale(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bizx_locale', newLocale);
    }
  };

  return {
    t: (key: string, params?: Record<string, string | number>) => i18n.t(key, params),
    locale,
    setLocale: changeLocale,
    locales: ['uk', 'en'] as const
  };
}
