/**
 * Landing QA: for each viewport → hero, hero after opening "Talk to KaamSetu", and a scroll-through
 * (scrolls step by step so ScrollTrigger/Lenis fire, then captures full page + viewport shots along the way).
 *   BASE_URL=... node scripts/qa-landing.mjs [widths=1920x1080,1366x768,...] [tag]
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://localhost:3100';
const sizes = (process.argv[2] ?? '1920x1080,1536x864,1366x768,1280x720,390x844').split(',').map((s) => s.split('x').map(Number));
const tag = process.argv[3] ?? 'qa';
const out = path.resolve('docs/screenshots/qa');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

for (const [w, h] of sizes) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.mouse.move(w / 2, h / 2);
  await page.mouse.move(w / 2 + 40, 30); // hover the nav area like a real user
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(out, `${tag}-${w}-a-hero.png`) });

  // open the call panel
  const btn = page.getByRole('button', { name: /Talk to KaamSetu/ }).first();
  await btn.click();
  await page.waitForTimeout(1200);
  const dlg = await page.locator('[role="dialog"]').boundingBox().catch(() => null);
  await page.screenshot({ path: path.join(out, `${tag}-${w}-b-panel.png`) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  const stillOpen = await page.locator('[role="dialog"]').count();

  // scroll through the page slowly (wheel, like a user) and sample viewports
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let y = 0;
  let i = 0;
  while (y < total + h) {
    await page.mouse.wheel(0, Math.round(h * 0.8));
    await page.waitForTimeout(350);
    y += h * 0.8;
    if (i % 3 === 0) await page.screenshot({ path: path.join(out, `${tag}-${w}-c-scroll-${String(i).padStart(2, '0')}.png`) });
    i++;
    if (i > 60) break;
  }
  const finalH = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log(`${w}x${h}: dialog=${dlg ? `${Math.round(dlg.width)}x${Math.round(dlg.height)}@${Math.round(dlg.x)},${Math.round(dlg.y)}` : 'none'} closedByEsc=${stillOpen === 0} pageHeight=${finalH} shots=${Math.ceil(i / 3)} errors=${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
  await page.close();
}
await browser.close();
