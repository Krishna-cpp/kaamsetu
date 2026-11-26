/**
 * Government scheme catalogue for the Scheme Finder ("My Benefits").
 *
 * Verification (2026-11-26, official pages fetched):
 *  - VERIFIED: PM-SYM (maandhan.in, eshram.gov.in/Schemes), PMJJBY + PMSBY (eshram.gov.in/Schemes),
 *    PM Vishwakarma (pmvishwakarma.gov.in), MahaBOCW (mahabocw.in welfare-schemes page; fee free since 13-08-2025).
 *  - UNVERIFIED (official pages did not load): e-Shram eligibility, Atal Pension Yojana, PMJJBY cover dates,
 *    Karnataka BOCW benefits. Values below are the documented starting values; `verification` says which is which.
 * Always present results as "you MAY be eligible" and link the official page.
 */
import type { Language } from '../languages';
import type { IndianState } from '../localities';
import type { Skill } from '../skills';

export type L = Record<Language, string>;
export type SchemeId = 'eshram' | 'pmsym' | 'pmjjby' | 'pmsby' | 'apy' | 'pmvishwakarma' | 'bocw_mh' | 'bocw_ka' | 'pmjay';
export type HelpCentreType = 'csc' | 'bank' | 'labour_office';
export type DocId = 'aadhaar_mobile' | 'aadhaar' | 'bank_account' | 'age_proof' | 'work_90' | 'residence' | 'photos' | 'ration_card';

export interface SchemeRules {
  minAge?: number;
  maxAge?: number;
  requiresBank?: boolean;
  /** excluded if EPFO/ESIC is deducted from pay */
  excludePf?: boolean;
  excludeTaxpayer?: boolean;
  /** PM-SYM: monthly income must be up to ₹15,000 */
  incomeUpto15000?: boolean;
  /** PM Vishwakarma: our trades that map onto its 18 trades */
  trades?: Skill[];
  /** BOCW: construction trade + min days in last 12 months */
  minConstructionDays?: number;
  state?: IndianState;
  /** PM-JAY: no rule check, just point to the official checker */
  noRuleCheck?: boolean;
}

export interface Scheme {
  id: SchemeId;
  name: L;
  oneLineBenefit: L;
  /** very short phrase for the spoken summary */
  spoken: L;
  rules: SchemeRules;
  documents: DocId[];
  officialUrl: string;
  helpCentreType: HelpCentreType;
  renewal: L | null;
  /** used by the reminder job */
  renewalKind: 'yearly_june' | 'yearly_from_registration' | 'none';
  verification: 'verified' | 'unverified';
  /** ISO date the official page was last checked successfully (null if it could not be loaded) */
  lastVerified: string | null;
  sourceNote: string;
}

/** Trades that count as construction work for BOCW (job skill, not worker skill). */
export const CONSTRUCTION_TRADES: readonly Skill[] = ['mason', 'painter', 'plumber', 'electrician', 'carpenter', 'tile_fitter', 'welder', 'helper'];

/** The 18 PM Vishwakarma trades (pmvishwakarma.gov.in) and which of OUR trades map onto them. */
export const VISHWAKARMA_TRADES = [
  'Carpenter (Suthar)', 'Boat Maker', 'Armourer', 'Blacksmith (Lohar)', 'Hammer and Tool Kit Maker', 'Locksmith',
  'Sculptor (Moortikar) / Stone breaker', 'Goldsmith (Sunar)', 'Potter (Kumhaar)', 'Cobbler (Charmakar) / Footwear artisan',
  'Mason (Raajmistri)', 'Basket / Mat / Broom maker / Coir weaver', 'Doll & Toy maker (traditional)', 'Barber (Naai)',
  'Garland maker (Malakaar)', 'Washerman (Dhobi)', 'Tailor (Darzi)', 'Fishing net maker',
] as const;
export const VISHWAKARMA_OUR_TRADES: readonly Skill[] = ['carpenter', 'mason'];

