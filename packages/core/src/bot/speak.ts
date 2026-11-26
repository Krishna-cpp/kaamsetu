import type { ButtonGrid } from '../adapters/channel';
import type { Ctx } from '../context';
import type { Language } from '../languages';

/**
 * Speak + show: a voice note whose caption is the same text (helps low-literacy users follow along).
 * TTS is cached by text hash in storage, so a repeated phrase never spends credits twice.
 * Falls back to plain text if TTS is unavailable.
 */
export async function speakTo(ctx: Ctx, chatId: string, lang: Language, text: string, buttons?: ButtonGrid, extra?: string) {
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

/** Like speakTo, but only uses audio that is already cached (reminders must never spend TTS credits). */
export async function speakCachedOrText(ctx: Ctx, chatId: string, lang: Language, text: string, buttons?: ButtonGrid) {
  const hit = await ctx.tts.cached?.(text, lang).catch(() => null);
  if (hit) await ctx.channel.sendVoice(chatId, hit.audio, { caption: text, buttons });
  else await ctx.channel.sendText(chatId, text, buttons);
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
