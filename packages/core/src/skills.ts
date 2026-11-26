import type { Language } from './languages';

export const SKILL_CODES = [
  'plumber',
  'electrician',
  'mason',
  'painter',
  'carpenter',
  'tile_fitter',
  'welder',
  'ac_technician',
  'driver',
  'delivery',
  'cook',
  'domestic',
  'helper',
  'security_guard',
] as const;
export type Skill = (typeof SKILL_CODES)[number];

export interface SkillInfo {
  code: Skill;
  label: Record<Language, string>;
  /** lowercase keywords (latin + devanagari) used by the rule-based extractor */
  keywords: string[];
}

export const SKILLS: Record<Skill, SkillInfo> = {
  plumber: {
    code: 'plumber',
    label: { en: 'Plumber', hi: 'प्लंबर', mr: 'प्लंबर', kn: 'ಪ್ಲಂಬರ್' },
    keywords: ['plumber', 'plumbing', 'pipe', 'nal', 'nalke', 'प्लंबर', 'प्लम्बर', 'नल', 'पाइप', 'नळ', 'ಪ್ಲಂಬರ್'],
  },
  electrician: {
    code: 'electrician',
    label: { en: 'Electrician', hi: 'इलेक्ट्रीशियन', mr: 'इलेक्ट्रिशियन', kn: 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್' },
    keywords: ['electrician', 'electric', 'wiring', 'bijli', 'light fitting', 'इलेक्ट्रीशियन', 'इलेक्ट्रिशियन', 'बिजली', 'वायरिंग', 'वीज', 'ಎಲೆಕ್ಟ್ರಿಷಿಯನ್', 'ವೈರಿಂಗ್'],
  },
  mason: {
    code: 'mason',
    label: { en: 'Mason', hi: 'राजमिस्त्री', mr: 'गवंडी', kn: 'ಗಾರೆ ಕೆಲಸಗಾರ' },
    keywords: ['mason', 'masonry', 'mistri', 'rajmistri', 'gavandi', 'brick', 'construction', 'राजमिस्त्री', 'मिस्त्री', 'गवंडी', 'बांधकाम', 'चिनाई', 'ಗಾರೆ', 'ಮೇಸ್ತ್ರಿ'],
  },
  painter: {
    code: 'painter',
    label: { en: 'Painter', hi: 'पेंटर', mr: 'पेंटर', kn: 'ಪೇಂಟರ್' },
    keywords: ['painter', 'painting', 'paint', 'rang', 'putty', 'पेंटर', 'पेंटिंग', 'रंग', 'पुट्टी', 'रंगकाम', 'ಪೇಂಟರ್', 'ಬಣ್ಣ'],
  },
  carpenter: {
    code: 'carpenter',
    label: { en: 'Carpenter', hi: 'बढ़ई', mr: 'सुतार', kn: 'ಬಡಗಿ' },
    keywords: ['carpenter', 'carpentry', 'furniture', 'badhai', 'sutar', 'wood', 'बढ़ई', 'कारपेंटर', 'सुतार', 'फर्नीचर', 'ಬಡಗಿ', 'ಕಾರ್ಪೆಂಟರ್'],
  },
  tile_fitter: {
    code: 'tile_fitter',
    label: { en: 'Tile fitter', hi: 'टाइल मिस्त्री', mr: 'टाइल फिटर', kn: 'ಟೈಲ್ಸ್ ಫಿಟ್ಟರ್' },
    keywords: ['tile', 'tiles', 'tiling', 'flooring', 'marble', 'टाइल', 'फ्लोरिंग', 'फरशी', 'ಟೈಲ್ಸ್'],
  },
  welder: {
    code: 'welder',
    label: { en: 'Welder', hi: 'वेल्डर', mr: 'वेल्डर', kn: 'ವೆಲ್ಡರ್' },
    keywords: ['welder', 'welding', 'fabrication', 'grill', 'वेल्डर', 'वेल्डिंग', 'ग्रिल', 'ವೆಲ್ಡರ್'],
  },
  ac_technician: {
    code: 'ac_technician',
    label: { en: 'AC technician', hi: 'एसी मैकेनिक', mr: 'एसी टेक्निशियन', kn: 'ಎಸಿ ಟೆಕ್ನಿಷಿಯನ್' },
    keywords: ['ac technician', 'ac repair', 'ac mechanic', 'ac service', 'fridge', 'एसी', 'फ्रिज', 'ಎಸಿ'],
  },
  driver: {
    code: 'driver',
    label: { en: 'Driver', hi: 'ड्राइवर', mr: 'ड्रायव्हर', kn: 'ಡ್ರೈವರ್' },
    keywords: ['driver', 'driving', 'gaadi', 'tempo', 'ड्राइवर', 'ड्रायव्हर', 'गाड़ी', 'गाडी', 'ಡ್ರೈವರ್'],
  },
  delivery: {
    code: 'delivery',
    label: { en: 'Delivery rider', hi: 'डिलीवरी राइडर', mr: 'डिलिव्हरी रायडर', kn: 'ಡೆಲಿವರಿ ರೈಡರ್' },
    keywords: ['delivery', 'rider', 'courier', 'डिलीवरी', 'डिलिव्हरी', 'ಡೆಲಿವರಿ'],
  },
  cook: {
    code: 'cook',
    label: { en: 'Cook', hi: 'रसोइया', mr: 'स्वयंपाकी', kn: 'ಅಡುಗೆಯವರು' },
    keywords: ['cook', 'cooking', 'chef', 'khana', 'rasoiya', 'catering', 'रसोइया', 'खाना', 'कुक', 'स्वयंपाक', 'आचारी', 'ಅಡುಗೆ'],
  },
  domestic: {
    code: 'domestic',
    label: { en: 'Domestic help', hi: 'घरेलू कामगार', mr: 'घरकाम', kn: 'ಮನೆಗೆಲಸ' },
    keywords: ['domestic', 'maid', 'house help', 'cleaning', 'safai', 'jhadu', 'घरेलू', 'सफाई', 'घरकाम', 'झाडू', 'बाई', 'ಮನೆಗೆಲಸ'],
  },
  helper: {
    code: 'helper',
    label: { en: 'Helper', hi: 'हेल्पर', mr: 'हेल्पर', kn: 'ಸಹಾಯಕ' },
    keywords: ['helper', 'labour', 'labor', 'loading', 'majdoor', 'mazdoor', 'hamal', 'हेल्पर', 'मजदूर', 'मज़दूर', 'हमाल', 'मजूर', 'ಸಹಾಯಕ', 'ಕೂಲಿ'],
  },
  security_guard: {
    code: 'security_guard',
    label: { en: 'Security guard', hi: 'सिक्योरिटी गार्ड', mr: 'सुरक्षा रक्षक', kn: 'ಸೆಕ್ಯುರಿಟಿ ಗಾರ್ಡ್' },
    keywords: ['security', 'guard', 'watchman', 'chowkidar', 'गार्ड', 'चौकीदार', 'सुरक्षा', 'वॉचमन', 'ಗಾರ್ಡ್', 'ಸೆಕ್ಯುರಿಟಿ'],
  },
};

/**
 * Skill graph: how transferable a worker's skill is to a job's skill.
 * Read as RELATED[jobSkill][workerSkill] = score (0..1). Exact matches are always 1.
 */
export const RELATED_SKILLS: Partial<Record<Skill, Partial<Record<Skill, number>>>> = {
  painter: { mason: 0.6, carpenter: 0.4, helper: 0.3 },
  mason: { tile_fitter: 0.6, painter: 0.4, helper: 0.4 },
  tile_fitter: { mason: 0.6, helper: 0.3 },
  electrician: { ac_technician: 0.6, plumber: 0.2 },
  ac_technician: { electrician: 0.6 },
  plumber: { tile_fitter: 0.3, electrician: 0.2, helper: 0.2 },
  carpenter: { painter: 0.3, helper: 0.3 },
  welder: { helper: 0.3, electrician: 0.2 },
  driver: { delivery: 0.6 },
  delivery: { driver: 0.6, helper: 0.3 },
  cook: { domestic: 0.4 },
  domestic: { cook: 0.4, helper: 0.3 },
  helper: { mason: 0.6, painter: 0.6, delivery: 0.5, domestic: 0.4, carpenter: 0.5, tile_fitter: 0.5, plumber: 0.4, welder: 0.4 },
  security_guard: { helper: 0.3, driver: 0.2 },
};

export function skillLabel(skill: Skill, lang: Language = 'en'): string {
  return SKILLS[skill].label[lang];
}

/** 1 for exact, related weight for transferable skills, 0 otherwise. Returns best worker skill used. */
export function skillAffinity(workerSkills: readonly Skill[], jobSkill: Skill): { score: number; via: Skill | null } {
  if (workerSkills.includes(jobSkill)) return { score: 1, via: jobSkill };
  const related = RELATED_SKILLS[jobSkill] ?? {};
  let best = 0;
  let via: Skill | null = null;
  for (const s of workerSkills) {
    const w = related[s] ?? 0;
    if (w > best) {
      best = w;
      via = s;
    }
  }
  return { score: best, via };
}
