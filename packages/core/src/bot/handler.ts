/**
 * Telegram conversation logic — one handler for every entry point
 * (local long-polling, AWS Lambda webhook, Next.js /api/telegram fallback).
 */
import type { ButtonGrid } from '../adapters/channel';
import type { Ctx } from '../context';
import { t } from '../i18n';
import { isLanguage, LANGUAGES, LANGUAGE_CODES, type Language } from '../languages';
import { detectLanguage } from '../extract-rules';
import { skillLabel } from '../skills';
import { localityLabel } from '../localities';
import {
  activateWorker,
  deleteWorkerData,
  jobsForWorker,
  matchAndAlert,
  missingFieldsText,
  registerWorker,
  respondToMatch,
  MatchError,
  ensureMatch,
  sendJobAlert,
} from '../services/workflows';
import { benefitsOf, ownProfileUrl, saveBenefits } from '../services/benefits';
import { ruleExtractProfile } from '../extract-rules';
import { onBenefitsCallback, onBenefitsText, startBenefits, type BenefitsSession, type FlowIO } from '../schemes/flow';
import { isBenefitsIntent, isStopBenefitsReminders } from '../schemes/keywords';
import { st } from '../schemes/strings';
import { speakTo } from './speak';

/* Minimal Telegram types (only what we use) */
export interface TgUser {
  id: number;
  first_name?: string;
  language_code?: string;
}
export interface TgMessage {
  message_id: number;
  /** number for Telegram; "web_…" string for the /chat web channel */
  chat: { id: number | string };
  from?: TgUser;
  text?: string;
  voice?: { file_id: string; mime_type?: string; duration: number };
  audio?: { file_id: string; mime_type?: string; duration: number };
  contact?: { phone_number: string };
}
export interface TgCallback {
  id: string;
  from: TgUser;
  message?: TgMessage;
  data?: string;
}
export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallback;
}

interface Session {
  lang?: Language;
  consent?: boolean;
  pendingTranscript?: string;
  pendingAudioUrl?: string | null;
  lastUpdateId?: number;
  /** opt-in Scheme Finder state (only set after the worker asked about benefits) */
  benefits?: BenefitsSession;
}

const DELETE_RE = /(delete my data|\/delete|डेटा हटा|डेटा मिटा|डेटा काढ|data hatao|data delete)/i;

async function getSession(ctx: Ctx, chatId: string): Promise<Session> {
  return ((await ctx.repo.getSession(chatId)) as Session | null) ?? {};
}
async function saveSession(ctx: Ctx, chatId: string, s: Session) {
  await ctx.repo.putSession(chatId, s as Record<string, unknown>);
}

/** Speak + show: voice note with the same text as caption (helps low-literacy users follow along). */
function say(ctx: Ctx, chatId: string, lang: Language, text: string, buttons?: ButtonGrid, extra?: string) {
  return speakTo(ctx, chatId, lang, text, buttons, extra);
}

/** Channel I/O for the Scheme Finder flow. */
function flowIO(ctx: Ctx, chatId: string, lang: Language): FlowIO {
  return {
    say: (text, buttons, extra) => say(ctx, chatId, lang, text, buttons, extra),
    text: (text, buttons) => ctx.channel.sendText(chatId, text, buttons),
    location: ctx.channel.sendLocation ? (p) => ctx.channel.sendLocation!(chatId, p) : undefined,
  };
}

const langButtons = (): ButtonGrid => [LANGUAGE_CODES.map((l) => ({ text: LANGUAGES[l].nativeName, data: `lang|${l}` }))];

export async function handleUpdate(ctx: Ctx, update: TgUpdate): Promise<void> {
  const chatIdNum = update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? update.callback_query?.from.id;
  if (chatIdNum === undefined) return;
  const chatId = String(chatIdNum);
  const session = await getSession(ctx, chatId);
  if (session.lastUpdateId && update.update_id <= session.lastUpdateId) return; // Telegram retry
  session.lastUpdateId = update.update_id;
  await saveSession(ctx, chatId, session);

  try {
    if (update.callback_query) await onCallback(ctx, chatId, session, update.callback_query);
    else if (update.message) await onMessage(ctx, chatId, session, update.message);
  } catch (e) {
    console.error('[bot] handler error', e);
    await ctx.channel.sendText(chatId, t('error', session.lang ?? 'hi')).catch(() => undefined);
  }
}

