/**
 * Web chat channel: the same bot conversation (bot/handler.ts) delivered to a browser at /chat.
 * Messages live in the repo (session key `webchat:<chatId>`); bot voice notes go to storage under
 * `audio/webchat/…` (publicly readable). A RoutingChannel sends `web_…` chat ids here and everything
 * else to Telegram, so employer job alerts reach web-chat workers too.
 */
import type { Repo } from '../store/repo';
import type { ButtonGrid, ChatChannel } from './channel';
import type { StorageAdapter } from './storage';

export const WEBCHAT_PREFIX = 'web_';
export const isWebChat = (chatId: string) => chatId.startsWith(WEBCHAT_PREFIX);

export interface WebChatMessage {
  id: number;
  from: 'bot' | 'user';
  kind: 'text' | 'voice' | 'location';
  /** Telegram-style HTML subset (<b>, <i>) for bot messages; plain text for user messages */
  text: string;
  audioUrl: string | null;
  /** voice-note length in seconds (user voice notes) */
  duration: number | null;
  buttons: ButtonGrid | null;
  /** kind=location: a place to show on a mini map */
  location?: { lat: number; lng: number; title: string; address: string } | null;
  at: string;
}

const MAX_MESSAGES = 200;
const key = (chatId: string) => `webchat:${chatId}`;

async function load(repo: Repo, chatId: string): Promise<WebChatMessage[]> {
  const s = await repo.getSession(key(chatId));
  return (s?.messages as WebChatMessage[] | undefined) ?? [];
}

export async function appendWebMessage(repo: Repo, chatId: string, msg: Omit<WebChatMessage, 'id' | 'at'>): Promise<WebChatMessage> {
  const messages = await load(repo, chatId);
  const next: WebChatMessage = { ...msg, id: (messages[messages.length - 1]?.id ?? 0) + 1, at: new Date().toISOString() };
  await repo.putSession(key(chatId), { messages: [...messages, next].slice(-MAX_MESSAGES) });
  return next;
}

export async function listWebMessages(repo: Repo, chatId: string, after = 0): Promise<WebChatMessage[]> {
  return (await load(repo, chatId)).filter((m) => m.id > after);
}

export class WebChannel implements ChatChannel {
  readonly name = 'web' as const;
  constructor(
    private repo: Repo,
    private storage: StorageAdapter,
  ) {}

  async sendText(chatId: string, text: string, buttons?: ButtonGrid) {
    await appendWebMessage(this.repo, chatId, { from: 'bot', kind: 'text', text, audioUrl: null, duration: null, buttons: buttons ?? null });
  }

  async sendVoice(chatId: string, audio: Uint8Array, opts: { caption?: string; buttons?: ButtonGrid; mimeType?: string } = {}) {
    const url = await this.storage.put(`audio/webchat/${chatId}/${Date.now()}.mp3`, audio, opts.mimeType ?? 'audio/mpeg');
    await appendWebMessage(this.repo, chatId, {
      from: 'bot',
      kind: 'voice',
      text: opts.caption ?? '',
      audioUrl: url,
      duration: null,
      buttons: opts.buttons ?? null,
    });
  }

  async sendLocation(chatId: string, place: { lat: number; lng: number; title: string; address: string }) {
    await appendWebMessage(this.repo, chatId, { from: 'bot', kind: 'location', text: `${place.title} · ${place.address}`, audioUrl: null, duration: null, buttons: null, location: place });
  }

  async sendChatAction() {
    /* the web UI shows its own typing indicator while a request is in flight */
  }

  async answerCallback() {
    /* no-op */
  }

  async clearButtons(chatId: string, messageId: number) {
    const messages = await load(this.repo, chatId);
    const m = messages.find((x) => x.id === messageId);
    if (!m?.buttons) return;
    m.buttons = null;
    await this.repo.putSession(key(chatId), { messages });
  }

  /** User voice notes are uploaded to storage first; the "file id" is the storage key. */
  async downloadFile(fileId: string) {
    const data = await this.storage.get(fileId);
    if (!data) throw new Error(`web chat audio not found: ${fileId}`);
    return { data, path: fileId };
  }
}

/** Dispatches by chat id: `web_…` → WebChannel, everything else → the primary channel (Telegram/mock). */
export class RoutingChannel implements ChatChannel {
  readonly name: ChatChannel['name'];
  constructor(
    private primary: ChatChannel,
    private web: WebChannel,
  ) {
    this.name = primary.name;
  }
  private pick(chatId: string): ChatChannel {
    return isWebChat(chatId) ? this.web : this.primary;
  }
  sendText(chatId: string, text: string, buttons?: ButtonGrid) {
    return this.pick(chatId).sendText(chatId, text, buttons);
  }
  sendVoice(chatId: string, audio: Uint8Array, opts?: { caption?: string; buttons?: ButtonGrid; mimeType?: string }) {
    return this.pick(chatId).sendVoice(chatId, audio, opts);
  }
  async sendChatAction(chatId: string, action: 'typing' | 'record_voice' | 'upload_voice') {
    await this.pick(chatId).sendChatAction?.(chatId, action);
  }
  async sendLocation(chatId: string, place: { lat: number; lng: number; title: string; address: string }) {
    const ch = this.pick(chatId);
    if (ch.sendLocation) await ch.sendLocation(chatId, place);
    else await ch.sendText(chatId, `📍 ${place.title}: ${place.address}
https://maps.google.com/?q=${place.lat},${place.lng}`);
  }
  async answerCallback(callbackId: string, text?: string) {
    // web callbacks use ids prefixed "web:"; everything else is a Telegram callback query
    if (callbackId.startsWith('web:')) return;
    await this.primary.answerCallback?.(callbackId, text);
  }
  async clearButtons(chatId: string, messageId: number) {
    await this.pick(chatId).clearButtons?.(chatId, messageId);
  }
  downloadFile(fileId: string): Promise<{ data: Uint8Array; path: string }> {
    const ch = fileId.startsWith('voice/webchat/') ? this.web : this.primary;
    if (!ch.downloadFile) return Promise.reject(new Error('downloadFile not supported'));
    return ch.downloadFile(fileId);
  }
}
