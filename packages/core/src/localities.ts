export interface Locality {
  name: string;
  /** Devanagari + common romanised spellings, lowercase */
  aliases: string[];
  lat: number;
  lng: number;
}

/** Pune neighbourhoods (approximate centroids). Used by the mock geocoder, seeding and the map. */
export const PUNE_LOCALITIES: Locality[] = [
  { name: 'Kothrud', aliases: ['kothrud', 'kotharud', 'कोथरूड', 'कोथरुड'], lat: 18.5074, lng: 73.8077 },
  { name: 'Baner', aliases: ['baner', 'बाणेर', 'बानेर'], lat: 18.559, lng: 73.7868 },
  { name: 'Hadapsar', aliases: ['hadapsar', 'हडपसर'], lat: 18.5089, lng: 73.926 },
  { name: 'Wakad', aliases: ['wakad', 'वाकड'], lat: 18.5987, lng: 73.7611 },
  { name: 'Hinjewadi', aliases: ['hinjewadi', 'hinjawadi', 'हिंजवडी', 'हिंजेवाडी'], lat: 18.5913, lng: 73.7389 },
  { name: 'Shivajinagar', aliases: ['shivajinagar', 'shivaji nagar', 'शिवाजीनगर', 'शिवाजी नगर'], lat: 18.5308, lng: 73.8475 },
  { name: 'Pimpri', aliases: ['pimpri', 'pimpri chinchwad', 'पिंपरी', 'पिम्परी'], lat: 18.6298, lng: 73.7997 },
  { name: 'Kharadi', aliases: ['kharadi', 'खराडी'], lat: 18.5515, lng: 73.9348 },
  { name: 'Aundh', aliases: ['aundh', 'औंध'], lat: 18.5602, lng: 73.8079 },
  { name: 'Viman Nagar', aliases: ['viman nagar', 'vimannagar', 'विमान नगर', 'विमाननगर'], lat: 18.5679, lng: 73.9143 },
  { name: 'Deccan', aliases: ['deccan', 'deccan gymkhana', 'डेक्कन'], lat: 18.5167, lng: 73.8418 },
  { name: 'Swargate', aliases: ['swargate', 'स्वारगेट'], lat: 18.5018, lng: 73.8636 },
  { name: 'Katraj', aliases: ['katraj', 'कात्रज'], lat: 18.4575, lng: 73.8508 },
  { name: 'Warje', aliases: ['warje', 'वारजे'], lat: 18.4844, lng: 73.7997 },
  { name: 'Chinchwad', aliases: ['chinchwad', 'चिंचवड'], lat: 18.6279, lng: 73.7804 },
  { name: 'Yerawada', aliases: ['yerawada', 'yerwada', 'येरवडा'], lat: 18.5529, lng: 73.8797 },
  { name: 'Koregaon Park', aliases: ['koregaon park', 'kp', 'कोरेगाव पार्क'], lat: 18.5362, lng: 73.8939 },
  { name: 'Sinhagad Road', aliases: ['sinhagad road', 'singhad road', 'सिंहगड रोड'], lat: 18.4793, lng: 73.8227 },
  { name: 'Bavdhan', aliases: ['bavdhan', 'बावधन'], lat: 18.5161, lng: 73.7746 },
  { name: 'Magarpatta', aliases: ['magarpatta', 'मगरपट्टा'], lat: 18.5149, lng: 73.9271 },
];

/** Bengaluru neighbourhoods (approx. centroids): Karnataka BOCW + help centres. Kept separate so the Pune map projection is unchanged. */
export const BENGALURU_LOCALITIES: Locality[] = [
  { name: 'Jayanagar', aliases: ['jayanagar', 'ಜಯನಗರ'], lat: 12.925, lng: 77.5938 },
  { name: 'Rajajinagar', aliases: ['rajajinagar', 'ರಾಜಾಜಿನಗರ'], lat: 12.9915, lng: 77.5543 },
  { name: 'Yeshwanthpur', aliases: ['yeshwanthpur', 'yeshwantpur', 'ಯಶವಂತಪುರ'], lat: 13.0285, lng: 77.5401 },
  { name: 'Whitefield', aliases: ['whitefield', 'ವೈಟ್‌ಫೀಲ್ಡ್'], lat: 12.9698, lng: 77.75 },
  { name: 'Electronic City', aliases: ['electronic city', 'ಎಲೆಕ್ಟ್ರಾನಿಕ್ ಸಿಟಿ'], lat: 12.8452, lng: 77.6602 },
  { name: 'K R Puram', aliases: ['k r puram', 'kr puram', 'ಕೆ ಆರ್ ಪುರಂ'], lat: 13.0077, lng: 77.6958 },
  { name: 'Marathahalli', aliases: ['marathahalli', 'ಮಾರತಹಳ್ಳಿ'], lat: 12.9591, lng: 77.6974 },
  { name: 'Peenya', aliases: ['peenya', 'ಪೀಣ್ಯ'], lat: 13.0285, lng: 77.5197 },
  { name: 'Banashankari', aliases: ['banashankari', 'ಬನಶಂಕರಿ'], lat: 12.9255, lng: 77.5468 },
  { name: 'Hebbal', aliases: ['hebbal', 'ಹೆಬ್ಬಾಳ'], lat: 13.0358, lng: 77.597 },
];
const ALL_LOCALITIES = [...PUNE_LOCALITIES, ...BENGALURU_LOCALITIES];

export type IndianState = 'MH' | 'KA';
/** State for a locality name (defaults to Maharashtra: our home city is Pune). */
export function stateOfLocality(name: string): IndianState {
  const n = name.toLowerCase().trim();
  return BENGALURU_LOCALITIES.some((l) => l.name.toLowerCase() === n || l.aliases.includes(n)) || /bengaluru|bangalore|ಬೆಂಗಳೂರು/.test(n) ? 'KA' : 'MH';
}

export const PUNE_CENTER = { lat: 18.5204, lng: 73.8567 } as const;

export const SEED_LOCALITIES = [
  'Kothrud',
  'Baner',
  'Hadapsar',
  'Wakad',
  'Hinjewadi',
  'Shivajinagar',
  'Pimpri',
  'Kharadi',
  'Aundh',
  'Viman Nagar',
] as const;

function norm(s: string): string {
  return s.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Find the first locality mentioned anywhere in free text. */
export function findLocalityInText(text: string): Locality | null {
  const t = norm(text);
  let best: { loc: Locality; len: number } | null = null;
  for (const loc of ALL_LOCALITIES) {
    for (const a of loc.aliases) {
      if (t.includes(a) && (!best || a.length > best.len)) best = { loc, len: a.length };
    }
  }
  return best?.loc ?? null;
}

export function getLocality(name: string): Locality | null {
  const n = norm(name);
  return ALL_LOCALITIES.find((l) => norm(l.name) === n || l.aliases.includes(n)) ?? findLocalityInText(n);
}

/** Locality name in the speaker's script (Devanagari for hi/mr) so TTS pronounces it natively. */
export function localityLabel(name: string, lang: 'hi' | 'mr' | 'en' | string): string {
  if (lang === 'en') return name;
  const loc = getLocality(name);
  const script = lang === 'kn' ? /[ಀ-೿]/ : /[ऀ-ॿ]/;
  return loc?.aliases.find((a) => script.test(a)) ?? name;
}
