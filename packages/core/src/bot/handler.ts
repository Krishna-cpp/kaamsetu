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

/* Minimal Telegram types (only what we use) */
export interface TgUser {
  id: number;
  first_name?: string;
  language_code?: string;
}
export interface TgMessage {
  message_id: number;
  chat: { id: number };
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
}

const DELETE_RE = /(delete my data|\/delete|डेटा हटा|डेटा मिटा|डेटा काढ|data hatao|data delete)/i;

async function getSession(ctx: Ctx, chatId: string): Promise<Session> {
  return ((await ctx.repo.getSession(chatId)) as Session | null) ?? {};
}
async function saveSession(ctx: Ctx, chatId: string, s: Session) {
  await ctx.repo.putSession(chatId, s as Record<string, unknown>);
}

/** Speak + show: voice note with the same text as caption (helps low-literacy users follow along). */
async function say(ctx: Ctx, chatId: string, lang: Language, text: string, buttons?: ButtonGrid, extra?: string) {
  const caption = extra ? `${text}\n\n${extra}` : text;
  try {
    await ctx.channel.sendChatAction?.(chatId, 'record_voice');
    const speech = await ctx.tts.speak(text, lang);
    if (speech) {
      await ctx.channel.sendVoice(chatId, speech.audio, { caption, buttons });
      return;
    }
  } catch (e) {
    console.warn('[bot] TTS failed, falling back to text:', (e as Error).message);
  }
  await ctx.channel.sendText(chatId, caption, buttons);
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
      audioUrl = await ctx.storage.put(`voice/${chatId}/${Date.now()}.ogg`, file.data, media.mime_type ?? 'audio/ogg').catch(() => null);
      const tr = await ctx.stt('worker').transcribe(file.data, {
        mimeType: media.mime_type ?? 'audio/ogg',
        filename: 'voice.ogg',
        languageHint: s.lang ?? null,
      });
      transcript = tr.text;
      detected = tr.language;
    }
  }
  if (!transcript || transcript.startsWith('/')) {
    await say(ctx, chatId, lang, t('askIntro', lang));
    return;
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
    locality: w.locality,
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
        await say(ctx, chatId, lang, t('profileSaved', lang), [[{ text: '🪪 KaamSetu ID', url: `${ctx.env.PUBLIC_BASE_URL}/w/${w.id}` }]]);
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