function guessLang(from?: TgUser): Language {
  const c = from?.language_code?.slice(0, 2);
  return isLanguage(c) ? c : 'hi';
}

async function onMessage(ctx: Ctx, chatId: string, s: Session, msg: TgMessage) {
  const text = msg.text?.trim() ?? '';
  const lang = s.lang ?? guessLang(msg.from);

  if (text === '/start' || text.startsWith('/start ')) {
    s.consent = false;
    await saveSession(ctx, chatId, s);
    await say(ctx, chatId, lang, t('welcome', lang), langButtons());
    return;
  }
  if (text === '/lang' || text === '/language') {
    await ctx.channel.sendText(chatId, t('welcome', lang), langButtons());
    return;
  }
  if (DELETE_RE.test(text)) {
    const w = await ctx.repo.getWorkerByChat(chatId);
    if (w) await deleteWorkerData(ctx, w.id);
    await saveSession(ctx, chatId, { lang, lastUpdateId: s.lastUpdateId });
    await say(ctx, chatId, lang, t('deleted', lang));
    return;
  }
  if (text === '/profile' || text === '/me') {
    const w = await ctx.repo.getWorkerByChat(chatId);
    if (w) await ctx.channel.sendText(chatId, `${ctx.env.PUBLIC_BASE_URL}/w/${w.id}`);
    else await say(ctx, chatId, lang, t('askIntro', lang));
    return;
  }
  if (text === '/jobs') {
    const w = await ctx.repo.getWorkerByChat(chatId);
    if (!w || w.status !== 'active') return say(ctx, chatId, lang, t('askIntro', lang));
    return offerNearbyJobs(ctx, w.id, true);
  }
  if (ctx.env.FEATURE_SCHEMES) {
    if (isStopBenefitsReminders(text)) {
      const w = await ctx.repo.getWorkerByChat(chatId);
      const l = w?.language ?? lang;
      if (w) await saveBenefits(ctx, w, { reminders: false });
      await ctx.channel.sendText(chatId, st('remindersOff', l));
      return;
    }
    if (text === '/benefits') {
      const w = await ctx.repo.getWorkerByChat(chatId);
      const l = s.lang ?? w?.language ?? lang;
      await startBenefits(ctx, w, l, s, flowIO(ctx, chatId, l));
      await saveSession(ctx, chatId, s);
      return;
    }
  }

  // Voice note (or typed intro) → profile
  const media = msg.voice ?? msg.audio;
  let transcript = text;
  let audioUrl: string | null = null;
  let detected: Language | null = null;
  if (media) {
    await ctx.channel.sendChatAction?.(chatId, 'typing');
    if (!ctx.channel.downloadFile) {
      transcript = (await ctx.stt('worker').transcribe(new Uint8Array(), { mimeType: 'audio/ogg', languageHint: s.lang })).text;
    } else {
      const file = await ctx.channel.downloadFile(media.file_id);
      // web-chat voice notes are already stored (file id = storage key); Telegram ones are archived here
      audioUrl = file.path.startsWith('voice/webchat/')
        ? null
        : await ctx.storage.put(`voice/${chatId}/${Date.now()}.ogg`, file.data, media.mime_type ?? 'audio/ogg').catch(() => null);
      try {
        const tr = await ctx.stt('worker').transcribe(file.data, {
          mimeType: media.mime_type ?? 'audio/ogg',
          filename: (media.mime_type ?? '').includes('webm') ? 'voice.webm' : 'voice.ogg',
          languageHint: s.lang ?? null,
        });
        transcript = tr.text;
        detected = tr.language;
      } catch (e) {
        // Speech service unavailable (e.g. quota): never guess a transcript, ask the worker to type instead.
        console.warn('[bot] STT failed:', (e as Error).message);
        await ctx.channel.sendText(chatId, t('sttFailed', lang));
        return;
      }
    }
  }
  if (!transcript || transcript.startsWith('/')) {
    await say(ctx, chatId, lang, t('askIntro', lang));
    return;
  }

  // Scheme Finder (opt-in): only when the worker is answering a question they agreed to, or asked about benefits
  if (ctx.env.FEATURE_SCHEMES) {
    const w = await ctx.repo.getWorkerByChat(chatId);
    const l = s.lang ?? w?.language ?? lang;
    if (s.benefits?.step && (await onBenefitsText(ctx, w, l, s, transcript, flowIO(ctx, chatId, l)))) {
      await saveSession(ctx, chatId, s);
      return;
    }
    // a registration intro that happens to mention a scheme word still registers (it names a trade)
    const isIntro = w?.status !== 'active' && ruleExtractProfile(transcript).skills.length > 0;
    if (isBenefitsIntent(transcript) && !isIntro) {
      await startBenefits(ctx, w, l, s, flowIO(ctx, chatId, l));
      await saveSession(ctx, chatId, s);
      return;
    }
  }

  const replyLang: Language = s.lang ?? detected ?? detectLanguage(transcript, lang);
  if (!s.consent) {
    // Hold the intro until the worker agrees to the data notice
    s.lang = replyLang;
    s.pendingTranscript = transcript;
    s.pendingAudioUrl = audioUrl;
    await saveSession(ctx, chatId, s);
    await say(ctx, chatId, replyLang, t('consent', replyLang), [[{ text: t('btnAgree', replyLang), data: 'consent|yes' }]]);
    return;
  }
  await processIntro(ctx, chatId, s, transcript, audioUrl, replyLang);
}

