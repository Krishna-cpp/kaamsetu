/**
 * Scheme eligibility engine. Pure: profile in → per-scheme status + plain-language reasons + questions still to ask.
 * Wording rule: results are always "MAY be eligible"; this engine never decides eligibility for the government.
 */
import type { Language } from '../languages';
import type { IndianState } from '../localities';
import type { Skill } from '../skills';
import { CONSTRUCTION_TRADES, SCHEMES, type L, type Scheme } from './catalogue';

export type Question = 'age' | 'bank' | 'pf' | 'tax' | 'income';
export const QUESTION_ORDER: Question[] = ['age', 'bank', 'pf', 'tax', 'income'];
export type SchemeStatus = 'likely' | 'maybe' | 'not_eligible' | 'need_info';

export interface EligibilityProfile {
  age: number | null;
  ageBand: { min: number; max: number } | null;
  trades: Skill[];
  state: IndianState;
  hasBankAccount: boolean | null;
  pfDeducted: boolean | null;
  paysIncomeTax: boolean | null;
  monthlyIncomeBand: 'upto_15000' | 'above_15000' | null;
  constructionDays12m: number;
}

export interface SchemeResult {
  scheme: Scheme;
  status: SchemeStatus;
  reasons: string[];
  missingInfo: Question[];
}

type Check = { kind: 'pass' | 'fail' | 'partial'; reason: string } | { kind: 'unknown'; question: Question };

