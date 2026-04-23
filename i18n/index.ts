import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './locales/en';
import es from './locales/es';

const i18n = new I18n({ en, es });

/** Subscribers notified when `setLocale` runs so React can re-render translated UI. */
const localeListeners = new Set<() => void>();

function notifyLocaleListeners() {
  localeListeners.forEach((listener) => listener());
}

/**
 * Subscribe to app locale changes (for `useSyncExternalStore` in root layout).
 */
export function subscribeLocale(listener: () => void) {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

export function getLocaleSnapshot(): string {
  return i18n.locale;
}

// Determine best language from device settings (overridden when session restores saved preference)
const locales = Localization.getLocales();
const primary = locales && locales.length > 0 ? locales[0] : undefined;
const languageCode = primary?.languageCode?.toLowerCase() ?? 'en';

// Configure i18n
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.locale = languageCode.startsWith('es') ? 'es' : 'en';

export function t(key: string, options?: Record<string, any>) {
  return i18n.t(key, options);
}

export function setLocale(locale: 'en' | 'es') {
  if (i18n.locale === locale) return;
  i18n.locale = locale;
  notifyLocaleListeners();
}

export function getLocale() {
  return i18n.locale as 'en' | 'es';
}