export const DOCS: Record<DocId, L> = {
  aadhaar_mobile: { en: 'Aadhaar card with linked mobile number', hi: 'आधार कार्ड और उससे जुड़ा मोबाइल नंबर', mr: 'आधार कार्ड व त्याला जोडलेला मोबाईल नंबर', kn: 'ಆಧಾರ್ ಕಾರ್ಡ್ ಮತ್ತು ಅದಕ್ಕೆ ಜೋಡಿಸಿದ ಮೊಬೈಲ್ ನಂಬರ್' },
  aadhaar: { en: 'Aadhaar card', hi: 'आधार कार्ड', mr: 'आधार कार्ड', kn: 'ಆಧಾರ್ ಕಾರ್ಡ್' },
  bank_account: { en: 'Bank account (savings or Jan Dhan)', hi: 'बैंक खाता (बचत या जन धन)', mr: 'बँक खाते (बचत किंवा जन धन)', kn: 'ಬ್ಯಾಂಕ್ ಖಾತೆ (ಉಳಿತಾಯ ಅಥವಾ ಜನ್ ಧನ್)' },
  age_proof: { en: 'Age proof', hi: 'उम्र का प्रमाण', mr: 'वयाचा पुरावा', kn: 'ವಯಸ್ಸಿನ ದಾಖಲೆ' },
  work_90: {
    en: 'Proof of 90 days of construction work (employer certificate)',
    hi: '90 दिन निर्माण काम का प्रमाण (मालिक का प्रमाणपत्र)',
    mr: '90 दिवस बांधकाम कामाचा पुरावा (मालकाचे प्रमाणपत्र)',
    kn: '90 ದಿನಗಳ ಕಟ್ಟಡ ಕೆಲಸದ ದಾಖಲೆ (ಮಾಲೀಕರ ಪ್ರಮಾಣಪತ್ರ)',
  },
  residence: { en: 'Residence proof', hi: 'निवास प्रमाण', mr: 'रहिवासी पुरावा', kn: 'ವಾಸಸ್ಥಳ ದಾಖಲೆ' },
  photos: { en: '3 passport-size photos', hi: '3 पासपोर्ट साइज़ फ़ोटो', mr: '3 पासपोर्ट आकाराचे फोटो', kn: '3 ಪಾಸ್‌ಪೋರ್ಟ್ ಅಳತೆಯ ಫೋಟೋ' },
  ration_card: { en: 'Ration card (family details)', hi: 'राशन कार्ड (परिवार की जानकारी)', mr: 'रेशन कार्ड (कुटुंबाची माहिती)', kn: 'ಪಡಿತರ ಚೀಟಿ (ಕುಟುಂಬದ ವಿವರ)' },
};

const TODAY = '2026-11-26';

