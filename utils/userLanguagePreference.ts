import AsyncStorage from '@react-native-async-storage/async-storage';

import { setLocale } from '@/i18n';

const LANGUAGE_STORAGE_KEY = '@mordobo_user_language';

export type AppLanguage = 'en' | 'es';

export function normalizeAppLanguage(raw: unknown): AppLanguage | null {
  if (raw === 'en' || raw === 'es') return raw;
  if (typeof raw === 'string') {
    const l = raw.trim().toLowerCase();
    if (l === 'en' || l.startsWith('en-')) return 'en';
    if (l === 'es' || l.startsWith('es-')) return 'es';
  }
  return null;
}

export async function persistUserLanguage(lang: AppLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

/** Applies last known account language so UI matches server preference before settings fetch completes. */
export async function applyCachedUserLanguage(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const lang = normalizeAppLanguage(raw);
    if (lang) setLocale(lang);
  } catch {
    /* ignore */
  }
}