async function processIntro(ctx: Ctx, chatId: string, s: Session, transcript: string, audioUrl: string | null, lang: Language) {
  const res = await registerWorker(ctx, {
    transcript,
    languageHint: s.lang ?? lang,
    channel: 'telegram',
    chatId,
    status: 'pending',
    introAudioUrl: audioUrl,
  });
  if (!res.worker) {
    await say(ctx, chatId, lang, t('profileMissing', lang, { fields: missingFieldsText(res.missing, lang) }), undefined, `🗣️ <i>${escapeHtml(transcript)}</i>`);
    return;
  }
  const w = res.worker;
  const spoken = t('confirmProfile', lang, {
    name: w.name.split(' ')[0] ?? w.name,
    skill: w.skills.map((k) => skillLabel(k, lang)).join(', '),
    locality: localityLabel(w.locality, lang),
    wage: w.expectedWage,
  });
  const card =
    `🗣️ <i>${escapeHtml(transcript)}</i>\n\n` +
    `<b>${escapeHtml(w.name)}</b>\n` +
    `🛠 ${w.skills.map((k) => skillLabel(k, lang)).join(' · ')}\n` +
    `📍 ${escapeHtml(w.locality)}\n` +
    `₹${w.expectedWage}/day${w.experienceYears ? ` · ${w.experienceYears} yrs` : ''}`;
  await say(ctx, chatId, lang, spoken, [[{ text: t('btnCorrect', lang), data: `prof|ok|${w.id}` }, { text: t('btnFix', lang), data: `prof|fix|${w.id}` }]], card);
}

async function offerNearbyJobs(ctx: Ctx, workerId: string, sayNone: boolean) {
  const w = await ctx.repo.getWorker(workerId);
  if (!w?.chatId) return;
  const jobs = await jobsForWorker(ctx, w, 1);
  const top = jobs[0];
  if (!top) {
    if (sayNone) await say(ctx, w.chatId, w.language, t('noJobsNearby', w.language));
    return;
  }
  const m = await ensureMatch(ctx, w, top.job);
  await sendJobAlert(ctx, w, top.job, m);
}

