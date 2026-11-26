import type { Env } from '../config';

export interface ChatButton {
  text: string;
  /** callback payload (≤64 bytes on Telegram) */
  data?: string;
  url?: string;
}
export type ButtonGrid = ChatButton[][];

/**
 * Messaging channel abstraction. Telegram today; WhatsApp Cloud API implements the same interface later
 * (interactive reply buttons ≈ inline keyboard; audio message ≈ voice).
 */
export interface ChatChannel {
  readonly name: 'telegram' | 'whatsapp' | 'web' | 'mock';
  sendText(chatId: string, text: string, buttons?: ButtonGrid): Promise<void>;
  sendVoice(chatId: string, audio: Uint8Array, opts?: { caption?: string; buttons?: ButtonGrid; mimeType?: string }): Promise<void>;
  sendChatAction?(chatId: string, action: 'typing' | 'record_voice' | 'upload_voice'): Promise<void>;
  /** A place on a map (Telegram: native venue card; web chat: mini map). */
  sendLocation?(chatId: string, place: { lat: number; lng: number; title: string; address: string }): Promise<void>;
  answerCallback?(callbackId: string, text?: string): Promise<void>;
  clearButtons?(chatId: string, messageId: number): Promise<void>;
  downloadFile?(fileId: string): Promise<{ data: Uint8Array; path: string }>;
}

export class MockChannel implements ChatChannel {
  readonly name = 'mock' as const;
  readonly sent: { chatId: string; kind: 'text' | 'voice' | 'location'; text: string; buttons?: ButtonGrid }[] = [];
  async sendText(chatId: string, text: string, buttons?: ButtonGrid) {
    this.sent.push({ chatId, kind: 'text', text, buttons });
    console.info(`[mock-channel] → ${chatId}: ${text}`);
  }
  async sendVoice(chatId: string, _audio: Uint8Array, opts?: { caption?: string; buttons?: ButtonGrid }) {
    this.sent.push({ chatId, kind: 'voice', text: opts?.caption ?? '', buttons: opts?.buttons });
    console.info(`[mock-channel] 🔊 → ${chatId}: ${opts?.caption ?? ''}`);
  }
  async sendLocation(chatId: string, place: { lat: number; lng: number; title: string; address: string }) {
    this.sent.push({ chatId, kind: 'location', text: `${place.title} · ${place.address}` });
  }
}

type TgResponse<T> = { ok: boolean; result?: T; description?: string };

export class TelegramChannel implements ChatChannel {
  readonly name = 'telegram' as const;
  constructor(private token: string) {}

  private url(method: string) {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  async call<T = unknown>(method: string, body: Record<string, unknown> | FormData): Promise<T> {
    const isForm = body instanceof FormData;
    const res = await fetch(this.url(method), {
      method: 'POST',
      headers: isForm ? undefined : { 'content-type': 'application/json' },
      body: isForm ? body : JSON.stringify(body),
    });
    const json = (await res.json()) as TgResponse<T>;
    if (!json.ok) throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
    return json.result as T;
  }

  private markup(buttons?: ButtonGrid) {
    if (!buttons?.length) return undefined;
    return {
      inline_keyboard: buttons.map((row) =>
        row.map((b) => (b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data ?? b.text })),
      ),
    };
  }

  async sendText(chatId: string, text: string, buttons?: ButtonGrid) {
    await this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', reply_markup: this.markup(buttons) });
  }

  async sendVoice(chatId: string, audio: Uint8Array, opts: { caption?: string; buttons?: ButtonGrid; mimeType?: string } = {}) {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('voice', new Blob([audio], { type: opts.mimeType ?? 'audio/mpeg' }), 'kaamsetu.mp3');
    if (opts.caption) {
      form.append('caption', opts.caption.slice(0, 1024));
      form.append('parse_mode', 'HTML');
    }
    const markup = this.markup(opts.buttons);
    if (markup) form.append('reply_markup', JSON.stringify(markup));
    await this.call('sendVoice', form);
  }

  async sendChatAction(chatId: string, action: 'typing' | 'record_voice' | 'upload_voice') {
    await this.call('sendChatAction', { chat_id: chatId, action }).catch(() => undefined);
  }

  async sendLocation(chatId: string, place: { lat: number; lng: number; title: string; address: string }) {
    await this.call('sendVenue', { chat_id: chatId, latitude: place.lat, longitude: place.lng, title: place.title, address: place.address });
  }

  async answerCallback(callbackId: string, text?: string) {
    await this.call('answerCallbackQuery', { callback_query_id: callbackId, text }).catch(() => undefined);
  }

  async clearButtons(chatId: string, messageId: number) {
    await this.call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }).catch(
      () => undefined,
    );
  }

  async downloadFile(fileId: string) {
    const file = await this.call<{ file_path: string }>('getFile', { file_id: fileId });
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${file.file_path}`);
    if (!res.ok) throw new Error(`Telegram file download ${res.status}`);
    return { data: new Uint8Array(await res.arrayBuffer()), path: file.file_path };
  }
}

export function createChannel(env: Env): ChatChannel {
  return !env.DEMO_MODE && env.TELEGRAM_BOT_TOKEN ? new TelegramChannel(env.TELEGRAM_BOT_TOKEN) : new MockChannel();
}
