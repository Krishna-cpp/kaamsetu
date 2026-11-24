/**
 * Rule-based extractor for Hindi / Marathi / English (Devanagari or romanised).
 * Used when LLM_PROVIDER=mock and as a safety net if Bedrock fails.
 */
import type { Language } from './languages';
import { findLocalityInText } from './localities';
import type { ExtractedJob, ExtractedProfile } from './schemas';
import { SKILLS, SKILL_CODES, type Skill } from './skills';

const DEVA_DIGITS = '०१२३४५६७८९';

export function normaliseDigits(s: string): string {
  return s.replace(/[०-९]/g, (d) => String(DEVA_DIGITS.indexOf(d)));
}

const hasDeva = (s: string) => /[ऀ-ॿ]/.test(s);

const MR_MARKERS = ['आहे', 'माझं', 'माझे', 'माझा', 'मी ', 'नाव', 'पाहिजे', 'हवेत', 'हवे', 'दिवस', 'उद्या', 'रोज', 'करतो', 'राहतो', 'aahe', 'ahe', 'maza', 'majha', 'mi ', 'pahije', 'udya', 'rahto'];
const HI_MARKERS = ['है', 'हूँ', 'हूं', 'मेरा', 'मैं', 'चाहिए', 'रहता', 'दिन', 'कल', 'रुपये', 'रुपए', 'hai', 'hoon', 'hun', 'mera', 'main ', 'chahiye', 'rehta', 'rahta', 'din', 'kal', 'rupaye', 'rupees', 'roz'];

export function detectLanguage(text: string, hint?: Language | null): Language {
  const t = ' ' + text.toLowerCase() + ' ';
  const mr = MR_MARKERS.filter((m) => t.includes(m)).length;
  const hi = HI_MARKERS.filter((m) => t.includes(m)).length;
  if (hasDeva(text)) return mr > hi ? 'mr' : hint === 'mr' && mr === hi ? 'mr' : 'hi';
  if (mr >= 2 && mr > hi) return 'mr';
  if (hi >= 2) return 'hi';
  return hint ?? 'en';
}

/* ---------------------------- numbers ---------------------------- */

const UNITS: Record<string, number> = {
  // hindi (deva + roman)
  एक: 1, दो: 2, तीन: 3, चार: 4, पांच: 5, पाँच: 5, छह: 6, छः: 6, सात: 7, आठ: 8, नौ: 9, दस: 10, बारह: 12, पंद्रह: 15, बीस: 20,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10, barah: 12, pandrah: 15, bees: 20,
  // marathi
  दोन: 2, पाच: 5, सहा: 6, नऊ: 9, दहा: 10, बारा: 12, पंधरा: 15, वीस: 20,
  don: 2, paach: 5, saha: 6, daha: 10,
  // english
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20,
};
const HUNDRED = ['सौ', 'sau', 'hundred', 'शंभर', 'shambhar'];
const THOUSAND = ['हज़ार', 'हजार', 'hazaar', 'hazar', 'thousand'];

/** Converts number words to digits: "aath sau" → "800", "पाचशे" → "500", "डेढ़ हजार" → "1500". */
export function wordsToNumbers(text: string): string {
  let s = normaliseDigits(text);
  s = s.replace(/डेढ़\s*(हज़ार|हजार)|dedh\s*(hazaar|hazar)/gi, '1500');
  s = s.replace(/दीड\s*हजार/g, '1500');
  // Marathi compounds: पाचशे, आठशे, नऊशे
  s = s.replace(/([ऀ-ॿ]+?)शे(?=\s|$|[,.।])/g, (m, w: string) => (UNITS[w] ? String(UNITS[w] * 100) : m));
  s = s.replace(/(\d+)\s*शे(?=\s|$|[,.।])/g, (_m, d: string) => String(Number(d) * 100));
  const tokens = s.split(/(\s+|[,.!?।])/);
  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i] ?? '';
    const lower = tok.toLowerCase();
    const unit = UNITS[lower] ?? (/^\d+$/.test(tok) ? Number(tok) : undefined);
    if (unit !== undefined) {
      // look ahead (skipping whitespace) for a multiplier
      let j = i + 1;
      while (j < tokens.length && /^\s*$/.test(tokens[j] ?? '')) j++;
      const next = (tokens[j] ?? '').toLowerCase();
      if (HUNDRED.includes(next)) {
        out.push(String(unit * 100));
        i = j;
        continue;
      }
      if (THOUSAND.includes(next)) {
        out.push(String(unit * 1000));
        i = j;
        continue;
      }
      out.push(/^\d+$/.test(tok) ? tok : String(unit));
      continue;
    }
    out.push(tok);
  }
  return out.join('').replace(/(\d),(\d{3})/g, '$1$2');
}

const MONEY_HINT = /(₹|rs\.?|rupay|rupee|rupaye|rupiya|रुपय|रुपए|रुपये|रुपया|रु\.?|per day|a day|\/day|roz|रोज़|रोज|daily|दिन के|प्रति दिन|दिवसाला|मजुरी|मज़दूरी|majduri|wage)/i;

function extractWage(text: string): number | null {
  const s = wordsToNumbers(text);
  const nums = [...s.matchAll(/(₹\s*)?(\d{3,5})(\s*(\/-|rs|₹|rupay\w*|rupee\w*|रुपय\w*|रुपए|रुपये|रु))?/gi)];
  let best: number | null = null;
  for (const m of nums) {
    const n = Number(m[2]);
    if (n < 100 || n > 20000) continue;
    const ctx = s.slice(Math.max(0, (m.index ?? 0) - 25), (m.index ?? 0) + m[0].length + 25);
    if (m[1] || m[4] || MONEY_HINT.test(ctx)) return n;
    best ??= n;
  }
  return best;
}

