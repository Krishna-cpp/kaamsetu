/**
 * End-to-end test of /chat at 390×844: language → consent → voice note → (typed fallback) → confirmation card → ✅
 * → job alert → accept. The microphone is replaced by a stream playing a recorded Hindi voice note.
 *   BASE_URL=https://… node scripts/qa-chat.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const out = path.resolve('docs/screenshots/qa');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'hi-IN' });
await context.grantPermissions(['microphone'], { origin: base });
// Fake microphone: a MediaStream that plays the demo voice note (Ramesh, Hindi)
await context.addInitScript(() => {
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AudioContext();
    const buf = await (await fetch('/audio/demo/worker-intro-hi.mp3')).arrayBuffer();
    const audio = await ctx.decodeAudioData(buf);
    const src = ctx.createBufferSource();
    src.buffer = audio;
    const dest = ctx.createMediaStreamDestination();
    src.connect(dest);
    src.start();
    return dest.stream;
  };
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
let n = 0;
const shot = async (name) => {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, `chat-${String(++n).padStart(2, '0')}-${name}.png`) });
  console.log(`shot ${n}: ${name}`);
};
const lastBot = async () =>
  page.locator('ol[aria-label="Conversation"] > li').last().innerText().catch(() => '');
const waitIdle = async () => {
  await page.waitForTimeout(400);
  await page.locator('[aria-label="KaamSetu is replying"]').waitFor({ state: 'detached', timeout: 60000 }).catch(() => undefined);
};
const click = async (name) => {
  await page.getByRole('button', { name }).last().click();
  await waitIdle();
};

await page.goto(base + '/chat', { waitUntil: 'domcontentloaded', timeout: 150000 });
await page.getByRole('button', { name: 'हिन्दी' }).waitFor({ timeout: 120000 });
await shot('welcome');
await click('हिन्दी');
await shot('consent');
await click(/मैं सहमत हूँ/);
await shot('ask-intro');

// voice note via the (fake) microphone
await page.getByRole('button', { name: 'Record a voice note' }).click();
await page.waitForTimeout(7500);
await page.getByRole('button', { name: 'Stop and send voice note' }).click();
await waitIdle();
await shot('after-voice-note');
console.log('bot after voice note:', (await lastBot()).replace(/\s+/g, ' ').slice(0, 220));

// if the bot asked to type (speech service unavailable) or didn't produce a card, send the same intro as text
if (!(await page.getByRole('button', { name: /सही है/ }).count())) {
  await page.getByRole('textbox', { name: 'Message' }).fill('Mera naam Suresh Jadhav hai, main plumber hoon, Kothrud mein rehta hoon, 800 rupaye roz chahiye.');
  await page.getByRole('button', { name: 'Send' }).click();
  await waitIdle();
}
await page.getByRole('button', { name: /सही है/ }).waitFor({ timeout: 60000 });
await shot('confirmation-card');
await click(/सही है/);
await shot('profile-live');
// If there is no open job nearby right now, post one as an employer (the real flow): the alert must reach this web chat.
const alertBtn = page.getByRole('button', { name: /हाँ, काम चाहिए/ });
if (!(await alertBtn.waitFor({ timeout: 6000 }).then(() => true).catch(() => false))) {
  const tomorrow = new Date(Date.now() + 5.5 * 3600_000 + 86_400_000).toISOString().slice(0, 10);
  const res = await page.request.post(base + '/api/jobs', {
    data: {
      skill: 'plumber',
      workersNeeded: 3,
      durationDays: 1,
      wagePerDay: 850,
      startDate: tomorrow,
      locality: 'Kothrud',
      employer: { name: 'Mehta Interiors', phone: '+91 90110 55667', business: null },
      source: 'form',
    },
  });
  const job = (await res.json()).job;
  console.log(`no open job nearby → employer posted JOB #${job?.code} (${res.status()})`);
}
await alertBtn.waitFor({ timeout: 60000 });
await shot('job-alert');
await click(/हाँ, काम चाहिए/);
await shot('accepted');
console.log('final bot message:', (await lastBot()).replace(/\s+/g, ' ').slice(0, 260));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
console.log(`errors=${errors.length ? errors.join(' | ') : 'none'} horizontalOverflow=${overflow}`);
await browser.close();
