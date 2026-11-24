/**
 * Lists ElevenLabs voices available to your key (premade + library voices you've added),
 * highlighting ones labelled Indian / Hindi so you can set ELEVENLABS_VOICE_ID_HI etc.
 *   npm run voices
 */
import { getEnv } from '@kaamsetu/core/server';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
  verified_languages?: { language: string; accent?: string; model_id?: string }[];
}

async function main() {
  const env = getEnv();
  if (!env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing in .env');
  const res = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': env.ELEVENLABS_API_KEY } });
  if (!res.ok) throw new Error(`voices ${res.status}: ${await res.text()}`);
  const { voices } = (await res.json()) as { voices: Voice[] };
  const rows = voices.map((v) => {
    const langs = (v.verified_languages ?? []).map((l) => `${l.language}${l.accent ? `(${l.accent})` : ''}`).join(',');
    const labels = Object.values(v.labels ?? {}).join(',');
    const indian = /hindi|indian|marathi|\bhi\b|\bmr\b/i.test(`${langs} ${labels} ${v.name}`);
    return { indian, line: `${indian ? '★' : ' '} ${v.voice_id}  ${v.name.padEnd(28)} ${v.category ?? ''}  ${labels}  ${langs}` };
  });
  rows.sort((a, b) => Number(b.indian) - Number(a.indian));
  console.log(rows.map((r) => r.line).join('\n'));
  console.log(`\n${voices.length} voices. ★ = labelled Indian/Hindi/Marathi.`);
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