const R: Record<string, L | ((p: Record<string, string | number>) => L)> = {
  ageIn: (p) => ({
    en: `You are ${p.age}, within ${p.min}-${p.max}`,
    hi: `आपकी उम्र ${p.age} है, ${p.min}-${p.max} के बीच`,
    mr: `तुमचं वय ${p.age}, ${p.min}-${p.max} मध्ये`,
    kn: `ನಿಮ್ಮ ವಯಸ್ಸು ${p.age}, ${p.min}-${p.max} ರ ಒಳಗೆ`,
  }),
  ageOut: (p) => ({
    en: `You are ${p.age}; this scheme is for ages ${p.min}-${p.max}`,
    hi: `आपकी उम्र ${p.age} है; यह योजना ${p.min}-${p.max} साल के लिए है`,
    mr: `तुमचं वय ${p.age}; ही योजना ${p.min}-${p.max} वयासाठी आहे`,
    kn: `ನಿಮ್ಮ ವಯಸ್ಸು ${p.age}; ಈ ಯೋಜನೆ ${p.min}-${p.max} ವಯಸ್ಸಿನವರಿಗೆ`,
  }),
  agePartial: (p) => ({
    en: `Your age group (${p.age}) is partly inside ${p.min}-${p.max}`,
    hi: `आपका आयु वर्ग (${p.age}) ${p.min}-${p.max} में आंशिक रूप से आता है`,
    mr: `तुमचा वयोगट (${p.age}) ${p.min}-${p.max} मध्ये अंशतः येतो`,
    kn: `ನಿಮ್ಮ ವಯೋಮಾನ (${p.age}) ${p.min}-${p.max} ರಲ್ಲಿ ಭಾಗಶಃ ಬರುತ್ತದೆ`,
  }),
  bankYes: { en: 'You have a bank account', hi: 'आपका बैंक खाता है', mr: 'तुमचं बँक खाते आहे', kn: 'ನಿಮಗೆ ಬ್ಯಾಂಕ್ ಖಾತೆ ಇದೆ' },
  bankNo: { en: 'Needs a bank account (a free Jan Dhan account works)', hi: 'बैंक खाता चाहिए (मुफ़्त जन धन खाता चलेगा)', mr: 'बँक खाते हवे (मोफत जन धन खाते चालेल)', kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆ ಬೇಕು (ಉಚಿತ ಜನ್ ಧನ್ ಖಾತೆ ಸಾಕು)' },
  pfNo: { en: 'No PF/ESI is cut from your pay', hi: 'आपकी तनख़्वाह से PF/ESI नहीं कटता', mr: 'तुमच्या पगारातून PF/ESI कापले जात नाही', kn: 'ನಿಮ್ಮ ಸಂಬಳದಿಂದ PF/ESI ಕಡಿತವಾಗುವುದಿಲ್ಲ' },
  pfYes: { en: 'Not for workers who already have PF/ESI', hi: 'जिनका PF/ESI कटता है उनके लिए नहीं', mr: 'ज्यांचे PF/ESI कापले जाते त्यांच्यासाठी नाही', kn: 'PF/ESI ಇರುವವರಿಗೆ ಅಲ್ಲ' },
  taxNo: { en: 'You do not pay income tax', hi: 'आप इनकम टैक्स नहीं भरते', mr: 'तुम्ही आयकर भरत नाही', kn: 'ನೀವು ಆದಾಯ ತೆರಿಗೆ ಕಟ್ಟುವುದಿಲ್ಲ' },
  taxYes: { en: 'Not for income-tax payers', hi: 'इनकम टैक्स भरने वालों के लिए नहीं', mr: 'आयकर भरणाऱ्यांसाठी नाही', kn: 'ಆದಾಯ ತೆರಿಗೆ ಕಟ್ಟುವವರಿಗೆ ಅಲ್ಲ' },
  incomeOk: { en: 'Income up to ₹15,000 a month', hi: 'महीने की कमाई ₹15,000 तक', mr: 'मासिक उत्पन्न ₹15,000 पर्यंत', kn: 'ತಿಂಗಳ ಆದಾಯ ₹15,000 ವರೆಗೆ' },
  incomeHigh: { en: 'For monthly income up to ₹15,000 only', hi: 'सिर्फ़ ₹15,000 महीने तक की कमाई वालों के लिए', mr: 'फक्त ₹15,000 पर्यंत मासिक उत्पन्नासाठी', kn: 'ತಿಂಗಳಿಗೆ ₹15,000 ವರೆಗೆ ಆದಾಯ ಇರುವವರಿಗೆ ಮಾತ್ರ' },
  tradeOk: (p) => ({ en: `Your trade (${p.trade}) is one of its 18 trades`, hi: `आपका काम (${p.trade}) इसके 18 कामों में है`, mr: `तुमचे काम (${p.trade}) याच्या 18 व्यवसायांपैकी आहे`, kn: `ನಿಮ್ಮ ಕೆಲಸ (${p.trade}) ಇದರ 18 ವೃತ್ತಿಗಳಲ್ಲಿ ಒಂದು` }),
  tradeNo: { en: 'Only for its 18 traditional trades (e.g. carpenter, mason, tailor)', hi: 'सिर्फ़ इसके 18 पारंपरिक कामों के लिए (जैसे बढ़ई, राजमिस्त्री, दर्ज़ी)', mr: 'फक्त याच्या 18 पारंपरिक व्यवसायांसाठी (उदा. सुतार, गवंडी, शिंपी)', kn: 'ಇದರ 18 ಸಾಂಪ್ರದಾಯಿಕ ವೃತ್ತಿಗಳಿಗೆ ಮಾತ್ರ (ಉದಾ. ಬಡಗಿ, ಗಾರೆ, ದರ್ಜಿ)' },
  daysOk: (p) => ({ en: `${p.days} construction days in the last 12 months (90 needed)`, hi: `पिछले 12 महीनों में ${p.days} दिन निर्माण काम (90 चाहिए)`, mr: `मागील 12 महिन्यांत ${p.days} दिवस बांधकाम काम (90 हवेत)`, kn: `ಕಳೆದ 12 ತಿಂಗಳಲ್ಲಿ ${p.days} ದಿನ ಕಟ್ಟಡ ಕೆಲಸ (90 ಬೇಕು)` }),
  daysShort: (p) => ({ en: `${p.days} of 90 construction days so far in the last 12 months`, hi: `पिछले 12 महीनों में अब तक 90 में से ${p.days} दिन`, mr: `मागील 12 महिन्यांत आतापर्यंत 90 पैकी ${p.days} दिवस`, kn: `ಕಳೆದ 12 ತಿಂಗಳಲ್ಲಿ ಇಲ್ಲಿಯವರೆಗೆ 90 ರಲ್ಲಿ ${p.days} ದಿನ` }),
  notConstruction: { en: 'For construction workers only', hi: 'सिर्फ़ निर्माण मज़दूरों के लिए', mr: 'फक्त बांधकाम कामगारांसाठी', kn: 'ಕಟ್ಟಡ ಕಾರ್ಮಿಕರಿಗೆ ಮಾತ್ರ' },
  stateOk: (p) => ({ en: `You work in ${p.state}`, hi: `आप ${p.state} में काम करते हैं`, mr: `तुम्ही ${p.state} मध्ये काम करता`, kn: `ನೀವು ${p.state} ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ` }),
  stateOther: (p) => ({ en: `For workers in ${p.state}`, hi: `${p.state} के मज़दूरों के लिए`, mr: `${p.state} मधील कामगारांसाठी`, kn: `${p.state} ಕಾರ್ಮಿಕರಿಗೆ` }),
  pmjay: { en: 'Depends on whether your family is listed: check with the official tool', hi: 'यह इस पर निर्भर है कि आपका परिवार सूची में है या नहीं: आधिकारिक साइट पर देखें', mr: 'तुमचे कुटुंब यादीत आहे का यावर अवलंबून: अधिकृत साइटवर पाहा', kn: 'ನಿಮ್ಮ ಕುಟುಂಬ ಪಟ್ಟಿಯಲ್ಲಿದೆಯೇ ಎಂಬುದರ ಮೇಲೆ ಅವಲಂಬಿತ: ಅಧಿಕೃತ ತಾಣದಲ್ಲಿ ನೋಡಿ' },
};

const STATE_NAME: Record<IndianState, L> = {
  MH: { en: 'Maharashtra', hi: 'महाराष्ट्र', mr: 'महाराष्ट्र', kn: 'ಮಹಾರಾಷ್ಟ್ರ' },
  KA: { en: 'Karnataka', hi: 'कर्नाटक', mr: 'कर्नाटक', kn: 'ಕರ್ನಾಟಕ' },
};

function say(key: keyof typeof R, lang: Language, p: Record<string, string | number> = {}): string {
  const e = R[key]!;
  return (typeof e === 'function' ? e(p) : e)[lang];
}

/** Person's age as an inclusive range (exact age → [a, a]). */
function ageRange(p: EligibilityProfile): [number, number] | null {
  if (p.age !== null) return [p.age, p.age];
  if (p.ageBand) return [p.ageBand.min, p.ageBand.max];
  return null;
}

function checkAge(p: EligibilityProfile, min: number, max: number, lang: Language): Check {
  const r = ageRange(p);
  if (!r) return { kind: 'unknown', question: 'age' };
  const [lo, hi] = r;
  const label = lo === hi ? String(lo) : `${lo}-${hi}`;
  if (lo >= min && hi <= max) return { kind: 'pass', reason: say('ageIn', lang, { age: label, min, max }) };
  if (hi < min || lo > max) return { kind: 'fail', reason: say('ageOut', lang, { age: label, min, max }) };
  return { kind: 'partial', reason: say('agePartial', lang, { age: label, min, max }) };
}

function checksFor(s: Scheme, p: EligibilityProfile, lang: Language): Check[] {
  const r = s.rules;
  const out: Check[] = [];
  if (r.state) {
    // state is known from the profile's locality; other-state boards are simply not for this worker
    out.push(
      r.state === p.state
        ? { kind: 'pass', reason: say('stateOk', lang, { state: STATE_NAME[p.state][lang] }) }
        : { kind: 'fail', reason: say('stateOther', lang, { state: STATE_NAME[r.state][lang] }) },
    );
  }
  if (r.minConstructionDays !== undefined) {
    const construction = p.trades.some((t) => CONSTRUCTION_TRADES.includes(t));
    if (!construction) out.push({ kind: 'fail', reason: say('notConstruction', lang) });
    else if (p.constructionDays12m >= r.minConstructionDays) out.push({ kind: 'pass', reason: say('daysOk', lang, { days: p.constructionDays12m }) });
    else out.push({ kind: 'fail', reason: say('daysShort', lang, { days: p.constructionDays12m }) });
  }
  if (r.trades) {
    const hit = p.trades.find((t) => r.trades!.includes(t));
    out.push(hit ? { kind: 'pass', reason: say('tradeOk', lang, { trade: hit }) } : { kind: 'fail', reason: say('tradeNo', lang) });
  }
  if (r.minAge !== undefined || r.maxAge !== undefined) out.push(checkAge(p, r.minAge ?? 0, r.maxAge ?? 200, lang));
  if (r.requiresBank) {
    out.push(
      p.hasBankAccount === null
        ? { kind: 'unknown', question: 'bank' }
        : p.hasBankAccount
          ? { kind: 'pass', reason: say('bankYes', lang) }
          : { kind: 'fail', reason: say('bankNo', lang) },
    );
  }
  if (r.excludePf) {
    out.push(
      p.pfDeducted === null ? { kind: 'unknown', question: 'pf' } : p.pfDeducted ? { kind: 'fail', reason: say('pfYes', lang) } : { kind: 'pass', reason: say('pfNo', lang) },
    );
  }
  if (r.excludeTaxpayer) {
    out.push(
      p.paysIncomeTax === null
        ? { kind: 'unknown', question: 'tax' }
        : p.paysIncomeTax
          ? { kind: 'fail', reason: say('taxYes', lang) }
          : { kind: 'pass', reason: say('taxNo', lang) },
    );
  }
  if (r.incomeUpto15000) {
    out.push(
      p.monthlyIncomeBand === null
        ? { kind: 'unknown', question: 'income' }
        : p.monthlyIncomeBand === 'upto_15000'
          ? { kind: 'pass', reason: say('incomeOk', lang) }
          : { kind: 'fail', reason: say('incomeHigh', lang) },
    );
  }
  return out;
}

export function evaluateScheme(s: Scheme, p: EligibilityProfile, lang: Language = 'en'): SchemeResult {
  if (s.rules.noRuleCheck) return { scheme: s, status: 'maybe', reasons: [say('pmjay', lang)], missingInfo: [] };
  const checks = checksFor(s, p, lang);
  const reasons = checks.flatMap((c) => (c.kind === 'unknown' ? [] : [c.reason]));
  const missingInfo = checks.flatMap((c) => (c.kind === 'unknown' ? [c.question] : []));
  const status: SchemeStatus = checks.some((c) => c.kind === 'fail')
    ? 'not_eligible'
    : missingInfo.length
      ? 'need_info'
      : checks.some((c) => c.kind === 'partial')
        ? 'maybe'
        : 'likely';
  // for a not-eligible scheme, lead with the reason that rules it out
  if (status === 'not_eligible') {
    const fails = checks.flatMap((c) => (c.kind === 'fail' ? [c.reason] : []));
    return { scheme: s, status, reasons: [...fails, ...reasons.filter((r) => !fails.includes(r))], missingInfo: [] };
  }
  return { scheme: s, status, reasons, missingInfo };
}

/** Evaluate every scheme that applies to the worker's state (other-state boards are dropped, not listed as "not eligible"). */
export function evaluateAll(p: EligibilityProfile, lang: Language = 'en'): SchemeResult[] {
  return SCHEMES.filter((s) => !s.rules.state || s.rules.state === p.state).map((s) => evaluateScheme(s, p, lang));
}

/**
 * The questions still worth asking, in order. A question is only asked if some scheme that is not already
 * ruled out depends on it (so income is asked only when PM-SYM is still possible).
 */
export function questionsToAsk(p: EligibilityProfile, skipped: Question[] = []): Question[] {
  const needed = new Set<Question>();
  for (const r of evaluateAll(p)) {
    if (r.status === 'need_info') r.missingInfo.forEach((q) => needed.add(q));
  }
  return QUESTION_ORDER.filter((q) => needed.has(q) && !skipped.includes(q));
}

const RANK: Record<SchemeStatus, number> = { likely: 0, maybe: 1, need_info: 2, not_eligible: 3 };
export function sortResults(rs: SchemeResult[]): SchemeResult[] {
  return [...rs].sort((a, b) => RANK[a.status] - RANK[b.status]);
}
