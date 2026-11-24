import { createHash } from 'node:crypto';
import type { Env } from '../config';
import { normaliseLanguage, type Language } from '../languages';
import { LANGUAGES } from '../languages';
import type { StorageAdapter } from './storage';

const EL_BASE = 'https://api.elevenlabs.io';

/* ------------------------------- STT ------------------------------- */

export interface Transcript {
  text: string;
  language: Language | null;
  provider: 'elevenlabs' | 'mock';
}

export interface SttAdapter {
  readonly name: 'elevenlabs' | 'mock';
  transcribe(audio: Uint8Array, opts: { mimeType: string; filename?: string; languageHint?: Language | null }): Promise<Transcript>;
}

const MOCK_TRANSCRIPTS = {
  worker: 'Mera naam Ramesh Pawar hai, main plumber hoon, Kothrud mein rehta hoon, 800 rupaye roz chahiye.',
  job: 'Need 2 painters near Baner for 3 days, 900 rupees per day, start tomorrow.',
};

export class MockStt implements SttAdapter {
  readonly name = 'mock' as const;
  constructor(private kind: keyof typeof MOCK_TRANSCRIPTS = 'job') {}
  async transcribe(_a: Uint8Array, opts: { languageHint?: Language | null }): Promise<Transcript> {
    return { text: MOCK_TRANSCRIPTS[this.kind], language: opts.languageHint ?? (this.kind === 'worker' ? 'hi' : 'en'), provider: 'mock' };
  }
}

export class ElevenLabsStt implements SttAdapter {
  readonly name = 'elevenlabs' as const;
  constructor(private env: Env & { ELEVENLABS_API_KEY: string }) {}

  async transcribe(audio: Uint8Array, opts: { mimeType: string; filename?: string; languageHint?: Language | null }): Promise<Transcript> {
    const form = new FormData();
    form.append('model_id', this.env.ELEVENLABS_STT_MODEL);
    form.append('file', new Blob([audio], { type: opts.mimeType }), opts.filename ?? 'audio');
    form.append('tag_audio_events', 'false');
    if (opts.languageHint) form.append('language_code', LANGUAGES[opts.languageHint].sttCode);
    const res = await fetch(`${EL_BASE}/v1/speech-to-text`, {
      method: 'POST',
      headers: { 'xi-api-key': this.env.ELEVENLABS_API_KEY },
      body: form,
    });
    if (!res.ok) throw new Error(`ElevenLabs STT ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { text?: string; language_code?: string };
    return {
      text: (json.text ?? '').trim(),
      language: json.language_code ? normaliseLanguage(json.language_code, opts.languageHint ?? 'hi') : null,
      provider: 'elevenlabs',
    };
  }
}

/* ------------------------------- TTS ------------------------------- */

export interface SpeechResult {
  audio: Uint8Array;
  mimeType: 'audio/mpeg';
  /** Public URL if it was stored (cached) */
  url: string | null;
}

export interface TtsAdapter {
  readonly name: 'elevenlabs' | 'mock';
  /** fast=true uses the low-latency model (alerts); default uses the quality model. Returns null when unavailable. */
  speak(text: string, lang: Language, opts?: { fast?: boolean }): Promise<SpeechResult | null>;
}

export class MockTts implements TtsAdapter {
  readonly name = 'mock' as const;
  async speak(): Promise<SpeechResult | null> {
    return null;
  }
}

/** Sensible multilingual defaults; override per language via ELEVENLABS_VOICE_ID_{HI,MR,EN}. */
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL';

export function voiceFor(env: Env, lang: Language): string {
  const map: Record<Language, string | undefined> = {
    hi: env.ELEVENLABS_VOICE_ID_HI,
    mr: env.ELEVENLABS_VOICE_ID_MR ?? env.ELEVENLABS_VOICE_ID_HI,
    en: env.ELEVENLABS_VOICE_ID_EN ?? env.ELEVENLABS_VOICE_ID_HI,
  };
  return map[lang] ?? DEFAULT_VOICE;
}

export class ElevenLabsTts implements TtsAdapter {
  readonly name = 'elevenlabs' as const;
  constructor(
    private env: Env & { ELEVENLABS_API_KEY: string },
    private storage: StorageAdapter | null,
  ) {}

  async speak(text: string, lang: Language, opts: { fast?: boolean } = {}): Promise<SpeechResult | null> {
    const voice = voiceFor(this.env, lang);
    const model = opts.fast ? this.env.ELEVENLABS_ALERT_MODEL : this.env.ELEVENLABS_TTS_MODEL;
    const key = `tts/${createHash('sha1').update(`${voice}|${model}|${text}`).digest('hex').slice(0, 20)}.mp3`;

    if (this.storage) {
      const hit = await this.storage.get(key).catch(() => null);
      if (hit) return { audio: hit, mimeType: 'audio/mpeg', url: this.storage.publicUrl(key) };
    }

    const body: Record<string, unknown> = {
      text,
      model_id: model,
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
    };
    // Flash/Turbo v2.5 accept a language hint; multilingual_v2 infers it.
    if (model.includes('v2_5')) body.language_code = lang;

    const res = await fetch(`${EL_BASE}/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': this.env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`ElevenLabs TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const audio = new Uint8Array(await res.arrayBuffer());
    let url: string | null = null;
    if (this.storage) {
      url = await this.storage.put(key, audio, 'audio/mpeg').catch((e: unknown) => {
        console.warn('[tts] cache write failed', e);
        return null;
      });
    }
    return { audio, mimeType: 'audio/mpeg', url };
  }
}

function hasKey(env: Env): env is Env & { ELEVENLABS_API_KEY: string } {
  return !env.DEMO_MODE && !!env.ELEVENLABS_API_KEY;
}

export function createStt(env: Env, mockKind: 'worker' | 'job' = 'job'): SttAdapter {
  return hasKey(env) ? new ElevenLabsStt(env) : new MockStt(mockKind);
}

export function createTts(env: Env, storage: StorageAdapter | null): TtsAdapter {
  return hasKey(env) ? new ElevenLabsTts(env, storage) : new MockTts();
}
