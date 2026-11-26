import type { Language } from './languages';
import type { Skill } from './skills';
import { skillLabel } from './skills';
import { localityLabel } from './localities';

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
    kn: 'ನಮಸ್ಕಾರ! ನಾನು ಕಾಮಸೇತು. ನಿಮ್ಮ ಮನೆಯ ಹತ್ತಿರ ಕೆಲಸ ಹುಡುಕಲು ನಾನು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ನಿಮಗೆ ಯಾವ ಭಾಷೆ ಇಷ್ಟ?',
  },
  consent: {
    en: 'Before we start: we will save your name, trade, area and wage so employers near you can find you. Your phone number is never shown publicly. You can say "delete my data" anytime. Do you agree?',
    hi: 'शुरू करने से पहले: हम आपका नाम, काम, इलाका और मज़दूरी सेव करेंगे ताकि पास के मालिक आपको ढूँढ सकें। आपका फ़ोन नंबर कभी सबको नहीं दिखेगा। आप कभी भी "मेरा डेटा हटाओ" बोल सकते हैं। क्या आप सहमत हैं?',
    mr: 'सुरू करण्याआधी: तुमचं नाव, काम, परिसर आणि मजुरी आम्ही जतन करू, म्हणजे जवळचे मालक तुम्हाला शोधू शकतील. तुमचा फोन नंबर कधीही सर्वांना दिसणार नाही. तुम्ही कधीही "माझा डेटा काढा" म्हणू शकता. तुम्ही सहमत आहात का?',
    kn: 'ಶುರು ಮಾಡುವ ಮೊದಲು: ಹತ್ತಿರದ ಮಾಲೀಕರು ನಿಮ್ಮನ್ನು ಹುಡುಕಲು ನಿಮ್ಮ ಹೆಸರು, ಕೆಲಸ, ಪ್ರದೇಶ ಮತ್ತು ಕೂಲಿಯನ್ನು ನಾವು ಉಳಿಸುತ್ತೇವೆ. ನಿಮ್ಮ ಫೋನ್ ನಂಬರ್ ಎಲ್ಲರಿಗೂ ಕಾಣುವುದಿಲ್ಲ. ಯಾವಾಗ ಬೇಕಾದರೂ "ನನ್ನ ಡೇಟಾ ಅಳಿಸಿ" ಎಂದು ಹೇಳಬಹುದು. ನೀವು ಒಪ್ಪುತ್ತೀರಾ?',
  },
  askIntro: {
    en: 'Great! Now send me a voice note. Tell me your name, your work, your area, and how much you want per day.',
    hi: 'बहुत बढ़िया! अब मुझे एक वॉइस मैसेज भेजिए। अपना नाम, अपना काम, अपना इलाका, और रोज़ कितने पैसे चाहिए, बताइए।',
    mr: 'छान! आता मला एक व्हॉइस मेसेज पाठवा. तुमचं नाव, तुमचं काम, तुमचा परिसर आणि रोज किती पैसे हवेत ते सांगा.',
    kn: 'ಚೆನ್ನಾಗಿದೆ! ಈಗ ನನಗೆ ಒಂದು ವಾಯ್ಸ್ ಮೆಸೇಜ್ ಕಳುಹಿಸಿ. ನಿಮ್ಮ ಹೆಸರು, ನಿಮ್ಮ ಕೆಲಸ, ನಿಮ್ಮ ಪ್ರದೇಶ ಮತ್ತು ದಿನಕ್ಕೆ ಎಷ್ಟು ಹಣ ಬೇಕು ಎಂದು ಹೇಳಿ.',
  },
  listening: {
    en: 'Listening…',
    hi: 'सुन रहा हूँ…',
    mr: 'ऐकतोय…',
    kn: 'ಕೇಳುತ್ತಿದ್ದೇನೆ…',
  },
  confirmProfile: {
    en: (p: Params) => `${p.name}, you are a ${p.skill} in ${p.locality}, asking ${p.wage} rupees a day. Is that correct?`,
    hi: (p: Params) => `${p.name} जी, आप ${p.locality} में ${p.skill} हैं, और रोज़ ${p.wage} रुपये चाहते हैं। क्या यह सही है?`,
    mr: (p: Params) => `${p.name}, तुम्ही ${p.locality} मध्ये ${p.skill} आहात, आणि रोज ${p.wage} रुपये हवेत. हे बरोबर आहे का?`,
    kn: (p: Params) => `${p.name}, ನೀವು ${p.locality} ನಲ್ಲಿ ${p.skill}, ದಿನಕ್ಕೆ ${p.wage} ರೂಪಾಯಿ ಬೇಕು. ಇದು ಸರಿಯೇ?`,
  },
  profileMissing: {
    en: (p: Params) => `Sorry, I didn't catch your ${p.fields}. Please send one more voice note.`,
    hi: (p: Params) => `माफ़ कीजिए, मुझे आपका ${p.fields} समझ नहीं आया। कृपया एक और वॉइस मैसेज भेजिए।`,
    mr: (p: Params) => `माफ करा, मला तुमचं ${p.fields} समजलं नाही. कृपया अजून एक व्हॉइस मेसेज पाठवा.`,
    kn: (p: Params) => `ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ${p.fields} ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಇನ್ನೊಂದು ವಾಯ್ಸ್ ಮೆಸೇಜ್ ಕಳುಹಿಸಿ.`,
  },
  profileSaved: {
    en: 'Done! Your profile is live. I will send you a voice message whenever there is work near you.',
    hi: 'हो गया! आपकी प्रोफ़ाइल चालू है। आपके पास काम आते ही मैं आपको आवाज़ में बताऊँगा।',
    mr: 'झालं! तुमची प्रोफाइल सुरू झाली. जवळ काम आलं की मी तुम्हाला आवाजात सांगेन.',
    kn: 'ಆಯಿತು! ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಚಾಲೂ ಆಗಿದೆ. ನಿಮ್ಮ ಹತ್ತಿರ ಕೆಲಸ ಬಂದ ತಕ್ಷಣ ನಾನು ಧ್ವನಿಯಲ್ಲಿ ತಿಳಿಸುತ್ತೇನೆ.',
  },
  fixProfile: {
    en: 'No problem. Send a new voice note with the correct details.',
    hi: 'कोई बात नहीं। सही जानकारी के साथ एक नया वॉइस मैसेज भेजिए।',
    mr: 'काही हरकत नाही. बरोबर माहितीसह नवीन व्हॉइस मेसेज पाठवा.',
    kn: 'ಪರವಾಗಿಲ್ಲ. ಸರಿಯಾದ ಮಾಹಿತಿಯೊಂದಿಗೆ ಹೊಸ ವಾಯ್ಸ್ ಮೆಸೇಜ್ ಕಳುಹಿಸಿ.',
  },
  jobAlert: {
    en: (p: Params) =>
      `${p.name}, there is ${String(p.skill).toLowerCase()} work in ${p.locality}, ${p.distance} kilometres away. ${p.wage} rupees a day, for ${p.days} ${Number(p.days) === 1 ? "day" : "days"}, starting ${p.start}. Press Accept if you want it.`,
    hi: (p: Params) =>
      `${p.name} जी, ${p.locality} में ${p.distance} किलोमीटर दूर ${p.skill} का काम है। ${p.wage} रुपये रोज़, ${p.days} दिन के लिए, ${p.start} से। काम चाहिए तो "हाँ" दबाइए।`,
    mr: (p: Params) =>
      `${p.name}, ${p.locality} मध्ये ${p.distance} किलोमीटर अंतरावर ${p.skill}चं काम आहे. रोज ${p.wage} रुपये, ${p.days} ${Number(p.days) === 1 ? "दिवसासाठी" : "दिवसांसाठी"}, ${p.start} पासून. काम हवं असेल तर "हो" दाबा.`,
    kn: (p: Params) =>
      `${p.name}, ${p.locality} ನಲ್ಲಿ ${p.distance} ಕಿಲೋಮೀಟರ್ ದೂರದಲ್ಲಿ ${p.skill} ಕೆಲಸ ಇದೆ. ದಿನಕ್ಕೆ ${p.wage} ರೂಪಾಯಿ, ${p.days} ದಿನ, ${p.start} ಇಂದ. ಕೆಲಸ ಬೇಕಾದರೆ "ಹೌದು" ಒತ್ತಿ.`,
  },
  accepted: {
    en: (p: Params) => `Wonderful! The employer ${p.employer} has been told. Call them on ${p.phone}. All the best!`,
    hi: (p: Params) => `बहुत बढ़िया! मालिक ${p.employer} को बता दिया गया है। उन्हें ${p.phone} पर फ़ोन कीजिए। शुभकामनाएँ!`,
    mr: (p: Params) => `खूप छान! मालक ${p.employer} यांना कळवलं आहे. त्यांना ${p.phone} वर फोन करा. शुभेच्छा!`,
    kn: (p: Params) => `ತುಂಬಾ ಒಳ್ಳೆಯದು! ಮಾಲೀಕ ${p.employer} ಅವರಿಗೆ ತಿಳಿಸಲಾಗಿದೆ. ಅವರಿಗೆ ${p.phone} ಗೆ ಕರೆ ಮಾಡಿ. ಶುಭವಾಗಲಿ!`,
  },
  declined: {
    en: 'Okay, no problem. I will tell you about the next job.',
    hi: 'ठीक है, कोई बात नहीं। अगला काम आते ही बताऊँगा।',
    mr: 'ठीक आहे, काही हरकत नाही. पुढचं काम आलं की सांगेन.',
    kn: 'ಸರಿ, ಪರವಾಗಿಲ್ಲ. ಮುಂದಿನ ಕೆಲಸ ಬಂದಾಗ ತಿಳಿಸುತ್ತೇನೆ.',
  },
  alreadyFilled: {
    en: 'Sorry, this job has already been filled.',
    hi: 'माफ़ कीजिए, यह काम पहले ही भर चुका है।',
    mr: 'माफ करा, हे काम आधीच भरलं आहे.',
    kn: 'ಕ್ಷಮಿಸಿ, ಈ ಕೆಲಸ ಈಗಾಗಲೇ ಭರ್ತಿಯಾಗಿದೆ.',
  },
  deleted: {
    en: 'Your data has been deleted. Send /start anytime to join again.',
    hi: 'आपका डेटा हटा दिया गया है। फिर से जुड़ने के लिए कभी भी /start भेजिए।',
    mr: 'तुमचा डेटा काढून टाकला आहे. पुन्हा जोडण्यासाठी कधीही /start पाठवा.',
    kn: 'ನಿಮ್ಮ ಡೇಟಾ ಅಳಿಸಲಾಗಿದೆ. ಮತ್ತೆ ಸೇರಲು ಯಾವಾಗ ಬೇಕಾದರೂ /start ಕಳುಹಿಸಿ.',
  },
  error: {
    en: 'Sorry, something went wrong. Please try again.',
    hi: 'माफ़ कीजिए, कुछ गड़बड़ हो गई। कृपया फिर से कोशिश कीजिए।',
    mr: 'माफ करा, काहीतरी चुकलं. कृपया पुन्हा प्रयत्न करा.',
    kn: 'ಕ್ಷಮಿಸಿ, ಏನೋ ತಪ್ಪಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  },
  sttFailed: {
    en: "Sorry, I couldn't listen to voice notes right now. Please type it instead: your name, your work, your area and how much you want per day.",
    hi: 'माफ़ कीजिए, अभी मैं वॉइस मैसेज नहीं सुन पा रहा। कृपया लिखकर भेजिए: अपना नाम, काम, इलाका और रोज़ कितने पैसे चाहिए।',
    mr: 'माफ करा, आत्ता मी व्हॉइस मेसेज ऐकू शकत नाही. कृपया लिहून पाठवा: तुमचं नाव, काम, परिसर आणि रोज किती पैसे हवेत.',
    kn: 'ಕ್ಷಮಿಸಿ, ಈಗ ನಾನು ವಾಯ್ಸ್ ಮೆಸೇಜ್ ಕೇಳಲು ಆಗುತ್ತಿಲ್ಲ. ದಯವಿಟ್ಟು ಬರೆದು ಕಳುಹಿಸಿ: ನಿಮ್ಮ ಹೆಸರು, ಕೆಲಸ, ಪ್ರದೇಶ ಮತ್ತು ದಿನಕ್ಕೆ ಎಷ್ಟು ಹಣ ಬೇಕು.',
  },
  noJobsNearby: {
    en: 'There is no matching work near you right now. I will tell you as soon as something comes.',
    hi: 'अभी आपके पास कोई काम नहीं है। जैसे ही आएगा, मैं बताऊँगा।',
    mr: 'आत्ता तुमच्या जवळ काम नाही. काम येताच मी सांगेन.',
    kn: 'ಈಗ ನಿಮ್ಮ ಹತ್ತಿರ ಸರಿಯಾದ ಕೆಲಸ ಇಲ್ಲ. ಕೆಲಸ ಬಂದ ತಕ್ಷಣ ತಿಳಿಸುತ್ತೇನೆ.',
  },
  // Button labels
  btnCorrect: { en: '✅ Correct', hi: '✅ सही है', mr: '✅ बरोबर', kn: '✅ ಸರಿ' },
  btnFix: { en: '✏️ Fix', hi: '✏️ बदलें', mr: '✏️ बदला', kn: '✏️ ಬದಲಿಸಿ' },
  btnAgree: { en: 'I agree', hi: 'मैं सहमत हूँ', mr: 'मी सहमत आहे', kn: 'ನಾನು ಒಪ್ಪುತ್ತೇನೆ' },
  btnAccept: { en: '✅ Accept', hi: '✅ हाँ, काम चाहिए', mr: '✅ हो, काम हवं', kn: '✅ ಹೌದು, ಕೆಲಸ ಬೇಕು' },
  btnDecline: { en: 'Not interested', hi: 'नहीं चाहिए', mr: 'नको', kn: 'ಬೇಡ' },
  btnCall: { en: '📞 Call employer', hi: '📞 मालिक को फ़ोन', mr: '📞 मालकाला फोन', kn: '📞 ಮಾಲೀಕರಿಗೆ ಕರೆ' },
  // Field names for "missing" prompt
  fieldName: { en: 'name', hi: 'नाम', mr: 'नाव', kn: 'ಹೆಸರು' },
  fieldSkill: { en: 'work', hi: 'काम', mr: 'काम', kn: 'ಕೆಲಸ' },
  fieldLocality: { en: 'area', hi: 'इलाका', mr: 'परिसर', kn: 'ಪ್ರದೇಶ' },
  fieldWage: { en: 'daily wage', hi: 'रोज़ की मज़दूरी', mr: 'रोजची मजुरी', kn: 'ದಿನದ ಕೂಲಿ' },
  and: { en: 'and', hi: 'और', mr: 'आणि', kn: 'ಮತ್ತು' },
  today: { en: 'today', hi: 'आज', mr: 'आज', kn: 'ಇಂದು' },
  tomorrow: { en: 'tomorrow', hi: 'कल', mr: 'उद्या', kn: 'ನಾಳೆ' },
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
    locality: localityLabel(p.locality, lang),
    distance: p.distanceKm < 1 ? '1' : String(Math.round(p.distanceKm * 10) / 10),
    wage: p.wage,
    days: p.days,
    start: startLabel(p.startDate, lang, p.today),
  });
}
