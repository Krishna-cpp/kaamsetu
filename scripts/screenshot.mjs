/**
 * Design-QA screenshots.
 *   node scripts/screenshot.mjs /hire            → docs/screenshots/hire-{390,768,1440}.png
 *   node scripts/screenshot.mjs / --full         → full-page captures
 *   node scripts/screenshot.mjs /live --wait=4000 --widths=1440
 *   node scripts/screenshot.mjs / --scroll=2400  → scroll to y before capture (for scroll-driven sections)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
// Accept "hire" or "/hire"; "home" or "/" for the landing page. (Git Bash mangles a bare "/" — use "home".)
const rawRoute = args.find((a) => !a.startsWith('--')) ?? 'home';
const route = rawRoute === 'home' || /^[A-Za-z]:[\\/]/.test(rawRoute) ? '/' : '/' + rawRoute.replace(/^\/+/, '');
const flag = (name, def) => {
  const f = args.find((a) => a.startsWith(`--${name}`));
  if (!f) return def;
  const [, v] = f.split('=');
  return v ?? true;
};
const full = !!flag('full', false);
const wait = Number(flag('wait', 1500));
const scroll = Number(flag('scroll', 0));
const widths = String(flag('widths', '390,768,1440')).split(',').map(Number);
const base = process.env.BASE_URL ?? 'http://localhost:3000';
const outDir = path.resolve('docs/screenshots');
mkdirSync(outDir, { recursive: true });
const slug = (route === '/' ? 'home' : route.replace(/^\//, '').replace(/[^\w]+/g, '-')) + (scroll ? `-y${scroll}` : '');

const browser = await chromium.launch();
for (const w of widths) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 600 ? 844 : w < 1000 ? 1024 : 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error(`[pageerror ${w}]`, e.message));
  page.on('console', (m) => m.type() === 'error' && console.error(`[console ${w}]`, m.text()));
  await page.goto(base + route, { waitUntil: 'networkidle', timeout: 60000 });
  if (scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), scroll);
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(wait);
  const file = path.join(outDir, `${slug}-${w}.png`);
  await page.screenshot({ path: file, fullPage: full });
  console.log(file);
  await page.close();
}
await browser.close();
