/**
 * Designs KaamSetu's two custom voices with ElevenLabs Voice Design (text-to-voice),
 * checks every preview with Scribe STT, and saves the best one per persona to the account.
 *   npm run voices:design            # prints the new voice ids
 * Previews are written to $PREVIEW_DIR (default: ./.voice-previews, gitignored).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { getEnv } from '@kaamsetu/core/server';

const EL = 'https://api.elevenlabs.io';

interface Persona {
  key: 'didi' | 'ramesh';
  name: string;
  description: string;
  /** Hindi script read in the preview (100–1000 chars); also the STT reference */
  text: string;
}

const PERSONAS: Persona[] = [
  {
    key: 'didi',
    name: 'Kaam Didi (KaamSetu)',
    description:
      'A warm, friendly Indian woman in her early 30s with a natural Hindi accent. She speaks clearly and slowly, ' +
      'with a kind, reassuring and patient tone, like a helpful elder sister explaining something simple. Clean studio recording.',
    text:
      'रमेश जी, कोथरूड में एक किलोमीटर दूर प्लंबर का काम है। आठ सौ पचास रुपये रोज़, एक दिन के लिए, कल सुबह से। ' +
      'काम चाहिए तो हाँ दबाइए। कोई भी सवाल हो तो मुझसे पूछिए, मैं आपकी मदद करूँगी।',
  },
  {
    key: 'ramesh',
    name: 'Ramesh (KaamSetu demo)',
    description:
      'An Indian man in his 40s, a working-class Maharashtrian plumber from Pune who speaks Hindi naturally with a slight Marathi accent. ' +
      'Down-to-earth, honest, slightly gravelly voice, speaking casually into a phone voice note.',
    text:
      'नमस्ते, मेरा नाम रमेश है। मैं प्लंबर हूँ, बारह साल से काम कर रहा हूँ। कोथरूड में रहता हूँ। ' +
      'मुझे रोज़ आठ सौ रुपये चाहिए। पास में कोई काम हो तो ज़रूर बताइए।',
  },
];

type Preview = { generated_voice_id: string; audio_base_64: string };

async function el(pathname: string, init: RequestInit): Promise<Response> {
  const key = getEnv().ELEVENLABS_API_KEY!;
  return fetch(`${EL}${pathname}`, { ...init, headers: { 'xi-api-key': key, ...(init.headers ?? {}) } });
}

/** Normalised similarity 0..1 (Levenshtein over letters/digits only). */
function similarity(a: string, b: string): number {
  const n = (s: string) =>
    s
      .toLowerCase()
      .replace(/₹\s*850|850/g, 'आठ सौ पचास')
      .replace(/₹\s*800|800/g, 'आठ सौ')
      .replace(/plumber/g, 'प्लंबर')
      .replace(/[^\p{L}\p{N}\p{M}]+/gu, '');
  const x = n(a);
  const y = n(b);
  const dp = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array<number>(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= x.length; i++)
    for (let j = 1; j <= y.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
  return 1 - dp[x.length]![y.length]! / Math.max(x.length, y.length, 1);
}

async function transcribe(audio: Buffer): Promise<{ text: string; lang: string }> {
  const fd = new FormData();
  fd.append('model_id', getEnv().ELEVENLABS_STT_MODEL);
  fd.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/mpeg' }), 'preview.mp3');
  const res = await el('/v1/speech-to-text', { method: 'POST', body: fd });
  const j = (await res.json()) as { text?: string; language_code?: string };
  return { text: j.text ?? '', lang: j.language_code ?? '?' };
}

async function main() {
  if (!getEnv().ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing');
  const outDir = path.resolve(process.env.PREVIEW_DIR ?? '.voice-previews');
  mkdirSync(outDir, { recursive: true });
  const chosen: Record<string, string> = {};

  for (const p of PERSONAS) {
    console.log(`\n=== ${p.name}`);
    const res = await el('/v1/text-to-voice/design', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ voice_description: p.description, text: p.text, model_id: 'eleven_multilingual_ttv_v2', guidance_scale: 5 }),
    });
    if (!res.ok) throw new Error(`design ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const { previews } = (await res.json()) as { previews: Preview[] };

    let best: { id: string; score: number } | null = null;
    for (const [i, pv] of previews.entries()) {
      const audio = Buffer.from(pv.audio_base_64, 'base64');
      const file = path.join(outDir, `${p.key}-${i + 1}.mp3`);
      writeFileSync(file, audio);
      const tr = await transcribe(audio);
      const score = similarity(tr.text, p.text);
      console.log(`preview ${i + 1}  lang=${tr.lang}  match=${(score * 100).toFixed(0)}%  ${file}\n   STT: ${tr.text}`);
      if (tr.lang.startsWith('hi') && (!best || score > best.score)) best = { id: pv.generated_voice_id, score };
    }
    if (!best) throw new Error(`no Hindi-recognised preview for ${p.key}`);

    const save = await el('/v1/text-to-voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        voice_name: p.name,
        voice_description: p.description,
        generated_voice_id: best.id,
        labels: { project: 'kaamsetu', language: 'hi', persona: p.key },
      }),
    });
    if (!save.ok) throw new Error(`save ${save.status}: ${(await save.text()).slice(0, 400)}`);
    const { voice_id } = (await save.json()) as { voice_id: string };
    chosen[p.key] = voice_id;
    console.log(`→ saved best preview (${(best.score * 100).toFixed(0)}% match) as voice ${voice_id}`);
  }
  console.log(`\nKAAM_DIDI_VOICE=${chosen.didi}\nRAMESH_VOICE=${chosen.ramesh}`);
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
