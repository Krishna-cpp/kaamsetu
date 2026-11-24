/**
 * Captures the README screenshots from a (deployed) KaamSetu URL into docs/screenshots/readme/.
 *   BASE_URL=https://main.d1ro3ffmsok6d8.amplifyapp.com node scripts/readme-shots.mjs
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3000';
const out = path.resolve('docs/screenshots/readme');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function shot(name, route, { width = 1440, height = 900, wait = 2500, act } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: width < 600 ? 2 : 1 });
  page.on('pageerror', (e) => console.error(`[${name}] pageerror`, e.message));
  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 90000 });
  if (act) await act(page);
  await page.waitForTimeout(wait);
  // hide the dev-only mock pill if present
  await page.addStyleTag({ content: '.fixed.bottom-3.right-3{display:none!important}' });
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  console.log(`${name}.png`);
  await page.close();
}

const postSample = (index) => async (page) => {
  await page.getByRole('button', { name: /2 painters|Plumber in Kothrud|Kharadi/ }).nth(index).click();
  await page.getByRole('button', { name: /Find workers/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /Find workers/ }).click();
  await page.waitForTimeout(16000); // let simulated replies arrive: Alerted → Listened → Accepted
};

await shot('home', '/', { wait: 3500 });
await shot('hire', '/hire', { act: postSample(1), wait: 1500 });
await shot('hire-mobile', '/hire', { width: 390, height: 844, act: postSample(0), wait: 1500 });
await shot('id-card', '/w/w_ramesh', { wait: 2000 });
await shot('live', '/live', { wait: 5000 });
await browser.close();
