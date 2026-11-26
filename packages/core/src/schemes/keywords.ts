/** Intent detection for the opt-in Scheme Finder (hi / mr / en / kn, Devanagari, Kannada or romanised). */

const BENEFIT_WORDS = [
  // English / romanised
  'benefit', 'benefits', 'scheme', 'schemes', 'yojana', 'yojna', 'sarkari yojana', 'pension', 'insurance', 'bima', 'beema',
  'e-shram', 'eshram', 'e shram', 'labour card', 'labor card', 'welfare board', 'welfare', 'bocw', 'my benefits', 'labh',
  // Hindi / Marathi (Devanagari)
  'सरकारी योजना', 'योजना', 'योजनाएँ', 'योजनाओं', 'पेंशन', 'पेन्शन', 'बीमा', 'विमा', 'लाभ', 'योजना माहिती', 'ई-श्रम', 'ई श्रम', 'कल्याण मंडळ', 'कल्याण बोर्ड',
  // Kannada
  'ಯೋಜನೆ', 'ಯೋಜನೆಗಳು', 'ಪಿಂಚಣಿ', 'ವಿಮೆ', 'ಸೌಲಭ್ಯ', 'ಕಲ್ಯಾಣ ಮಂಡಳಿ',
];

const STOP_WORDS = ['stop', 'cancel', 'not now', 'later', 'baad mein', 'baad me', 'nantar', 'नंतर', 'बाद में', 'रुको', 'बंद', 'नको', 'ರದ್ದು', 'ನಂತರ', 'ಬೇಡ'];

const norm = (s: string) => ' ' + s.toLowerCase().normalize('NFC').replace(/[।.,!?]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';

function hasWord(text: string, words: string[]): boolean {
  const t = norm(text);
  return words.some((w) => {
    const n = w.toLowerCase();
    // latin words must match on word boundaries; Indic words may carry suffixes (योजनाओं, ಯೋಜನೆಗಳು)
    return /^[a-z\s-]+$/.test(n) ? t.includes(' ' + n + ' ') || t.includes(' ' + n + 's ') : t.includes(n);
  });
}

export const isBenefitsIntent = (text: string) => text.trim() === '/benefits' || hasWord(text, BENEFIT_WORDS);
export const isStopIntent = (text: string) => hasWord(text, STOP_WORDS);
export const isStopBenefitsReminders = (text: string) =>
  /stop\s+benefits?/i.test(text) || /(योजना|लाभ)\s*(रिमाइंडर)?\s*बंद/.test(text) || /ಯೋಜನೆ\s*ನಿಲ್ಲಿಸಿ/.test(text);

const YES = ['yes', 'haan', 'han', 'ha', 'ho', 'hoy', 'haa', 'हाँ', 'हां', 'हो', 'होय', 'ಹೌದು', 'है', 'aahe', 'आहे', 'ಇದೆ'];
const NO = ['no', 'nahi', 'nahin', 'nai', 'nako', 'nahi hai', 'नहीं', 'नही', 'नाही', 'नको', 'ಇಲ್ಲ', 'ಬೇಡ'];
const DONT_KNOW = ["don't know", 'dont know', 'pata nahi', 'maloom nahi', 'पता नहीं', 'माहीत नाही', 'माहिती नाही', 'ಗೊತ್ತಿಲ್ಲ'];

/** yes / no / unknown(don't know) / null(couldn't tell) */
export function parseYesNo(text: string): 'yes' | 'no' | 'dont_know' | null {
  if (hasWord(text, DONT_KNOW)) return 'dont_know';
  const t = norm(text);
  const no = NO.some((w) => t.includes(' ' + w.toLowerCase() + ' ') || (!/^[a-z\s']+$/.test(w) && t.includes(w)));
  const yes = YES.some((w) => t.includes(' ' + w.toLowerCase() + ' ') || (!/^[a-z\s']+$/.test(w) && t.includes(w)));
  if (no) return 'no'; // "nahi hai" contains "hai": negation wins
  if (yes) return 'yes';
  return null;
}
