import type { Language } from './languages';
import type { Skill } from './skills';
import { skillLabel } from './skills';

/**
 * All bot + voice copy. Written to be *spoken* first (TTS) and read second.
 * Hindi/Marathi copy is in Devanagari so ElevenLabs pronounces it natively.
 */
type Params = Record<string, string | number>;
type Template = string | ((p: Params) => string);

export const STRINGS = {
  welcome: {
    en: 'Namaste! I am KaamSetu. I help you find work near your home. Which language do you prefer?',
    hi: 'नमस्ते! मैं कामसेतु हूँ। मैं आपको घर के पास काम ढूँढने में मदद करता हूँ। आप कौन सी भाषा पसंद करेंगे?',
    mr: 'नमस्कार! मी कामसेतु. मी तुम्हाला घराजवळ काम शोधायला मदत करतो. तुम्हाला कोणती भाषा आवडेल?',
  },
  consent: {
    en: 'Before we start: we will save your name, trade, area and wage so employers near you can find you. Your phone number is never shown publicly. You can say "delete my data" anytime. Do you agree?',
    hi: 'शुरू करने से पहले: हम आपका नाम, काम, इलाका और मज़दूरी सेव करेंगे ताकि पास के मालिक आपको ढूँढ सकें। आपका फ़ोन नंबर कभी सबको नहीं दिखेगा। आप कभी भी "मेरा डेटा हटाओ" बोल सकते हैं। क्या आप सहमत हैं?',
    mr: 'सुरू करण्याआधी: तुमचं नाव, काम, परिसर आणि मजुरी आम्ही जतन करू, म्हणजे जवळचे मालक तुम्हाला शोधू शकतील. तुमचा फोन नंबर कधीही सर्वांना दिसणार नाही. तुम्ही कधीही "माझा डेटा काढा" म्हणू शकता. तुम्ही सहमत आहात का?',
  },
  askIntro: {
    en: 'Great! Now send me a voice note. Tell me your name, your work, your area, and how much you want per day.',
    hi: 'बहुत बढ़िया! अब मुझे एक वॉइस मैसेज भेजिए। अपना नाम, अपना काम, अपना इलाका, और रोज़ कितने पैसे चाहिए, बताइए।',
    mr: 'छान! आता मला एक व्हॉइस मेसेज पाठवा. तुमचं नाव, तुमचं काम, तुमचा परिसर आणि रोज किती पैसे हवेत ते सांगा.',
  },
  listening: {
    en: 'Listening…',
    hi: 'सुन रहा हूँ…',
    mr: 'ऐकतोय…',
  },
  confirmProfile: {
    en: (p: Params) => `${p.name}, you are a ${p.skill} in ${p.locality}, asking ${p.wage} rupees a day. Is that correct?`,
    hi: (p: Params) => `${p.name} जी, आप ${p.locality} में ${p.skill} हैं, और रोज़ ${p.wage} रुपये चाहते हैं। क्या यह सही है?`,
    mr: (p: Params) => `${p.name}, तुम्ही ${p.locality} मध्ये ${p.skill} आहात, आणि रोज ${p.wage} रुपये हवेत. हे बरोबर आहे का?`,
  },
  profileMissing: {
    en: (p: Params) => `Sorry, I didn't catch your ${p.fields}. Please send one more voice note.`,
    hi: (p: Params) => `माफ़ कीजिए, मुझे आपका ${p.fields} समझ नहीं आया। कृपया एक और वॉइस मैसेज भेजिए।`,
    mr: (p: Params) => `माफ करा, मला तुमचं ${p.fields} समजलं नाही. कृपया अजून एक व्हॉइस मेसेज पाठवा.`,
  },
  profileSaved: {
    en: 'Done! Your profile is live. I will send you a voice message whenever there is work near you.',
    hi: 'हो गया! आपकी प्रोफ़ाइल चालू है। आपके पास काम आते ही मैं आपको आवाज़ में बताऊँगा।',
    mr: 'झालं! तुमची प्रोफाइल सुरू झाली. जवळ काम आलं की मी तुम्हाला आवाजात सांगेन.',
  },
  fixProfile: {
    en: 'No problem. Send a new voice note with the correct details.',
    hi: 'कोई बात नहीं। सही जानकारी के साथ एक नया वॉइस मैसेज भेजिए।',
    mr: 'काही हरकत नाही. बरोबर माहितीसह नवीन व्हॉइस मेसेज पाठवा.',
  },
  jobAlert: {
    en: (p: Params) =>
      `${p.name}, there is ${p.skill} work in ${p.locality}, ${p.distance} kilometres away. ${p.wage} rupees a day, for ${p.days} days, starting ${p.start}. Press Accept if you want it.`,
    hi: (p: Params) =>
      `${p.name} जी, ${p.locality} में ${p.distance} किलोमीटर दूर ${p.skill} का काम है। ${p.wage} रुपये रोज़, ${p.days} दिन के लिए, ${p.start} से। काम चाहिए तो "हाँ" दबाइए।`,
    mr: (p: Params) =>
      `${p.name}, ${p.locality} मध्ये ${p.distance} किलोमीटर अंतरावर ${p.skill} चं काम आहे. रोज ${p.wage} रुपये, ${p.days} दिवसांसाठी, ${p.start} पासून. काम हवं असेल तर "हो" दाबा.`,
  },
  accepted: {
    en: (p: Params) => `Wonderful! The employer ${p.employer} has been told. Call them on ${p.phone}. All the best!`,
    hi: (p: Params) => `बहुत बढ़िया! मालिक ${p.employer} को बता दिया गया है। उन्हें ${p.phone} पर फ़ोन कीजिए। शुभकामनाएँ!`,
    mr: (p: Params) => `खूप छान! मालक ${p.employer} यांना कळवलं आहे. त्यांना ${p.phone} वर फोन करा. शुभेच्छा!`,
  },
  declined: {
    en: 'Okay, no problem. I will tell you about the next job.',
    hi: 'ठीक है, कोई बात नहीं। अगला काम आते ही बताऊँगा।',
    mr: 'ठीक आहे, काही हरकत नाही. पुढचं काम आलं की सांगेन.',
  },
  alreadyFilled: {
    en: 'Sorry, this job has already been filled.',
    hi: 'माफ़ कीजिए, यह काम पहले ही भर चुका है।',
    mr: 'माफ करा, हे काम आधीच भरलं आहे.',
  },
  deleted: {
    en: 'Your data has been deleted. Send /start anytime to join again.',
    hi: 'आपका डेटा हटा दिया गया है। फिर से जुड़ने के लिए कभी भी /start भेजिए।',
    mr: 'तुमचा डेटा काढून टाकला आहे. पुन्हा जोडण्यासाठी कधीही /start पाठवा.',
  },
  error: {
    en: 'Sorry, something went wrong. Please try again.',
    hi: 'माफ़ कीजिए, कुछ गड़बड़ हो गई। कृपया फिर से कोशिश कीजिए।',
    mr: 'माफ करा, काहीतरी चुकलं. कृपया पुन्हा प्रयत्न करा.',
  },
  noJobsNearby: {
    en: 'There is no matching work near you right now. I will tell you as soon as something comes.',
    hi: 'अभी आपके पास कोई काम नहीं है। जैसे ही आएगा, मैं बताऊँगा।',
    mr: 'आत्ता तुमच्या जवळ काम नाही. काम येताच मी सांगेन.',
  },
  // Button labels
  btnCorrect: { en: '✅ Correct', hi: '✅ सही है', mr: '✅ बरोबर' },
  btnFix: { en: '✏️ Fix', hi: '✏️ बदलें', mr: '✏️ बदला' },
  btnAgree: { en: 'I agree', hi: 'मैं सहमत हूँ', mr: 'मी सहमत आहे' },
  btnAccept: { en: '✅ Accept', hi: '✅ हाँ, काम चाहिए', mr: '✅ हो, काम हवं' },
  btnDecline: { en: 'Not interested', hi: 'नहीं चाहिए', mr: 'नको' },
  btnCall: { en: '📞 Call employer', hi: '📞 मालिक को फ़ोन', mr: '📞 मालकाला फोन' },
  // Field names for "missing" prompt
  fieldName: { en: 'name', hi: 'नाम', mr: 'नाव' },
  fieldSkill: { en: 'work', hi: 'काम', mr: 'काम' },
  fieldLocality: { en: 'area', hi: 'इलाका', mr: 'परिसर' },
  fieldWage: { en: 'daily wage', hi: 'रोज़ की मज़दूरी', mr: 'रोजची मजुरी' },
  and: { en: 'and', hi: 'और', mr: 'आणि' },
  today: { en: 'today', hi: 'आज', mr: 'आज' },
  tomorrow: { en: 'tomorrow', hi: 'कल', mr: 'उद्या' },
} satisfies Record<string, Record<Language, Template>>;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey, lang: Language, params: Params = {}): string {
  const entry = STRINGS[key][lang] as Template;
  return typeof entry === 'function' ? entry(params) : entry;
}

/** Spoken/written start date relative to `today` (YYYY-MM-DD). */
export function startLabel(startDate: string, lang: Language, today: string): string {
  if (startDate === today) return t('today', lang);
  const tomorrow = new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10);
  if (startDate === tomorrow) return t('tomorrow', lang);
  const d = new Date(startDate + 'T00:00:00');
  return d.toLocaleDateString(lang === 'en' ? 'en-IN' : `${lang}-IN`, { day: 'numeric', month: 'long' });
}

export function jobAlertText(
  lang: Language,
  p: { workerName: string; skill: Skill; locality: string; distanceKm: number; wage: number; days: number; startDate: string; today: string },
): string {
  return t('jobAlert', lang, {
    name: p.workerName.split(' ')[0] ?? p.workerName,
    skill: skillLabel(p.skill, lang),
    locality: p.locality,
    distance: p.distanceKm < 1 ? '1' : String(Math.round(p.distanceKm * 10) / 10),
    wage: p.wage,
    days: p.days,
    start: startLabel(p.startDate, lang, p.today),
  });
}