async function onCallback(ctx: Ctx, chatId: string, s: Session, cb: TgCallback) {
  const [kind, a, b] = (cb.data ?? '').split('|');
  const lang = s.lang ?? guessLang(cb.from);
  await ctx.channel.answerCallback?.(cb.id);

  switch (kind) {
    case 'ben': {
      if (!ctx.env.FEATURE_SCHEMES) return;
      const w = await ctx.repo.getWorkerByChat(chatId);
      const l = s.lang ?? w?.language ?? lang;
      if (cb.message && (a === 'start' || a === 'later' || a === 'ans' || a === 'skip')) await ctx.channel.clearButtons?.(chatId, cb.message.message_id);
      await onBenefitsCallback(ctx, w, l, s, (cb.data ?? '').split('|'), flowIO(ctx, chatId, l));
      await saveSession(ctx, chatId, s);
      return;
    }
    case 'lang': {
      if (!isLanguage(a)) return;
      s.lang = a;
      await saveSession(ctx, chatId, s);
      if (cb.message) await ctx.channel.clearButtons?.(chatId, cb.message.message_id);
      if (!s.consent) await say(ctx, chatId, a, t('consent', a), [[{ text: t('btnAgree', a), data: 'consent|yes' }]]);
      else await say(ctx, chatId, a, t('askIntro', a));
      return;
    }
    case 'consent': {
      s.consent = true;
      const pending = s.pendingTranscript;
      const pendingAudio = s.pendingAudioUrl ?? null;
      delete s.pendingTranscript;
      delete s.pendingAudioUrl;
      await saveSession(ctx, chatId, s);
      if (cb.message) await ctx.channel.clearButtons?.(chatId, cb.message.message_id);
      if (pending) await processIntro(ctx, chatId, s, pending, pendingAudio, lang);
      else await say(ctx, chatId, lang, t('askIntro', lang));
      return;
    }
    case 'prof': {
      if (cb.message) await ctx.channel.clearButtons?.(chatId, cb.message.message_id);
      if (a === 'ok' && b) {
        const w = await activateWorker(ctx, b);
        if (!w) return;
        // Scheme Finder: ONE extra line in the same voice message, once per worker. No question, no follow-up.
        const showTip = ctx.env.FEATURE_SCHEMES && !benefitsOf(w).tipShown;
        const saved = showTip ? `${t('profileSaved', lang)} ${st('tip', lang)}` : t('profileSaved', lang);
        if (showTip) await saveBenefits(ctx, w, { tipShown: true });
        const idUrl = ctx.env.FEATURE_SCHEMES ? ownProfileUrl(ctx, w.id) : `${ctx.env.PUBLIC_BASE_URL}/w/${w.id}`;
        await say(ctx, chatId, lang, saved, [[{ text: '🪪 KaamSetu ID', url: idUrl }]]);
        await offerNearbyJobs(ctx, w.id, false);
      } else {
        await say(ctx, chatId, lang, t('fixProfile', lang));
      }
      return;
    }
    case 'acc':
    case 'dec': {
      if (!a) return;
      if (cb.message) await ctx.channel.clearButtons?.(chatId, cb.message.message_id);
      try {
        const { job } = await respondToMatch(ctx, a, kind === 'acc' ? 'accepted' : 'declined');
        if (kind === 'acc') {
          await say(ctx, chatId, lang, t('accepted', lang, { employer: job.employer.name, phone: job.employer.phone ?? '—' }), undefined,
            `<b>JOB #${job.code}</b> · ${escapeHtml(job.employer.name)}\n📞 ${job.employer.phone ?? '—'}\n📍 ${escapeHtml(job.locality)} · ${job.startDate}`);
        } else {
          await say(ctx, chatId, lang, t('declined', lang));
        }
      } catch (e) {
        if (e instanceof MatchError && e.code === 'filled') await say(ctx, chatId, lang, t('alreadyFilled', lang));
        else throw e;
      }
      return;
    }
    case 'call': {
      if (!a) return;
      const { job } = await respondToMatch(ctx, a, 'viewed');
      await ctx.channel.sendText(chatId, `📞 <b>${escapeHtml(job.employer.name)}</b>: ${job.employer.phone ?? '—'}\nJOB #${job.code}`);
      return;
    }
  }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Re-export for entry points that want to trigger matching manually. */
export { matchAndAlert };
