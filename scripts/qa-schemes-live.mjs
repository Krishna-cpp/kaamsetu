/**
 * Live check of the opt-in Scheme Finder (spends ElevenLabs credits: run ONCE, by hand).
 *   BASE_URL=https://… node scripts/qa-schemes-live.mjs
 * 1. New signup in /chat → only the one-line tip, no questions.
 * 2. "pension ke baare mein batao" → explanation + Start / Not now.
 * 3. Ramesh (seed, 88 days) signs up in /chat, opts in, answers → results.
 * 4. Employer marks JOB #0410 done on /hire → Ramesh's chat gets the 90-day alert → work record opens.
 * Conversations run at 390×844; 1440 screenshots re-render the same chats (history only, no new TTS).
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const out = path.resolve('docs/screenshots/qa/schemes');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const errors = [];
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
  if (!cond) process.exitCode = 1;
};

const TIP_HI = 'कभी भी \'योजना\' बोलिए या /benefits दबाइए';
const EXPLAIN_HI = 'मैं आपके लिए करीब 8 सरकारी योजनाएँ जाँच सकता हूँ';
const QAGE_HI = 'आपकी उम्र कितनी है?';
const BOCW90_HI = 'इस साल आपने निर्माण में 90 से ज़्यादा दिन काम कर लिया है';

async function chatContext(width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 2 : 1, locale: 'hi-IN' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${width}: ${e.message}`));
  return { ctx, page };
}
const convo = (page) => page.locator('ol[aria-label="Conversation"]');
const idle = async (page) => {
  await page.waitForTimeout(400);
  await page.locator('[aria-label="KaamSetu is replying"]').waitFor({ state: 'detached', timeout: 90000 }).catch(() => undefined);
};
const tap = async (page, name) => {
  await page.getByRole('button', { name }).last().click();
  await idle(page);
};
const send = async (page, text) => {
  await page.getByRole('textbox', { name: 'Message' }).fill(text);
  await page.getByRole('button', { name: 'Send' }).click();
  await idle(page);
};
const shot = async (page, name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`      shot ${name}.png`);
};

async function signUp(page, intro) {
  await page.goto(base + '/chat', { waitUntil: 'domcontentloaded', timeout: 150000 });
  await page.getByRole('button', { name: 'हिन्दी' }).waitFor({ timeout: 150000 });
  await tap(page, 'हिन्दी');
  await tap(page, /मैं सहमत हूँ/);
  await send(page, intro);
  await page.getByRole('button', { name: /सही है/ }).waitFor({ timeout: 90000 });
  await tap(page, /सही है/);
  await page.waitForTimeout(2500); // the nearby-job alert (existing flow) may follow
  await idle(page);
}

/* 1 + 2: a brand-new worker */
{
  const { ctx, page } = await chatContext(390, 844);
  await signUp(page, 'Mera naam Vikram Patil hai, main painter hoon, Baner mein rehta hoon, 900 rupaye roz chahiye.');
  const text = await convo(page).innerText();
  ok(text.includes(TIP_HI), 'new signup sees the one-line tip');
  ok((text.match(/\/benefits/g) ?? []).length === 1, 'tip shown exactly once');
  ok(!text.includes(QAGE_HI) && !text.includes(EXPLAIN_HI), 'no benefit questions asked unprompted');
  await shot(page, '390-1-signup-tip');

  await send(page, 'pension ke baare mein batao');
  const after = await convo(page).innerText();
  ok(after.includes(EXPLAIN_HI), '"pension ke baare mein batao" → explanation first');
  ok((await page.getByRole('button', { name: 'शुरू करें' }).count()) > 0 && (await page.getByRole('button', { name: 'अभी नहीं' }).count()) > 0, 'Start / Not now offered');
  await shot(page, '390-2-pension-explain');

  // 1440 re-render of the same chat (history only)
  const state = await ctx.storageState();
  const wide = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: state });
  const wp = await wide.newPage();
  await wp.goto(base + '/chat', { waitUntil: 'domcontentloaded', timeout: 150000 });
  await wp.waitForTimeout(4000);
  await shot(wp, '1440-1-signup-and-pension');
  await wide.close();
  await ctx.close();
}

