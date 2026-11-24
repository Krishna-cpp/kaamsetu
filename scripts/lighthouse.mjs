/**
 * Lighthouse (mobile + desktop) against a running server; prints scores + failing audits.
 *   node scripts/lighthouse.mjs http://localhost:3100/
 * Uses Playwright's Chromium. Reports are written to docs/lighthouse/.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:3100/';
const outDir = path.resolve('docs/lighthouse');
mkdirSync(outDir, { recursive: true });
const slug = new URL(url).pathname.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home';

for (const mode of ['mobile', 'desktop']) {
  const out = path.join(outDir, `${slug}-${mode}.json`);
  const args = ['--yes', 'lighthouse@12.6.1', url, '--quiet', '--output=json', `--output-path=${out}`, '--chrome-flags=--headless=new --no-sandbox'];
  if (mode === 'desktop') args.push('--preset=desktop');
  try {
    execFileSync('npx', args, { env: { ...process.env, CHROME_PATH: chromium.executablePath() }, stdio: 'ignore', shell: true });
  } catch {
    /* lighthouse exits non-zero on some Windows temp cleanup errors even when the report was written */
  }
  const r = JSON.parse(readFileSync(out, 'utf8'));
  console.log(`\n${mode.toUpperCase()}  ` + Object.entries(r.categories).map(([k, v]) => `${k}: ${Math.round(v.score * 100)}`).join('  '));
  for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index'])
    console.log(`  ${id}: ${r.audits[id].displayValue}`);
  const failing = Object.values(r.audits)
    .filter((a) => a.score !== null && a.score < 0.9 && !['informative', 'notApplicable', 'manual'].includes(a.scoreDisplayMode))
    .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ''}`);
  console.log(`  below 90: ${failing.join(', ') || 'none'}`);
}