function extractSkills(text: string): Skill[] {
  const t = text.toLowerCase();
  const found: { skill: Skill; pos: number }[] = [];
  for (const code of SKILL_CODES) {
    let pos = -1;
    for (const k of SKILLS[code].keywords) {
      const re = new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      const m = hasDeva(k) ? t.indexOf(k) : (t.match(re)?.index ?? -1);
      if (m >= 0 && (pos < 0 || m < pos)) pos = m;
    }
    if (pos >= 0) found.push({ skill: code, pos });
  }
  return found.sort((a, b) => a.pos - b.pos).map((f) => f.skill).slice(0, 3);
}

const NAME_PATTERNS: RegExp[] = [
  /(?:mera|meraa)\s+naam\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:hai|he)/i,
  /मेरा\s+नाम\s+([ऀ-ॿ]+(?:\s+[ऀ-ॿ]+)?)\s+है/,
  /(?:maza|majha|maaza|maajha|maz|majh)\w*\s+(?:nav|naav|naw)\s+([a-z]+(?:\s+[a-z]+)?)\s+(?:aahe|ahe|aah)/i,
  /(?:माझं|माझे|माझा)\s+नाव\s+([ऀ-ॿ]+(?:\s+[ऀ-ॿ]+)?)\s+आहे/,
  /(?:my name is|i am|i'm|this is)\s+([a-z]+(?:\s+[a-z]+)?)(?=[\s,.]|$)/i,
  /(?:main|mai|मैं|मी)\s+([A-Zऀ-ॿ][a-zऀ-ॿ]+)\s+(?:hoon|hun|हूँ|हूं|आहे)/,
];
const NOT_NAMES = new Set(['a', 'plumber', 'painter', 'mason', 'electrician', 'driver', 'cook', 'helper', 'here', 'from', 'looking', 'available']);

function titleCase(s: string): string {
  return hasDeva(s) ? s : s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractName(text: string): string | null {
  for (const re of NAME_PATTERNS) {
    const m = text.match(re);
    const raw = m?.[1]?.trim();
    if (raw) {
      // stop at words that start the next clause
      const first = raw.split(/\s+/).filter((w) => !NOT_NAMES.has(w.toLowerCase()) && !/^(aur|and|और|आणि|ani)$/i.test(w));
      if (first.length) return titleCase(first.join(' '));
    }
  }
  return null;
}

function extractExperience(text: string): number | null {
  const s = wordsToNumbers(text);
  const m = s.match(/(\d{1,2})\s*(saal|sal|years?|yrs?|साल|वर्ष|वर्षे|varsh)/i);
  return m ? Number(m[1]) : null;
}

/** Today in IST as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}
const addDays = (iso: string, n: number) => new Date(Date.parse(iso) + n * 86_400_000).toISOString().slice(0, 10);

function extractStartDate(text: string, today: string): string | null {
  const t = text.toLowerCase();
  if (/(day after tomorrow|parso|परसों|परवा)/.test(t)) return addDays(today, 2);
  if (/(tomorrow|kal se|kal\b|कल|उद्या|udya|udyapasun)/.test(t)) return addDays(today, 1);
  if (/(today|aaj|आज|right now|abhi|अभी|immediately|urgent)/.test(t)) return today;
  return null;
}

function extractDays(text: string): number | null {
  const s = wordsToNumbers(text);
  const m = s.match(/(\d{1,3})\s*(days?|din|दिन|दिवस|divas)/i);
  if (m) return Number(m[1]);
  if (/(a week|ek hafte|एक हफ्ते|हफ्ता|आठवडा)/i.test(s)) return 7;
  if (/(one day|ek din|एक दिन|एक दिवस)/i.test(s)) return 1;
  return null;
}

function extractCount(text: string, skill: Skill | null): number | null {
  const s = wordsToNumbers(text);
  // "2 painters", "need 3 masons", "do painter chahiye", "३ गवंडी"
  if (skill) {
    for (const k of SKILLS[skill].keywords) {
      const re = new RegExp(`(\\d{1,2})\\s+${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      const m = s.match(re);
      if (m) return Number(m[1]);
    }
  }
  const m = s.match(/(\d{1,2})\s*(people|workers|log|लोग|लोक|जण|jan|aadmi|आदमी|majdoor|मजदूर)/i);
  return m ? Number(m[1]) : null;
}

export function ruleExtractProfile(text: string, hint?: Language | null): ExtractedProfile {
  const skills = extractSkills(text);
  const loc = findLocalityInText(text);
  const busy = /(busy|not available|abhi kaam pe|व्यस्त)/i.test(text);
  return {
    name: extractName(text),
    skills,
    experienceYears: extractExperience(text),
    locality: loc?.name ?? null,
    expectedWage: extractWage(text),
    availability: busy ? 'busy' : 'available',
    availableFrom: null,
    language: detectLanguage(text, hint),
  };
}

export function ruleExtractJob(text: string, hint?: Language | null, today = todayIST()): ExtractedJob {
  const skill = extractSkills(text)[0] ?? null;
  const loc = findLocalityInText(text);
  return {
    skill,
    workersNeeded: extractCount(text, skill),
    durationDays: extractDays(text),
    wagePerDay: extractWage(text),
    locality: loc?.name ?? null,
    startDate: extractStartDate(text, today),
    description: text.trim().slice(0, 400) || null,
    language: detectLanguage(text, hint),
  };
}
