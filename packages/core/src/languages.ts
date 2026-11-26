/**
 * Language registry. Adding a language (e.g. Tamil) = add an entry here
 * + its strings in i18n.ts. Everything else (schemas, bot menus, TTS voice
 * selection, landing showcase) is driven from this list.
 */
export const LANGUAGE_CODES = ['hi', 'mr', 'en', 'kn'] as const;
export type Language = (typeof LANGUAGE_CODES)[number];

export interface LanguageConfig {
  code: Language;
  /** English name */
  name: string;
  /** Name in its own script */
  nativeName: string;
  script: 'Deva' | 'Latn' | 'Taml' | 'Telu' | 'Knda' | 'Beng';
  /** ISO 639-3 code used by ElevenLabs Scribe language hints */
  sttCode: string;
  /** BCP-47 locale for number/date formatting */
  locale: string;
}

export const LANGUAGES: Record<Language, LanguageConfig> = {
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Deva', sttCode: 'hin', locale: 'hi-IN' },
  mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Deva', sttCode: 'mar', locale: 'mr-IN' },
  en: { code: 'en', name: 'English', nativeName: 'English', script: 'Latn', sttCode: 'eng', locale: 'en-IN' },
  kn: { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Knda', sttCode: 'kan', locale: 'kn-IN' },
};

export function isLanguage(x: unknown): x is Language {
  return typeof x === 'string' && (LANGUAGE_CODES as readonly string[]).includes(x);
}

/** Map an ISO 639-1/639-3 code (as returned by STT) to a supported language. */
export function normaliseLanguage(code: string | undefined | null, fallback: Language = 'hi'): Language {
  if (!code) return fallback;
  const c = code.toLowerCase();
  for (const l of Object.values(LANGUAGES)) {
    if (c === l.code || c === l.sttCode || c.startsWith(l.code + '-')) return l.code;
  }
  return fallback;
}