/* 3 + 4: Ramesh (seeded 88 construction days) */
{
  const pub = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await pub.goto(base + '/w/w_ramesh', { waitUntil: 'domcontentloaded', timeout: 150000 });
  await pub.waitForTimeout(2000);
  const pubText = await pub.locator('main').innerText();
  ok(/88\s*\/\s*90/.test(pubText), 'Ramesh profile shows 88 / 90 construction days');
  ok(!/My benefits|मेरी योजनाएँ/i.test(pubText) || /private/i.test(pubText), 'public profile does not show benefit answers');
  await shot(pub, '390-3-ramesh-public-88');
  await pub.setViewportSize({ width: 1440, height: 900 });
  await pub.waitForTimeout(800);
  await shot(pub, '1440-3-ramesh-public-88');
  await pub.close();

  const { ctx, page } = await chatContext(390, 844);
  await signUp(page, 'Mera naam Ramesh Pawar hai, main plumber hoon, Kothrud mein rehta hoon, 800 rupaye roz chahiye.');
  await send(page, 'pension ke baare mein batao');
  await tap(page, 'शुरू करें');
  await tap(page, '26-40');
  await tap(page, 'हाँ'); // bank
  await tap(page, 'नहीं'); // PF
  await tap(page, 'नहीं'); // income tax
  if (await page.getByRole('button', { name: '₹15,000 तक' }).count()) await tap(page, '₹15,000 तक');
  const results = await convo(page).innerText();
  ok(results.includes('आप पात्र हो सकते हैं'), 'results say "may be eligible"');
  ok(!/आप पात्र हैं|you are eligible/i.test(results), 'never "you are eligible"');
  await shot(page, '390-4-ramesh-results');

  // employer completes JOB #0410 on /hire (1440)
  const hire = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  hire.on('pageerror', (e) => errors.push(`hire: ${e.message}`));
  await hire.goto(base + '/hire?job=j_demo_bocw', { waitUntil: 'domcontentloaded', timeout: 150000 });
  const done = hire.getByRole('button', { name: /Mark job done/i }).first();
  await done.waitFor({ timeout: 60000 });
  await shot(hire, '1440-5-hire-before-done');
  await done.click();
  await hire.waitForTimeout(4000);
  await shot(hire, '1440-6-hire-after-done');
  await hire.close();

  // the 90-day alert arrives in Ramesh's chat (polling)
  const alert = page.getByText(BOCW90_HI).last();
  const arrived = await alert.waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
  ok(arrived, 'completing one job fires the 90-day alert (opted in)');
  await shot(page, '390-7-ramesh-90-day-alert');

  // work record opens from the alert
  const link = page.getByRole('link', { name: /काम का रिकॉर्ड/ }).last();
  const href = await link.getAttribute('href');
  if (href) {
    const wr = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await wr.goto(href, { waitUntil: 'domcontentloaded', timeout: 150000 });
    await wr.waitForTimeout(1500);
    const wrText = await wr.locator('main').innerText();
    ok(/91/.test(wrText) && /Not an official certificate/i.test(wrText), 'work record opens: 91 days + disclaimer');
    ok(!/\+91\s?\d{5}/.test(wrText), 'work record shows no phone numbers');
    await shot(wr, '390-8-work-record');
    await wr.setViewportSize({ width: 1440, height: 900 });
    await wr.waitForTimeout(800);
    await shot(wr, '1440-8-work-record');
    await wr.close();
  } else ok(false, 'work-record link present in the alert');

  const state = await ctx.storageState();
  const wide = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: state });
  const wp = await wide.newPage();
  await wp.goto(base + '/chat', { waitUntil: 'domcontentloaded', timeout: 150000 });
  await wp.waitForTimeout(4000);
  await shot(wp, '1440-7-ramesh-chat-alert');
  await wide.close();
  await ctx.close();
}

console.log(`page errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close();
