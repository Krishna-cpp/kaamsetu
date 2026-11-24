import { Check, Mic, Phone } from 'lucide-react';
import type { CSSProperties } from 'react';
import { PhoneFrame } from './phone';

/** delay helper for the staggered `[data-anim]` reveals (see globals landing block) */
const d = (ms: number): CSSProperties => ({ ['--d' as string]: `${ms}ms` });

const STATIC_BARS = [0.3, 0.5, 0.8, 0.6, 0.9, 0.4, 0.7, 1, 0.55, 0.35, 0.75, 0.95, 0.5, 0.65, 0.3, 0.85, 0.6, 0.45, 0.7, 0.4, 0.25, 0.55];

/* ── 01 Speak ─────────────────────────────────────────── */
export function SpeakVisual() {
  return (
    <PhoneFrame className="h-[440px] w-[236px] md:h-[500px] md:w-[262px]" time="6:48">
      <div className="flex h-full flex-col justify-end gap-2 p-3">
        <div data-anim style={d(0)} className="max-w-[85%] self-start bg-paper px-3 py-2 text-[12.5px] leading-snug shadow-[0_0_0_1px_var(--color-line)]">
          <p lang="hi">अपना नाम, काम, इलाका और रोज़ कितने पैसे चाहिए, बताइए।</p>
        </div>
        <div data-anim style={d(250)} className="w-[88%] self-end bg-ink px-3 py-2.5 text-paper">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-hivis text-ink">
              <Mic className="size-4" aria-hidden />
            </span>
            <div className="ks-wave-live flex h-7 flex-1 items-center gap-[2px]" aria-hidden>
              {STATIC_BARS.map((b, i) => (
                <span key={i} className="block h-full w-[3px] bg-paper" style={{ transform: `scaleY(${b})`, animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          </div>
          <p className="label mt-1.5 flex justify-between text-paper/60">
            <span>0:07</span>
            <span>Voice note</span>
          </p>
        </div>
        <p data-anim style={d(600)} lang="hi" className="self-end text-right text-[11.5px] leading-snug text-concrete-dark">
          “मेरा नाम रमेश है, मैं प्लंबर हूँ, कोथरूड में रहता हूँ…”
        </p>
      </div>
    </PhoneFrame>
  );
}

/* ── 02 Understood ─────────────────────────────────────── */
const FIELDS = [
  { k: 'Name', v: 'Ramesh Pawar', src: 'रमेश' },
  { k: 'Trade', v: 'Plumber', src: 'प्लंबर' },
  { k: 'Locality', v: 'Kothrud · 18.51°N', src: 'कोथरूड' },
  { k: 'Wage', v: '₹800 / day', src: '800 रुपये' },
  { k: 'Language', v: 'Hindi', src: 'hin · 0.98' },
];

export function UnderstoodVisual() {
  return (
    <div className="w-full max-w-[440px]">
      <p lang="hi" className="mb-5 text-[19px] leading-[1.55] md:text-[22px]">
        “मेरा नाम <mark className="ks-mark">रमेश</mark> है, मैं <mark className="ks-mark">प्लंबर</mark> हूँ,{' '}
        <mark className="ks-mark">कोथरूड</mark> में रहता हूँ, <mark className="ks-mark">800 रुपये</mark> रोज़ चाहिए।”
      </p>
      <div className="border border-ink bg-paper">
        <div className="flex items-center justify-between bg-ink px-4 py-2 text-paper">
          <span className="label">Worker card · draft</span>
          <span className="label text-signal">Bedrock · Nova</span>
        </div>
        <dl>
          {FIELDS.map((f, i) => (
            <div key={f.k} data-anim style={d(150 + i * 120)} className="grid grid-cols-[92px_1fr_auto] items-baseline gap-3 border-b border-line px-4 py-2.5 last:border-b-0">
              <dt className="label text-concrete">{f.k}</dt>
              <dd className="font-display text-[17px] font-semibold tracking-tight">{f.v}</dd>
              <dd lang={f.k === 'Language' ? undefined : 'hi'} className="text-[12px] text-concrete">
                {f.src}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <p data-anim style={d(900)} className="label mt-3 flex items-center gap-2">
        <Check className="size-3.5 text-ok" aria-hidden /> Read back to Ramesh for a spoken yes
      </p>
    </div>
  );
}

/* ── 03 Matched ─────────────────────────────────────── */
const WEIGHTS = [
  { k: 'Skill', w: 0.35, c: 'var(--color-ink)' },
  { k: 'Proximity', w: 0.25, c: 'var(--color-hivis)' },
  { k: 'Wage', w: 0.15, c: 'var(--color-signal)' },
  { k: 'Trust', w: 0.15, c: 'var(--color-concrete)' },
  { k: 'Availability', w: 0.1, c: 'var(--color-line)' },
];
const RANKED = [
  { n: 'Ramesh P.', t: 'Plumber', km: 1.2, parts: [1, 0.85, 1, 0.87, 1], x: 128, y: 92 },
  { n: 'Sunil K.', t: 'Plumber', km: 2.8, parts: [1, 0.65, 0.9, 0.72, 0.8], x: 196, y: 150 },
  { n: 'Ajay M.', t: 'Tile fitter', km: 0.9, parts: [0.3, 0.95, 1, 0.8, 1], x: 98, y: 132 },
];

export function MatchedVisual() {
  return (
    <div className="grid w-full max-w-[640px] grid-cols-1 gap-6 sm:grid-cols-[250px_1fr]">
      <svg viewBox="0 0 240 240" className="mx-auto w-[220px] border border-ink bg-paper sm:mx-0 sm:w-[250px]" role="img" aria-label="Radius map: job in Kothrud with three ranked workers nearby">
        <defs>
          <pattern id="ks-dots" width="12" height="12" patternUnits="userSpaceOnUse">
            <rect width="1.2" height="1.2" fill="var(--color-line)" />
          </pattern>
        </defs>
        <rect width="240" height="240" fill="url(#ks-dots)" />
        {[100, 70, 40].map((r) => (
          <circle key={r} cx="120" cy="120" r={r} fill="none" stroke="var(--color-ink)" strokeOpacity={r === 100 ? 0.5 : 0.18} strokeDasharray={r === 100 ? '3 3' : undefined} />
        ))}
        <text x="124" y="16" className="label" fontSize="8" fill="var(--color-concrete)">
          8 KM
        </text>
        {RANKED.map((w, i) => (
          <g key={w.n} data-anim style={d(200 + i * 160)}>
            <line x1="120" y1="120" x2={w.x} y2={w.y} stroke="var(--color-hivis)" strokeWidth={i === 0 ? 1.6 : 0.8} strokeOpacity={i === 0 ? 1 : 0.5} />
            <circle cx={w.x} cy={w.y} r="9" fill={i === 0 ? 'var(--color-hivis)' : 'var(--color-paper)'} stroke="var(--color-ink)" />
            <text x={w.x} y={w.y + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-mono)">
              {i + 1}
            </text>
          </g>
        ))}
        <rect x="113" y="113" width="14" height="14" fill="var(--color-signal)" stroke="var(--color-ink)" />
        <text x="132" y="136" fontSize="8" fill="var(--color-ink)" fontFamily="var(--font-mono)">
          JOB #0407
        </text>
      </svg>
      <ol className="flex flex-col gap-3">
        {RANKED.map((w, i) => {
          const score = w.parts.reduce((s, p, j) => s + p * (WEIGHTS[j]?.w ?? 0), 0);
          return (
            <li key={w.n} data-anim style={d(300 + i * 160)} className="border-b border-line pb-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-[16px] font-semibold tracking-tight">
                  <span className="label mr-2 text-concrete">#{i + 1}</span>
                  {w.n} <span className="text-[13px] font-normal text-concrete">· {w.t} · {w.km} km</span>
                </span>
                <span className="font-mono text-[15px] font-semibold tabular-nums">{score.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex h-2.5 w-full bg-paper-2" aria-hidden>
                {w.parts.map((p, j) => (
                  <span
                    key={j}
                    className="ks-grow block h-full"
                    style={{ width: `${p * (WEIGHTS[j]?.w ?? 0) * 100}%`, background: WEIGHTS[j]?.c, ...d(450 + i * 160 + j * 60) }}
                  />
                ))}
              </div>
            </li>
          );
        })}
        <li className="flex flex-wrap gap-x-3 gap-y-1">
          {WEIGHTS.map((w) => (
            <span key={w.k} className="label flex items-center gap-1.5 text-concrete-dark">
              <span className="inline-block size-2 border border-ink/30" style={{ background: w.c }} />
              {w.k} {w.w.toFixed(2)}
            </span>
          ))}
        </li>
      </ol>
    </div>
  );
}

/* ── 04 Hired ─────────────────────────────────────── */
export function HiredVisual() {
  return (
    <div className="w-full max-w-[420px]">
      <div className="border border-ink bg-paper">
        <div className="flex items-center justify-between border-b border-ink px-4 py-2.5">
          <span className="label">Job #0407 · Kothrud · ₹850/day</span>
          <span data-anim style={d(200)} className="label inline-flex items-center gap-1.5 bg-ok px-2 py-1 text-paper">
            <Check className="size-3" aria-hidden /> Accepted
          </span>
        </div>
        <div className="grid grid-cols-2 border-b border-line">
          <div className="border-r border-line p-4">
            <p className="label text-concrete">Worker</p>
            <p className="mt-1 font-display text-[18px] font-semibold tracking-tight">Ramesh Pawar</p>
            <p className="text-[13px] text-concrete-dark">Plumber · 4.8★ · 12 jobs</p>
          </div>
          <div className="p-4">
            <p className="label text-concrete">Employer</p>
            <p className="mt-1 font-display text-[18px] font-semibold tracking-tight">Sunita D.</p>
            <p className="text-[13px] text-concrete-dark">Kothrud · 1 day · from tomorrow</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 p-4">
          <div>
            <p className="label text-concrete">Contact, now shared both ways</p>
            <p className="ks-reveal mt-1 font-mono text-[20px] font-semibold tabular-nums" style={d(500)}>
              +91 98765 43210
            </p>
          </div>
          <span className="grid size-11 place-items-center bg-hivis text-ink" aria-hidden>
            <Phone className="size-5" />
          </span>
        </div>
      </div>
      <p data-anim style={d(800)} className="label mt-3 text-concrete-dark">
        Phone numbers stay hidden until both sides say yes.
      </p>
    </div>
  );
}