export const SCHEMES: Scheme[] = [
  {
    id: 'pmsby',
    name: { en: 'PM Suraksha Bima (accident cover)', hi: 'प्रधानमंत्री सुरक्षा बीमा', mr: 'प्रधानमंत्री सुरक्षा विमा', kn: 'ಪ್ರಧಾನಮಂತ್ರಿ ಸುರಕ್ಷಾ ಬಿಮಾ' },
    oneLineBenefit: {
      en: '₹2 lakh accident cover (₹1 lakh for partial disability) for ₹20 a year.',
      hi: 'साल के ₹20 में ₹2 लाख का दुर्घटना बीमा (आंशिक विकलांगता पर ₹1 लाख)।',
      mr: 'वर्षाला ₹20 मध्ये ₹2 लाखांचा अपघात विमा (आंशिक अपंगत्वासाठी ₹1 लाख).',
      kn: 'ವರ್ಷಕ್ಕೆ ₹20 ಕ್ಕೆ ₹2 ಲಕ್ಷ ಅಪಘಾತ ವಿಮೆ (ಭಾಗಶಃ ಅಂಗವೈಕಲ್ಯಕ್ಕೆ ₹1 ಲಕ್ಷ).',
    },
    spoken: { en: 'accident insurance for just ₹20 a year', hi: 'सिर्फ़ ₹20 साल में दुर्घटना बीमा', mr: 'फक्त ₹20 वर्षाला अपघात विमा', kn: 'ವರ್ಷಕ್ಕೆ ಕೇವಲ ₹20 ಕ್ಕೆ ಅಪಘಾತ ವಿಮೆ' },
    rules: { minAge: 18, maxAge: 70, requiresBank: true },
    documents: ['aadhaar', 'bank_account'],
    officialUrl: 'https://www.jansuraksha.gov.in/',
    helpCentreType: 'bank',
    renewal: { en: 'Renews every year by auto-debit.', hi: 'हर साल ऑटो-डेबिट से रिन्यू होता है।', mr: 'दरवर्षी ऑटो-डेबिटने नूतनीकरण होते.', kn: 'ಪ್ರತಿ ವರ್ಷ ಆಟೋ-ಡೆಬಿಟ್ ಮೂಲಕ ನವೀಕರಣ.' },
    renewalKind: 'yearly_june',
    verification: 'verified',
    lastVerified: TODAY,
    sourceNote: 'eshram.gov.in/Schemes: age 18-70, bank account with Aadhaar, ₹20/year, ₹2 lakh death/full disability, ₹1 lakh partial.',
  },
  {
    id: 'pmjjby',
    name: { en: 'PM Jeevan Jyoti Bima (life cover)', hi: 'प्रधानमंत्री जीवन ज्योति बीमा', mr: 'प्रधानमंत्री जीवन ज्योती विमा', kn: 'ಪ್ರಧಾನಮಂತ್ರಿ ಜೀವನ ಜ್ಯೋತಿ ಬಿಮಾ' },
    oneLineBenefit: { en: '₹2 lakh life cover for ₹436 a year.', hi: 'साल के ₹436 में ₹2 लाख का जीवन बीमा।', mr: 'वर्षाला ₹436 मध्ये ₹2 लाखांचा जीवन विमा.', kn: 'ವರ್ಷಕ್ಕೆ ₹436 ಕ್ಕೆ ₹2 ಲಕ್ಷ ಜೀವ ವಿಮೆ.' },
    spoken: { en: '₹2 lakh life cover for ₹436 a year', hi: '₹436 साल में ₹2 लाख का जीवन बीमा', mr: '₹436 वर्षाला ₹2 लाखांचा जीवन विमा', kn: 'ವರ್ಷಕ್ಕೆ ₹436 ಕ್ಕೆ ₹2 ಲಕ್ಷ ಜೀವ ವಿಮೆ' },
    rules: { minAge: 18, maxAge: 50, requiresBank: true },
    documents: ['aadhaar', 'bank_account'],
    officialUrl: 'https://www.jansuraksha.gov.in/',
    helpCentreType: 'bank',
    renewal: {
      en: 'Renews every year (cover year 1 June to 31 May).',
      hi: 'हर साल रिन्यू होता है (बीमा साल 1 जून से 31 मई)।',
      mr: 'दरवर्षी नूतनीकरण (विमा वर्ष 1 जून ते 31 मे).',
      kn: 'ಪ್ರತಿ ವರ್ಷ ನವೀಕರಣ (ವಿಮಾ ವರ್ಷ ಜೂನ್ 1 ರಿಂದ ಮೇ 31).',
    },
    renewalKind: 'yearly_june',
    verification: 'verified',
    lastVerified: TODAY,
    sourceNote: 'eshram.gov.in/Schemes: age 18-50, bank account with Aadhaar, ₹436/year, ₹2 lakh. Cover dates 1 Jun-31 May unverified (jansuraksha.gov.in TLS error).',
  },
  {
    id: 'pmsym',
    name: { en: 'PM Shram Yogi Maan-dhan (pension)', hi: 'प्रधानमंत्री श्रम योगी मान-धन (पेंशन)', mr: 'प्रधानमंत्री श्रम योगी मान-धन (पेन्शन)', kn: 'ಪ್ರಧಾನಮಂತ್ರಿ ಶ್ರಮ ಯೋಗಿ ಮಾನ್-ಧನ್ (ಪಿಂಚಣಿ)' },
    oneLineBenefit: {
      en: '₹3,000 a month pension after 60. You pay ₹55–200 a month (by age); the government pays the same.',
      hi: '60 के बाद हर महीने ₹3,000 पेंशन। आप उम्र के हिसाब से ₹55–200 महीना देते हैं, उतना ही सरकार देती है।',
      mr: '60 नंतर दरमहा ₹3,000 पेन्शन. तुम्ही वयानुसार दरमहा ₹55–200 भरता, तेवढेच सरकार भरते.',
      kn: '60 ವರ್ಷದ ನಂತರ ತಿಂಗಳಿಗೆ ₹3,000 ಪಿಂಚಣಿ. ವಯಸ್ಸಿಗೆ ಅನುಗುಣವಾಗಿ ನೀವು ತಿಂಗಳಿಗೆ ₹55–200 ಕಟ್ಟುತ್ತೀರಿ, ಸರ್ಕಾರವೂ ಅಷ್ಟೇ ಕಟ್ಟುತ್ತದೆ.',
    },
    spoken: { en: 'a ₹3,000 monthly pension after 60', hi: '60 के बाद ₹3,000 महीना पेंशन', mr: '60 नंतर ₹3,000 महिना पेन्शन', kn: '60 ರ ನಂತರ ತಿಂಗಳಿಗೆ ₹3,000 ಪಿಂಚಣಿ' },
    rules: { minAge: 18, maxAge: 40, excludePf: true, excludeTaxpayer: true, incomeUpto15000: true },
    documents: ['aadhaar_mobile', 'bank_account'],
    officialUrl: 'https://maandhan.in/',
    helpCentreType: 'csc',
    renewal: null,
    renewalKind: 'none',
    verification: 'verified',
    lastVerified: TODAY,
    sourceNote: 'maandhan.in: entry age 18-40, income up to ₹15,000/month, ₹55-200 matched, ₹3,000/month. eshram.gov.in: not EPFO/ESIC/NPS. Taxpayer exclusion not found on the pages read (kept from programme rules).',
  },
  {
    id: 'apy',
    name: { en: 'Atal Pension Yojana', hi: 'अटल पेंशन योजना', mr: 'अटल पेन्शन योजना', kn: 'ಅಟಲ್ ಪಿಂಚಣಿ ಯೋಜನೆ' },
    oneLineBenefit: {
      en: 'A pension of ₹1,000–5,000 a month after 60, depending on what you pay.',
      hi: '60 के बाद ₹1,000 से ₹5,000 महीना पेंशन, आप जितना जमा करें उसके हिसाब से।',
      mr: '60 नंतर दरमहा ₹1,000 ते ₹5,000 पेन्शन, तुम्ही किती भरता त्यानुसार.',
      kn: '60 ವರ್ಷದ ನಂತರ ತಿಂಗಳಿಗೆ ₹1,000–5,000 ಪಿಂಚಣಿ, ನೀವು ಕಟ್ಟುವ ಮೊತ್ತಕ್ಕೆ ಅನುಗುಣವಾಗಿ.',
    },
    spoken: { en: 'a pension of up to ₹5,000 a month', hi: '₹5,000 तक महीना पेंशन', mr: '₹5,000 पर्यंत महिना पेन्शन', kn: 'ತಿಂಗಳಿಗೆ ₹5,000 ವರೆಗೆ ಪಿಂಚಣಿ' },
    rules: { minAge: 18, maxAge: 40, requiresBank: true, excludeTaxpayer: true },
    documents: ['aadhaar_mobile', 'bank_account'],
    officialUrl: 'https://www.npscra.nsdl.co.in/scheme-details.php',
    helpCentreType: 'bank',
    renewal: null,
    renewalKind: 'none',
    verification: 'unverified',
    lastVerified: null,
    sourceNote: 'Official pages did not load on 2026-11-26 (myscheme error template; npscra DNS failure). Starting values kept.',
  },
  {
    id: 'eshram',
    name: { en: 'e-Shram card', hi: 'ई-श्रम कार्ड', mr: 'ई-श्रम कार्ड', kn: 'ಇ-ಶ್ರಮ್ ಕಾರ್ಡ್' },
    oneLineBenefit: {
      en: 'A free national worker ID (UAN) card: your gateway to other schemes.',
      hi: 'मुफ़्त राष्ट्रीय मज़दूर पहचान (UAN) कार्ड: दूसरी योजनाओं का रास्ता।',
      mr: 'मोफत राष्ट्रीय कामगार ओळख (UAN) कार्ड: इतर योजनांचा मार्ग.',
      kn: 'ಉಚಿತ ರಾಷ್ಟ್ರೀಯ ಕಾರ್ಮಿಕ ಗುರುತಿನ (UAN) ಕಾರ್ಡ್: ಇತರ ಯೋಜನೆಗಳಿಗೆ ದಾರಿ.',
    },
    spoken: { en: 'a free e-Shram worker card', hi: 'मुफ़्त ई-श्रम कार्ड', mr: 'मोफत ई-श्रम कार्ड', kn: 'ಉಚಿತ ಇ-ಶ್ರಮ್ ಕಾರ್ಡ್' },
    rules: { minAge: 16, maxAge: 59, excludePf: true, excludeTaxpayer: true },
    documents: ['aadhaar_mobile', 'bank_account'],
    officialUrl: 'https://eshram.gov.in/',
    helpCentreType: 'csc',
    renewal: null,
    renewalKind: 'none',
    verification: 'unverified',
    lastVerified: null,
    sourceNote: 'eshram.gov.in loaded but showed no eligibility text; myscheme page errored (2026-11-26). Starting values kept.',
  },
  {
    id: 'pmvishwakarma',
    name: { en: 'PM Vishwakarma', hi: 'प्रधानमंत्री विश्वकर्मा', mr: 'प्रधानमंत्री विश्वकर्मा', kn: 'ಪ್ರಧಾನಮಂತ್ರಿ ವಿಶ್ವಕರ್ಮ' },
    oneLineBenefit: {
      en: '₹500 a day while training, a ₹15,000 toolkit grant, and collateral-free loans of ₹1 lakh, then ₹2 lakh.',
      hi: 'ट्रेनिंग में ₹500 रोज़, ₹15,000 का टूलकिट अनुदान, और बिना गारंटी ₹1 लाख फिर ₹2 लाख का लोन।',
      mr: 'प्रशिक्षणात दररोज ₹500, ₹15,000 टूलकिट अनुदान, आणि तारणाशिवाय ₹1 लाख नंतर ₹2 लाख कर्ज.',
      kn: 'ತರಬೇತಿಯಲ್ಲಿ ದಿನಕ್ಕೆ ₹500, ₹15,000 ಉಪಕರಣ ಅನುದಾನ, ಮತ್ತು ಜಾಮೀನು ಇಲ್ಲದೆ ₹1 ಲಕ್ಷ ನಂತರ ₹2 ಲಕ್ಷ ಸಾಲ.',
    },
    spoken: { en: 'a ₹15,000 toolkit grant and cheap loans', hi: '₹15,000 का टूलकिट और सस्ता लोन', mr: '₹15,000 टूलकिट आणि स्वस्त कर्ज', kn: '₹15,000 ಉಪಕರಣ ಅನುದಾನ ಮತ್ತು ಕಡಿಮೆ ಬಡ್ಡಿ ಸಾಲ' },
    rules: { minAge: 18, trades: [...VISHWAKARMA_OUR_TRADES] },
    documents: ['aadhaar_mobile', 'bank_account', 'ration_card'],
    officialUrl: 'https://pmvishwakarma.gov.in/',
    helpCentreType: 'csc',
    renewal: null,
    renewalKind: 'none',
    verification: 'verified',
    lastVerified: TODAY,
    sourceNote:
      'pmvishwakarma.gov.in: min age 18, 18 trades, ₹500/day stipend, ₹15,000 toolkit grant, ₹1L then ₹2L loans. Also: one member per family, not for govt employees, no PMEGP/SVANidhi/Mudra loan in last 5 years.',
  },
  {
    id: 'bocw_mh',
    name: {
      en: 'Maharashtra construction workers welfare board (MahaBOCW)',
      hi: 'महाराष्ट्र निर्माण मज़दूर कल्याण बोर्ड',
      mr: 'महाराष्ट्र इमारत व इतर बांधकाम कामगार कल्याणकारी मंडळ',
      kn: 'ಮಹಾರಾಷ್ಟ್ರ ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಕಲ್ಯಾಣ ಮಂಡಳಿ',
    },
    oneLineBenefit: {
      en: 'Free registration. ₹30,000 for a first marriage, yearly education help for 2 children, ₹2 lakh housing help, ₹5 lakh if a worker dies at work.',
      hi: 'मुफ़्त पंजीकरण। पहली शादी के लिए ₹30,000, 2 बच्चों की पढ़ाई के लिए सालाना मदद, घर के लिए ₹2 लाख, काम पर मृत्यु होने पर ₹5 लाख।',
      mr: 'मोफत नोंदणी. पहिल्या विवाहासाठी ₹30,000, 2 मुलांच्या शिक्षणासाठी वार्षिक मदत, घरासाठी ₹2 लाख, कामावर मृत्यू झाल्यास ₹5 लाख.',
      kn: 'ಉಚಿತ ನೋಂದಣಿ. ಮೊದಲ ಮದುವೆಗೆ ₹30,000, 2 ಮಕ್ಕಳ ಶಿಕ್ಷಣಕ್ಕೆ ವಾರ್ಷಿಕ ನೆರವು, ಮನೆಗೆ ₹2 ಲಕ್ಷ, ಕೆಲಸದಲ್ಲಿ ಮರಣವಾದರೆ ₹5 ಲಕ್ಷ.',
    },
    spoken: { en: 'construction welfare board benefits', hi: 'निर्माण मज़दूर बोर्ड के लाभ', mr: 'बांधकाम कामगार मंडळाचे लाभ', kn: 'ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಮಂಡಳಿಯ ಸೌಲಭ್ಯಗಳು' },
    rules: { minAge: 18, maxAge: 60, minConstructionDays: 90, state: 'MH' },
    documents: ['age_proof', 'work_90', 'residence', 'aadhaar', 'photos'],
    officialUrl: 'https://mahabocw.in/',
    helpCentreType: 'labour_office',
    renewal: {
      en: 'Keep your registration renewed (registration and renewal are free; check current dates on the board site).',
      hi: 'पंजीकरण रिन्यू रखें (पंजीकरण और नवीनीकरण मुफ़्त है; तारीखें बोर्ड की साइट पर देखें)।',
      mr: 'नोंदणीचे नूतनीकरण करत राहा (नोंदणी व नूतनीकरण मोफत; तारखा मंडळाच्या साइटवर पाहा).',
      kn: 'ನೋಂದಣಿಯನ್ನು ನವೀಕರಿಸುತ್ತಿರಿ (ನೋಂದಣಿ ಮತ್ತು ನವೀಕರಣ ಉಚಿತ; ದಿನಾಂಕಗಳನ್ನು ಮಂಡಳಿಯ ತಾಣದಲ್ಲಿ ನೋಡಿ).',
    },
    renewalKind: 'yearly_from_registration',
    verification: 'verified',
    lastVerified: TODAY,
    sourceNote:
      'mahabocw.in: ages 18-60, >90 days construction work in last 12 months; registration/renewal fee free (notice 13-08-2025); marriage ₹30,000; education aid; housing ₹2 lakh; death at work ₹5 lakh. Yearly renewal period not stated on the pages read.',
  },
  {
    id: 'bocw_ka',
    name: {
      en: 'Karnataka construction workers welfare board (KBOCWWB)',
      hi: 'कर्नाटक निर्माण मज़दूर कल्याण बोर्ड',
      mr: 'कर्नाटक बांधकाम कामगार कल्याण मंडळ',
      kn: 'ಕರ್ನಾಟಕ ಕಟ್ಟಡ ಮತ್ತು ಇತರೆ ನಿರ್ಮಾಣ ಕಾರ್ಮಿಕರ ಕಲ್ಯಾಣ ಮಂಡಳಿ',
    },
    oneLineBenefit: {
      en: 'Welfare support for registered construction workers, such as education, marriage, medical and accident help, and a pension (check amounts with the board).',
      hi: 'पंजीकृत निर्माण मज़दूरों के लिए पढ़ाई, शादी, इलाज, दुर्घटना सहायता और पेंशन जैसे लाभ (रकम बोर्ड से जाँचें)।',
      mr: 'नोंदणीकृत बांधकाम कामगारांसाठी शिक्षण, विवाह, वैद्यकीय, अपघात मदत आणि पेन्शन असे लाभ (रक्कम मंडळाकडे तपासा).',
      kn: 'ನೋಂದಾಯಿತ ಕಟ್ಟಡ ಕಾರ್ಮಿಕರಿಗೆ ಶಿಕ್ಷಣ, ಮದುವೆ, ವೈದ್ಯಕೀಯ, ಅಪಘಾತ ನೆರವು ಮತ್ತು ಪಿಂಚಣಿಯಂತಹ ಸೌಲಭ್ಯಗಳು (ಮೊತ್ತವನ್ನು ಮಂಡಳಿಯಲ್ಲಿ ಪರಿಶೀಲಿಸಿ).',
    },
    spoken: { en: 'construction welfare board benefits', hi: 'निर्माण मज़दूर बोर्ड के लाभ', mr: 'बांधकाम कामगार मंडळाचे लाभ', kn: 'ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಮಂಡಳಿಯ ಸೌಲಭ್ಯಗಳು' },
    rules: { minAge: 18, maxAge: 60, minConstructionDays: 90, state: 'KA' },
    documents: ['age_proof', 'work_90', 'residence', 'aadhaar', 'photos'],
    officialUrl: 'https://kbocwwb.karnataka.gov.in/',
    helpCentreType: 'labour_office',
    renewal: { en: 'Renew your registration every year.', hi: 'हर साल पंजीकरण रिन्यू कराएँ।', mr: 'दरवर्षी नोंदणीचे नूतनीकरण करा.', kn: 'ಪ್ರತಿ ವರ್ಷ ನೋಂದಣಿಯನ್ನು ನವೀಕರಿಸಿ.' },
    renewalKind: 'yearly_from_registration',
    verification: 'unverified',
    lastVerified: null,
    sourceNote: 'kbocwwb.karnataka.gov.in returned an empty page and labour.karnataka.gov.in had a TLS error (2026-11-26). Starting values kept; benefit amounts deliberately not stated.',
  },
  {
    id: 'pmjay',
    name: { en: 'Ayushman Bharat PM-JAY (health cover)', hi: 'आयुष्मान भारत PM-JAY (स्वास्थ्य बीमा)', mr: 'आयुष्मान भारत PM-JAY (आरोग्य विमा)', kn: 'ಆಯುಷ್ಮಾನ್ ಭಾರತ್ PM-JAY (ಆರೋಗ್ಯ ವಿಮೆ)' },
    oneLineBenefit: {
      en: 'Up to ₹5 lakh of hospital care per family per year, if your family is listed. Check on the official site.',
      hi: 'अगर आपका परिवार सूची में है तो हर साल ₹5 लाख तक का इलाज। आधिकारिक साइट पर जाँचें।',
      mr: 'तुमचे कुटुंब यादीत असल्यास दरवर्षी ₹5 लाखांपर्यंत उपचार. अधिकृत साइटवर तपासा.',
      kn: 'ನಿಮ್ಮ ಕುಟುಂಬ ಪಟ್ಟಿಯಲ್ಲಿ ಇದ್ದರೆ ವರ್ಷಕ್ಕೆ ₹5 ಲಕ್ಷದವರೆಗೆ ಆಸ್ಪತ್ರೆ ಚಿಕಿತ್ಸೆ. ಅಧಿಕೃತ ತಾಣದಲ್ಲಿ ಪರಿಶೀಲಿಸಿ.',
    },
    spoken: { en: 'free hospital cover, if your family is listed', hi: 'परिवार सूची में हो तो मुफ़्त इलाज', mr: 'कुटुंब यादीत असल्यास मोफत उपचार', kn: 'ಕುಟುಂಬ ಪಟ್ಟಿಯಲ್ಲಿದ್ದರೆ ಉಚಿತ ಚಿಕಿತ್ಸೆ' },
    rules: { noRuleCheck: true },
    documents: ['aadhaar', 'ration_card'],
    officialUrl: 'https://beneficiary.nha.gov.in/',
    helpCentreType: 'csc',
    renewal: null,
    renewalKind: 'none',
    verification: 'verified',
    lastVerified: TODAY,
    sourceNote: 'beneficiary.nha.gov.in loaded (beneficiary portal). ₹5 lakh/family/year per eshram.gov.in/Schemes summary.',
  },
];

export const SCHEME_BY_ID: Record<SchemeId, Scheme> = Object.fromEntries(SCHEMES.map((s) => [s.id, s])) as Record<SchemeId, Scheme>;
