import { useState, useEffect, useSyncExternalStore } from 'react';
import { i18n, translationStore, type SupportedLocale } from '@bizx/utils';

export type MobileLocaleMode = 'auto' | 'uk' | 'en';

function getDeviceLocale(): SupportedLocale {
  try {
    const localeStr = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    if (localeStr.startsWith('uk') || localeStr.startsWith('ua') || localeStr.startsWith('ru')) {
      return 'uk';
    }
  } catch {
    // fallback
  }
  return 'en';
}

let currentMode: MobileLocaleMode = 'auto';

export function useMobileTranslation() {
  const [mode, setModeState] = useState<MobileLocaleMode>(currentMode);

  const activeLocale = useSyncExternalStore(
    translationStore.subscribe,
    translationStore.getSnapshot,
    translationStore.getServerSnapshot
  );

  useEffect(() => {
    if (currentMode === 'auto') {
      const devLocale = getDeviceLocale();
      if (i18n.getLocale() !== devLocale) {
        i18n.setLocale(devLocale);
      }
    }
  }, []);

  const setMode = (newMode: MobileLocaleMode) => {
    currentMode = newMode;
    setModeState(newMode);
    if (newMode === 'auto') {
      const devLocale = getDeviceLocale();
      i18n.setLocale(devLocale);
    } else {
      i18n.setLocale(newMode);
    }
  };

  return {
    t: (key: string, params?: Record<string, string | number>) => i18n.t(key, params),
    locale: activeLocale,
    mode,
    setMode,
    setLocale: (next: SupportedLocale) => {
      currentMode = next;
      setModeState(next);
      i18n.setLocale(next);
    }
  };
}
