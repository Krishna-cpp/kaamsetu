import { appendWebMessage, getCtx, handleUpdate, isLanguage, listWebMessages, type TgUpdate } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, route, tooMany } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Web chat fallback for the Telegram bot (/chat). Browser actions become Telegram-shaped updates and run
 * through the SAME bot handler; replies come back through the WebChannel (see core/adapters/web-channel.ts).
 *   GET  ?chatId=web_…&after=<id>            → { messages }
 *   POST { chatId, text, lang? }              → user text / command
 *   POST { chatId, callback, label, messageId } → inline-button press
 *   POST multipart: chatId, audio, duration, lang? → voice note
 */
const ChatId = z.string().regex(/^web_[a-z0-9]{8,32}$/);
const TextBody = z.object({ chatId: ChatId, text: z.string().min(1).max(1000), lang: z.string().max(8).optional() });
const CallbackBody = z.object({ chatId: ChatId, callback: z.string().min(1).max(64), label: z.string().max(80), messageId: z.number().int() });

const fromUser = (lang?: string | null) => {
  const code = lang?.slice(0, 2);
  return { id: 0, first_name: 'Web', language_code: isLanguage(code) ? code : undefined };
};

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const chatId = ChatId.parse(url.searchParams.get('chatId'));
  const after = Number(url.searchParams.get('after') ?? 0) || 0;
  return NextResponse.json({ messages: await listWebMessages(getCtx().repo, chatId, after) }, { headers: { 'cache-control': 'no-store' } });
});

export const POST = route(async (req: Request) => {
  if (!rateLimit(req, 'chat', 40)) return tooMany();
  const ctx = getCtx();
  const updateId = Date.now();
  let chatId: string;
  let update: TgUpdate;

  if ((req.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    const form = await req.formData();
    chatId = ChatId.parse(form.get('chatId'));
    const audio = form.get('audio');
    if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'missing_audio' }, { status: 400 });
    if (audio.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'audio_too_large' }, { status: 413 });
    const duration = Math.max(1, Math.round(Number(form.get('duration') ?? 1)));
    const mime = audio.type || 'audio/webm';
    const fileId = `voice/webchat/${chatId}/${updateId}.${mime.includes('ogg') ? 'ogg' : 'webm'}`;
    await ctx.storage.put(fileId, new Uint8Array(await audio.arrayBuffer()), mime);
    await appendWebMessage(ctx.repo, chatId, { from: 'user', kind: 'voice', text: '', audioUrl: null, duration, buttons: null });
    update = {
      update_id: updateId,
      message: { message_id: updateId, chat: { id: chatId }, from: fromUser(form.get('lang') as string | null), voice: { file_id: fileId, mime_type: mime, duration } },
    };
  } else {
    const body = (await req.json()) as unknown;
    const cb = CallbackBody.safeParse(body);
    if (cb.success) {
      chatId = cb.data.chatId;
      await appendWebMessage(ctx.repo, chatId, { from: 'user', kind: 'text', text: cb.data.label, audioUrl: null, duration: null, buttons: null });
      update = {
        update_id: updateId,
        callback_query: { id: `web:${updateId}`, from: fromUser(), message: { message_id: cb.data.messageId, chat: { id: chatId } }, data: cb.data.callback },
      };
    } else {
      const t = TextBody.parse(body);
      chatId = t.chatId;
      if (t.text !== '/start') await appendWebMessage(ctx.repo, chatId, { from: 'user', kind: 'text', text: t.text, audioUrl: null, duration: null, buttons: null });
      update = { update_id: updateId, message: { message_id: updateId, chat: { id: chatId }, from: fromUser(t.lang), text: t.text } };
    }
  }

  await handleUpdate(ctx, update);
  return NextResponse.json({ messages: await listWebMessages(ctx.repo, chatId, 0) }, { headers: { 'cache-control': 'no-store' } });
});
