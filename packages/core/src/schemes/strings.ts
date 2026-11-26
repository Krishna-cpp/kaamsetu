/** Copy for the opt-in Scheme Finder. Spoken first (cached TTS), read second. Always "may be eligible". */
import type { Language } from '../languages';

type P = Record<string, string | number>;
type T = string | ((p: P) => string);

export const SCHEME_STRINGS = {
  tip: {
    en: "Tip: I can also tell you which government benefits you may get. Just say 'benefits' or tap /benefits anytime.",
    hi: "एक बात: मैं यह भी बता सकता हूँ कि आपको कौन से सरकारी लाभ मिल सकते हैं। कभी भी 'योजना' बोलिए या /benefits दबाइए।",
    mr: "एक गोष्ट: तुम्हाला कोणते सरकारी लाभ मिळू शकतात हेही मी सांगू शकतो. कधीही 'योजना' म्हणा किंवा /benefits दाबा.",
    kn: "ಒಂದು ಸಲಹೆ: ನಿಮಗೆ ಯಾವ ಸರ್ಕಾರಿ ಸೌಲಭ್ಯಗಳು ಸಿಗಬಹುದು ಎಂದು ನಾನು ಹೇಳಬಲ್ಲೆ. ಯಾವಾಗ ಬೇಕಾದರೂ 'ಯೋಜನೆ' ಎಂದು ಹೇಳಿ ಅಥವಾ /benefits ಒತ್ತಿ.",
  },
  explain: {
    en: "I can check about 8 government schemes for you: insurance, pension, the e-Shram card and the construction welfare board. I need to ask 3-4 quick questions (age, bank account, PF). No Aadhaar or bank details needed. Shall we start?",
    hi: 'मैं आपके लिए करीब 8 सरकारी योजनाएँ जाँच सकता हूँ: बीमा, पेंशन, ई-श्रम कार्ड और निर्माण मज़दूर कल्याण बोर्ड। इसके लिए 3-4 छोटे सवाल पूछूँगा (उम्र, बैंक खाता, PF)। आधार या बैंक की जानकारी नहीं चाहिए। शुरू करें?',
    mr: 'मी तुमच्यासाठी सुमारे 8 सरकारी योजना तपासू शकतो: विमा, पेन्शन, ई-श्रम कार्ड आणि बांधकाम कामगार कल्याण मंडळ. त्यासाठी 3-4 छोटे प्रश्न विचारेन (वय, बँक खाते, PF). आधार किंवा बँकेची माहिती नको. सुरू करूया?',
    kn: 'ನಾನು ನಿಮಗಾಗಿ ಸುಮಾರು 8 ಸರ್ಕಾರಿ ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಬಲ್ಲೆ: ವಿಮೆ, ಪಿಂಚಣಿ, ಇ-ಶ್ರಮ್ ಕಾರ್ಡ್ ಮತ್ತು ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಕಲ್ಯಾಣ ಮಂಡಳಿ. 3-4 ಸಣ್ಣ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳುತ್ತೇನೆ (ವಯಸ್ಸು, ಬ್ಯಾಂಕ್ ಖಾತೆ, PF). ಆಧಾರ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ವಿವರ ಬೇಕಿಲ್ಲ. ಶುರು ಮಾಡೋಣವೇ?',
  },
  privacy: {
    en: "This is only to check benefits. We don't need Aadhaar or bank details.",
    hi: 'यह सिर्फ़ लाभ जाँचने के लिए है। हमें आधार या बैंक की जानकारी नहीं चाहिए।',
    mr: 'हे फक्त लाभ तपासण्यासाठी आहे. आम्हाला आधार किंवा बँकेची माहिती नको.',
    kn: 'ಇದು ಸೌಲಭ್ಯಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಮಾತ್ರ. ನಮಗೆ ಆಧಾರ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ವಿವರ ಬೇಕಿಲ್ಲ.',
  },
  needProfile: {
    en: 'First, let me set up your work profile: send a voice note with your name, work, area and daily wage. Then I can check benefits for you.',
    hi: 'पहले आपकी काम की प्रोफ़ाइल बना लेते हैं: अपना नाम, काम, इलाका और रोज़ की मज़दूरी बोलकर भेजिए। फिर मैं योजनाएँ जाँच दूँगा।',
    mr: 'आधी तुमची कामाची प्रोफाइल बनवूया: तुमचं नाव, काम, परिसर आणि रोजची मजुरी बोलून पाठवा. मग मी योजना तपासतो.',
    kn: 'ಮೊದಲು ನಿಮ್ಮ ಕೆಲಸದ ಪ್ರೊಫೈಲ್ ಮಾಡೋಣ: ನಿಮ್ಮ ಹೆಸರು, ಕೆಲಸ, ಪ್ರದೇಶ ಮತ್ತು ದಿನದ ಕೂಲಿ ಹೇಳಿ ಕಳುಹಿಸಿ. ನಂತರ ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತೇನೆ.',
  },
  later: {
    en: "No problem. Say 'benefits' whenever you want to check. Your answers so far are saved.",
    hi: "कोई बात नहीं। जब चाहें 'योजना' बोलिए। अब तक के जवाब सेव हैं।",
    mr: "काही हरकत नाही. हवे तेव्हा 'योजना' म्हणा. आतापर्यंतची उत्तरे जतन आहेत.",
    kn: "ಪರವಾಗಿಲ್ಲ. ಬೇಕಾದಾಗ 'ಯೋಜನೆ' ಎಂದು ಹೇಳಿ. ಇಲ್ಲಿಯವರೆಗಿನ ಉತ್ತರಗಳು ಉಳಿದಿವೆ.",
  },
  qAge: { en: 'How old are you?', hi: 'आपकी उम्र कितनी है?', mr: 'तुमचं वय किती आहे?', kn: 'ನಿಮ್ಮ ವಯಸ್ಸು ಎಷ್ಟು?' },
  qBank: { en: 'Do you have a bank account?', hi: 'क्या आपका बैंक खाता है?', mr: 'तुमचं बँक खाते आहे का?', kn: 'ನಿಮಗೆ ಬ್ಯಾಂಕ್ ಖಾತೆ ಇದೆಯೇ?' },
  qPf: { en: 'Is PF or ESI money cut from your pay?', hi: 'क्या आपकी तनख़्वाह से PF या ESI कटता है?', mr: 'तुमच्या पगारातून PF किंवा ESI कापले जाते का?', kn: 'ನಿಮ್ಮ ಸಂಬಳದಿಂದ PF ಅಥವಾ ESI ಕಡಿತವಾಗುತ್ತದೆಯೇ?' },
  qTax: { en: 'Do you pay income tax?', hi: 'क्या आप इनकम टैक्स भरते हैं?', mr: 'तुम्ही आयकर भरता का?', kn: 'ನೀವು ಆದಾಯ ತೆರಿಗೆ ಕಟ್ಟುತ್ತೀರಾ?' },
  qIncome: { en: 'About how much do you earn in a month?', hi: 'महीने में लगभग कितना कमाते हैं?', mr: 'महिन्याला साधारण किती कमावता?', kn: 'ತಿಂಗಳಿಗೆ ಸುಮಾರು ಎಷ್ಟು ಸಂಪಾದಿಸುತ್ತೀರಿ?' },
  didNotGet: {
    en: 'Sorry, I did not get that. Please tap a button, or say it again.',
    hi: 'माफ़ कीजिए, समझ नहीं आया। कृपया बटन दबाइए या फिर से बोलिए।',
    mr: 'माफ करा, समजलं नाही. कृपया बटण दाबा किंवा पुन्हा सांगा.',
    kn: 'ಕ್ಷಮಿಸಿ, ಅರ್ಥವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಬಟನ್ ಒತ್ತಿ ಅಥವಾ ಮತ್ತೆ ಹೇಳಿ.',
  },
  summary: {
    en: (p: P) => `${p.name}, you may be eligible for ${p.n} benefits. ${p.top}. Here are the details and what to carry.`,
    hi: (p: P) => `${p.name} जी, आपको ${p.n} लाभ मिल सकते हैं। ${p.top}। नीचे पूरी जानकारी और ज़रूरी कागज़ात हैं।`,
    mr: (p: P) => `${p.name}, तुम्हाला ${p.n} लाभ मिळू शकतात. ${p.top}. खाली पूर्ण माहिती आणि लागणारी कागदपत्रे आहेत.`,
    kn: (p: P) => `${p.name}, ನಿಮಗೆ ${p.n} ಸೌಲಭ್ಯಗಳು ಸಿಗಬಹುದು. ${p.top}. ಕೆಳಗೆ ಪೂರ್ಣ ವಿವರ ಮತ್ತು ಬೇಕಾದ ದಾಖಲೆಗಳಿವೆ.`,
  },
  summaryNone: {
    en: (p: P) => `${p.name}, I could not find a scheme you may be eligible for right now. Answering the skipped questions may help.`,
    hi: (p: P) => `${p.name} जी, अभी कोई ऐसी योजना नहीं मिली जिसके आप पात्र हो सकें। छोड़े गए सवालों के जवाब देने से मदद मिल सकती है।`,
    mr: (p: P) => `${p.name}, आत्ता तुम्ही पात्र ठरू शकाल अशी योजना सापडली नाही. सोडलेल्या प्रश्नांची उत्तरे दिल्यास मदत होईल.`,
    kn: (p: P) => `${p.name}, ಈಗ ನೀವು ಅರ್ಹರಾಗಬಹುದಾದ ಯೋಜನೆ ಸಿಗಲಿಲ್ಲ. ಬಿಟ್ಟ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿದರೆ ಸಹಾಯವಾಗಬಹುದು.`,
  },
  janDhan: {
    en: 'First: a free Jan Dhan bank account unlocks most of these schemes. Any bank branch or CSC can open one with just your Aadhaar.',
    hi: 'पहले यह: मुफ़्त जन धन बैंक खाता ज़्यादातर योजनाओं का रास्ता खोलता है। कोई भी बैंक शाखा या CSC सिर्फ़ आधार से खाता खोल देती है।',
    mr: 'आधी हे: मोफत जन धन बँक खाते बहुतेक योजनांचा मार्ग उघडते. कोणतीही बँक शाखा किंवा CSC फक्त आधारवर खाते उघडते.',
    kn: 'ಮೊದಲು: ಉಚಿತ ಜನ್ ಧನ್ ಬ್ಯಾಂಕ್ ಖಾತೆ ಹೆಚ್ಚಿನ ಯೋಜನೆಗಳಿಗೆ ದಾರಿ ತೆರೆಯುತ್ತದೆ. ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಶಾಖೆ ಅಥವಾ CSC ಆಧಾರ್‌ನಿಂದಲೇ ಖಾತೆ ತೆರೆಯುತ್ತದೆ.',
  },
  maybeEligible: { en: 'You may be eligible', hi: 'आप पात्र हो सकते हैं', mr: 'तुम्ही पात्र असू शकता', kn: 'ನೀವು ಅರ್ಹರಾಗಿರಬಹುದು' },
  checkFirst: { en: 'Worth checking', hi: 'जाँचने लायक', mr: 'तपासण्यासारखे', kn: 'ಪರಿಶೀಲಿಸಲು ಯೋಗ್ಯ' },
  why: { en: 'Why', hi: 'क्यों', mr: 'का', kn: 'ಏಕೆ' },
  carry: { en: 'Carry', hi: 'साथ लाएँ', mr: 'सोबत आणा', kn: 'ತನ್ನಿ' },
  notNow: { en: 'Not for you right now', hi: 'अभी आपके लिए नहीं', mr: 'आत्ता तुमच्यासाठी नाही', kn: 'ಈಗ ನಿಮಗೆ ಅಲ್ಲ' },
  needMore: { en: 'Need one more answer', hi: 'एक और जवाब चाहिए', mr: 'अजून एक उत्तर हवे', kn: 'ಇನ್ನೊಂದು ಉತ್ತರ ಬೇಕು' },
  nearest: {
    en: (p: P) => `Nearest help centre: ${p.name}, ${p.area} (${p.km} km). Sample location; please confirm timings.`,
    hi: (p: P) => `सबसे पास सहायता केंद्र: ${p.name}, ${p.area} (${p.km} किमी)। नमूना जगह; समय पहले पूछ लें।`,
    mr: (p: P) => `जवळचे मदत केंद्र: ${p.name}, ${p.area} (${p.km} किमी). नमुना ठिकाण; वेळ आधी विचारा.`,
    kn: (p: P) => `ಹತ್ತಿರದ ಸಹಾಯ ಕೇಂದ್ರ: ${p.name}, ${p.area} (${p.km} ಕಿ.ಮೀ). ಮಾದರಿ ಸ್ಥಳ; ಸಮಯವನ್ನು ಮೊದಲು ಕೇಳಿ.`,
  },
  disclaimer: {
    en: 'This is guidance, not an official decision. The final check is done by the scheme office.',
    hi: 'यह सिर्फ़ मार्गदर्शन है, सरकारी फ़ैसला नहीं। अंतिम जाँच योजना कार्यालय करेगा।',
    mr: 'हे फक्त मार्गदर्शन आहे, सरकारी निर्णय नाही. अंतिम तपासणी योजना कार्यालय करेल.',
    kn: 'ಇದು ಮಾರ್ಗದರ್ಶನ ಮಾತ್ರ, ಅಧಿಕೃತ ನಿರ್ಧಾರವಲ್ಲ. ಅಂತಿಮ ಪರಿಶೀಲನೆಯನ್ನು ಯೋಜನಾ ಕಚೇರಿ ಮಾಡುತ್ತದೆ.',
  },
  appliedSaved: {
    en: (p: P) => `Noted: you applied for ${p.scheme}. I will remind you before renewal. Reply STOP BENEFITS to turn reminders off.`,
    hi: (p: P) => `नोट कर लिया: आपने ${p.scheme} के लिए आवेदन किया। रिन्यू से पहले याद दिलाऊँगा। रिमाइंडर बंद करने के लिए STOP BENEFITS लिखें।`,
    mr: (p: P) => `नोंद केली: तुम्ही ${p.scheme} साठी अर्ज केला. नूतनीकरणाआधी आठवण करून देईन. आठवण बंद करण्यासाठी STOP BENEFITS लिहा.`,
    kn: (p: P) => `ಗುರುತಿಸಿದೆ: ನೀವು ${p.scheme} ಗೆ ಅರ್ಜಿ ಹಾಕಿದ್ದೀರಿ. ನವೀಕರಣದ ಮೊದಲು ನೆನಪಿಸುತ್ತೇನೆ. ನೆನಪಿಕೆ ನಿಲ್ಲಿಸಲು STOP BENEFITS ಎಂದು ಬರೆಯಿರಿ.`,
  },
  bocw90: {
    en: "You've now worked 90+ days in construction this year, so you may qualify for the construction welfare board. Want the checklist?",
    hi: 'इस साल आपने निर्माण में 90 से ज़्यादा दिन काम कर लिया है, इसलिए आप निर्माण मज़दूर कल्याण बोर्ड के पात्र हो सकते हैं। ज़रूरी कागज़ात की सूची चाहिए?',
    mr: 'या वर्षी तुम्ही बांधकामात 90 पेक्षा जास्त दिवस काम केले आहे, त्यामुळे तुम्ही बांधकाम कामगार कल्याण मंडळासाठी पात्र असू शकता. कागदपत्रांची यादी हवी?',
    kn: 'ಈ ವರ್ಷ ನೀವು ಕಟ್ಟಡ ಕೆಲಸದಲ್ಲಿ 90 ಕ್ಕೂ ಹೆಚ್ಚು ದಿನ ಕೆಲಸ ಮಾಡಿದ್ದೀರಿ, ಆದ್ದರಿಂದ ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಕಲ್ಯಾಣ ಮಂಡಳಿಗೆ ಅರ್ಹರಾಗಬಹುದು. ದಾಖಲೆಗಳ ಪಟ್ಟಿ ಬೇಕೇ?',
  },
  reminderPmjjby: {
    en: 'Reminder: your PMJJBY and PMSBY insurance renews on 1 June. Keep enough balance in your bank account. Reply STOP BENEFITS to turn these off.',
    hi: 'याद दिलाना: आपका PMJJBY और PMSBY बीमा 1 जून को रिन्यू होगा। बैंक खाते में पैसे रखें। इन्हें बंद करने के लिए STOP BENEFITS लिखें।',
    mr: 'आठवण: तुमचा PMJJBY आणि PMSBY विमा 1 जूनला नूतनीकरण होईल. बँक खात्यात पैसे ठेवा. हे बंद करण्यासाठी STOP BENEFITS लिहा.',
    kn: 'ನೆನಪಿಕೆ: ನಿಮ್ಮ PMJJBY ಮತ್ತು PMSBY ವಿಮೆ ಜೂನ್ 1 ರಂದು ನವೀಕರಣವಾಗುತ್ತದೆ. ಬ್ಯಾಂಕ್ ಖಾತೆಯಲ್ಲಿ ಹಣ ಇಡಿ. ಇವನ್ನು ನಿಲ್ಲಿಸಲು STOP BENEFITS ಎಂದು ಬರೆಯಿರಿ.',
  },
  reminderBocw: {
    en: (p: P) => `Reminder: your construction welfare board registration is due for renewal by ${p.date}. Reply STOP BENEFITS to turn these off.`,
    hi: (p: P) => `याद दिलाना: आपका निर्माण मज़दूर बोर्ड पंजीकरण ${p.date} तक रिन्यू कराना है। इन्हें बंद करने के लिए STOP BENEFITS लिखें।`,
    mr: (p: P) => `आठवण: तुमच्या बांधकाम कामगार मंडळ नोंदणीचे नूतनीकरण ${p.date} पर्यंत करायचे आहे. हे बंद करण्यासाठी STOP BENEFITS लिहा.`,
    kn: (p: P) => `ನೆನಪಿಕೆ: ನಿಮ್ಮ ಕಟ್ಟಡ ಕಾರ್ಮಿಕರ ಮಂಡಳಿ ನೋಂದಣಿಯನ್ನು ${p.date} ರೊಳಗೆ ನವೀಕರಿಸಬೇಕು. ಇವನ್ನು ನಿಲ್ಲಿಸಲು STOP BENEFITS ಎಂದು ಬರೆಯಿರಿ.`,
  },
  remindersOff: {
    en: 'Done. I will not send benefit reminders any more. You can still say "benefits" anytime.',
    hi: 'हो गया। अब योजना के रिमाइंडर नहीं भेजूँगा। आप कभी भी "योजना" बोल सकते हैं।',
    mr: 'झालं. आता योजनांच्या आठवणी पाठवणार नाही. तुम्ही कधीही "योजना" म्हणू शकता.',
    kn: 'ಆಯಿತು. ಇನ್ನು ಯೋಜನೆಯ ನೆನಪಿಕೆಗಳನ್ನು ಕಳುಹಿಸುವುದಿಲ್ಲ. ಯಾವಾಗ ಬೇಕಾದರೂ "ಯೋಜನೆ" ಎಂದು ಹೇಳಬಹುದು.',
  },
  workRecord: { en: '🗂 My work record', hi: '🗂 मेरा काम का रिकॉर्ड', mr: '🗂 माझा कामाचा रेकॉर्ड', kn: '🗂 ನನ್ನ ಕೆಲಸದ ದಾಖಲೆ' },
  // buttons
  bStart: { en: 'Start', hi: 'शुरू करें', mr: 'सुरू करा', kn: 'ಶುರು ಮಾಡಿ' },
  bNotNow: { en: 'Not now', hi: 'अभी नहीं', mr: 'आत्ता नको', kn: 'ಈಗ ಬೇಡ' },
  bSkip: { en: 'Skip', hi: 'छोड़ें', mr: 'वगळा', kn: 'ಬಿಡಿ' },
  bYes: { en: 'Yes', hi: 'हाँ', mr: 'हो', kn: 'ಹೌದು' },
  bNo: { en: 'No', hi: 'नहीं', mr: 'नाही', kn: 'ಇಲ್ಲ' },
  bDontKnow: { en: "Don't know", hi: 'पता नहीं', mr: 'माहीत नाही', kn: 'ಗೊತ್ತಿಲ್ಲ' },
  bUpto15k: { en: 'Up to ₹15,000', hi: '₹15,000 तक', mr: '₹15,000 पर्यंत', kn: '₹15,000 ವರೆಗೆ' },
  bAbove15k: { en: 'More than ₹15,000', hi: '₹15,000 से ज़्यादा', mr: '₹15,000 पेक्षा जास्त', kn: '₹15,000 ಕ್ಕಿಂತ ಹೆಚ್ಚು' },
  bUpdate: { en: 'Update my answers', hi: 'जवाब बदलें', mr: 'उत्तरे बदला', kn: 'ಉತ್ತರ ಬದಲಿಸಿ' },
  bOfficial: { en: '🔗 Official site', hi: '🔗 आधिकारिक साइट', mr: '🔗 अधिकृत साइट', kn: '🔗 ಅಧಿಕೃತ ತಾಣ' },
  bApplied: { en: '✅ I applied', hi: '✅ मैंने आवेदन किया', mr: '✅ मी अर्ज केला', kn: '✅ ನಾನು ಅರ್ಜಿ ಹಾಕಿದೆ' },
  bChecklist: { en: '📋 Show checklist', hi: '📋 सूची दिखाएँ', mr: '📋 यादी दाखवा', kn: '📋 ಪಟ್ಟಿ ತೋರಿಸಿ' },
} satisfies Record<string, Record<Language, T>>;

export type SchemeStringKey = keyof typeof SCHEME_STRINGS;
export function st(key: SchemeStringKey, lang: Language, p: P = {}): string {
  const e = SCHEME_STRINGS[key][lang] as T;
  return typeof e === 'function' ? e(p) : e;
}
