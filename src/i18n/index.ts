import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';

import { it } from './it';

/**
 * Scaffold i18n. In Fase 1 l'app è solo in italiano: i testi sono per lo più
 * letterali nei componenti; questo modulo tiene pronte le stringhe condivise,
 * il rilevamento locale e la formattazione.
 */
export const i18n = new I18n({ it });

i18n.defaultLocale = 'it';
i18n.enableFallback = true;
i18n.locale = getLocales()[0]?.languageCode ?? 'it';

export function t(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options);
}

export const SUPPORTED_LOCALES = ['it'] as const;
