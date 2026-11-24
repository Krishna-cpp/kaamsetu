/* Shared bits for next/og ImageResponse cards (server only). */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const C = {
  paper: '#F3EFE6',
  paper2: '#EBE5D8',
  ink: '#121210',
  hivis: '#FF5B14',
  hivisText: '#E8500F',
  signal: '#FFD23F',
  concrete: '#6B6963',
  line: '#D9D3C7',
} as const;

type Weight = 400 | 500 | 600 | 700;
export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: Weight;
  style: 'normal' | 'italic';
}

const cache = new Map<string, Promise<ArrayBuffer | null>>();

/** Fetch a subset TTF from Google Fonts' static CSS API. Resolves null on any failure (never throws). */
function googleFont(family: string, axis: string, text: string): Promise<ArrayBuffer | null> {
  const chars = [...new Set(text)].sort().join('');
  const key = `${family}|${axis}|${chars}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = (async () => {
    try {
      const url = `https://fonts.googleapis.com/css2?family=${family}:${axis}&text=${encodeURIComponent(chars)}`;
      const css = await (await fetch(url, { signal: AbortSignal.timeout(4000) })).text();
      const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
      if (!src) return null;
      const res = await fetch(src, { signal: AbortSignal.timeout(4000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  cache.set(key, p);
  // don't cache failures forever
  void p.then((d) => d === null && cache.delete(key));
  return p;
}

/**
 * Load the card fonts, subset to the text actually drawn. Missing fonts are skipped
 * (next/og falls back to its bundled sans), so this never breaks the image.
 */
export async function loadOgFonts(t: { display: string; displayRegular?: string; serif?: string; mono?: string; deva?: string }) {
  const jobs: [string, Promise<ArrayBuffer | null>, Weight, 'normal' | 'italic'][] = [
    ['Bricolage', googleFont('Bricolage+Grotesque', 'wght@700', t.display), 700, 'normal'],
  ];
  if (t.displayRegular) jobs.push(['Bricolage', googleFont('Bricolage+Grotesque', 'wght@400', t.displayRegular), 400, 'normal']);
  if (t.serif) jobs.push(['Instrument', googleFont('Instrument+Serif', 'ital@1', t.serif), 400, 'italic']);
  if (t.mono) jobs.push(['GeistMono', googleFont('Geist+Mono', 'wght@500', t.mono), 500, 'normal']);
  if (t.deva) jobs.push(['Mukta', googleFont('Mukta', 'wght@600', t.deva), 600, 'normal']);
  const loaded = await Promise.all(jobs.map(async ([name, p, weight, style]) => ({ name, data: await p, weight, style })));
  const fonts: OgFont[] = loaded.filter((f): f is OgFont => f.data !== null);
  const has = (name: string) => fonts.some((f) => f.name === name);
  return { fonts, has };
}

/** Hazard-stripe band drawn as explicit SVG polygons (robust in satori/resvg). */
export function Hazard({ width = 1200, height = 28 }: { width?: number; height?: number }) {
  const step = 40;
  const polys: string[] = [];
  for (let x = -height; x < width + height; x += step) {
    polys.push(`${x},${height} ${x + step / 2},${height} ${x + step / 2 + height},0 ${x + height},0`);
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'flex' }}>
      <rect width={width} height={height} fill={C.signal} />
      {polys.map((p, i) => (
        <polygon key={i} points={p} fill={C.ink} />
      ))}
    </svg>
  );
}

/** Bridge-arc glyph from the wordmark. */
export function Glyph({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" fill={C.hivis} />
      <path d="M5 23c3-8 7-12 11-12s8 4 11 12" fill="none" stroke={C.ink} strokeWidth="3" />
      <path d="M5 23h22M10 23v-5M16 23v-9M22 23v-5" stroke={C.ink} strokeWidth="2" />
    </svg>
  );
}

export function StarIcon({ size = 30, fill = C.hivis }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" fill={fill} stroke={C.ink} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
