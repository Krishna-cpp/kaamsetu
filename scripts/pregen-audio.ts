/**
 * Pre-generates the demo audio used by the landing page (phone demo + language showcase)
 * so the pitch never depends on a live TTS call.
 *   npm run pregen:audio            # skip files that already exist
 *   npm run pregen:audio -- --force
 * Output: apps/web/public/audio/demo/*.mp3 (+ uploaded to S3 when STORAGE=s3)
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createStorage, ElevenLabsTts, findRepoRoot, getEnv, jobAlertText, t, todayIST, type Language } from '@kaamsetu/core/server';

const force = process.argv.includes('--force');

async function main() {
  const env = getEnv();
  if (!env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing in .env');
  const tts = new ElevenLabsTts({ ...env, ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY }, null);
  const outDir = path.join(findRepoRoot() ?? process.cwd(), 'apps', 'web', 'public', 'audio', 'demo');
  mkdirSync(outDir, { recursive: true });
  const s3 = env.STORAGE === 's3' ? createStorage(env) : null;

  const today = todayIST();
  const tomorrow = new Date(Date.parse(today) + 86_400_000).toISOString().slice(0, 10);
  const alert = (lang: Language) =>
    jobAlertText(lang, { workerName: lang === 'en' ? 'Ramesh Pawar' : 'रमेश पवार', skill: 'plumber', locality: lang === 'en' ? 'Kothrud' : 'कोथरूड', distanceKm: 1.2, wage: 850, days: 1, startDate: tomorrow, today });

  const workerVoice = process.env.ELEVENLABS_WORKER_VOICE_ID ?? 'nPczCjzI2devNBz1zQrb';
  const clips: { file: string; lang: Language; text: string; voiceId?: string }[] = [
    // The worker's own voice note, in a different voice from the bot (override with ELEVENLABS_WORKER_VOICE_ID)
    { file: 'worker-intro-hi.mp3', lang: 'hi', text: 'मेरा नाम रमेश है, मैं प्लंबर हूँ, कोथरूड में रहता हूँ, 800 रुपये रोज़ चाहिए।', voiceId: workerVoice },
    { file: 'bot-confirm-hi.mp3', lang: 'hi', text: t('confirmProfile', 'hi', { name: 'रमेश', skill: 'प्लंबर', locality: 'कोथरूड', wage: 800 }) },
    { file: 'bot-saved-hi.mp3', lang: 'hi', text: t('profileSaved', 'hi') },
    { file: 'alert-hi.mp3', lang: 'hi', text: alert('hi') },
    { file: 'alert-mr.mp3', lang: 'mr', text: alert('mr') },
    { file: 'alert-en.mp3', lang: 'en', text: alert('en') },
    { file: 'welcome-hi.mp3', lang: 'hi', text: t('welcome', 'hi') },
  ];

  for (const c of clips) {
    const dest = path.join(outDir, c.file);
    if (existsSync(dest) && !force) {
      console.log(`skip  ${c.file}`);
      continue;
    }
    const speech = await tts.speak(c.text, c.lang, { voiceId: c.voiceId });
    if (!speech) throw new Error('TTS returned nothing');
    writeFileSync(dest, speech.audio);
    if (s3) await s3.put(`audio/demo/${c.file}`, speech.audio, 'audio/mpeg');
    console.log(`wrote ${c.file}  (${(speech.audio.byteLength / 1024).toFixed(0)} KB)  ${c.text}`);
  }
  writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(Object.fromEntries(clips.map((c) => [c.file, c.text])), null, 2));
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
