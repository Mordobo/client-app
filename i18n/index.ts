import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import en from './locales/en';
import es from './locales/es';
import { useEffect } from 'react';

/**
 * Set the locale to the default locale
 */
/*
useEffect(() => {
    setLocale('en'); // o 'es'
  }, []);
*/
const i18n = new I18n({ en, es });

// Determine best language from device settings
const locales = Localization.getLocales();
console.log('locales', locales);
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
  i18n.locale = locale;
}

export function getLocale() {
  return i18n.locale as 'en' | 'es';
}
