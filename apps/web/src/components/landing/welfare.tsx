'use client';

import clsx from 'clsx';
import { Hand } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './gsap';

const SCHEMES_ON = process.env.NEXT_PUBLIC_FEATURE_SCHEMES === 'true';

const STEPS = [
  { n: '01', lead: 'Work through KaamSetu,', rest: 'and every completed job is counted.' },
  { n: '02', lead: 'Cross 90 construction days,', rest: 'and you may qualify for the welfare board.' },
  { n: '03', lead: 'Ask “benefits”', rest: 'and get the checklist, the nearest help centre and a printable work record.' },
];

const FROM = 88;
const TO = 91;
const SCALE = 100; // bar runs 0–100 days; the board threshold sits at 90

/** § 05 · Work and welfare: the 90-day story (Scheme Finder, opt-in). Renders nothing when the flag is off. */
export function Welfare() {
  if (!SCHEMES_ON) return null;
  return <WelfareSection />;
}

function WelfareSection() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [days, setDays] = useState(FROM);
  const [seen, setSeen] = useState(false);

  // count 88 → 91 once, when the numeral scrolls into view
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!seen) return;
    if (reduce) {
      setDays(TO);
      return;
    }
    let d = FROM;
    const t = window.setInterval(() => {
      d += 1;
      setDays(d);
      if (d >= TO) window.clearInterval(t);
    }, 520);
    return () => window.clearInterval(t);
  }, [seen, reduce]);

  const crossed = days >= 90;

  return (
    <section aria-labelledby="welfare-title" className="relative bg-ink text-paper">
      <div className="hazard h-3" aria-hidden />
      <div className="container-x py-20 md:py-28">
        <div className="grid grid-cols-1 gap-4 border-b border-paper/30 pb-5 md:grid-cols-12">
          <p className="label text-paper/60 md:col-span-3">§ 05 · Work &amp; welfare</p>
          <h2 id="welfare-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
            Work and welfare, <span className="serif-i text-hivis">by voice.</span>
          </h2>
        </div>
        <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-paper/75 md:ml-[25%] md:text-[17px]">
          Building workers who log 90 days in a year can register with the construction welfare board. Most never get the proof together.
          KaamSetu keeps the count as they work.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-6">
          {/* numeral */}
          <div ref={ref} className="md:col-span-7 md:pr-8">
            <p className="label text-paper/60">Ramesh · plumber · Kothrud · construction days, last 12 months</p>
            <p className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2" aria-label={`${FROM} to ${TO} days`}>
              <span className="display text-[clamp(88px,13vw,208px)] tabular-nums text-paper/35" aria-hidden>
                {FROM}
              </span>
              <span className="display pb-[0.12em] text-[clamp(48px,6vw,96px)] text-paper/35" aria-hidden>
                →
              </span>
              <span
                className={clsx(
                  'display text-[clamp(88px,13vw,208px)] tabular-nums transition-colors duration-500',
                  crossed ? 'text-hivis' : 'text-paper',
                )}
                aria-hidden
              >
                {days}
              </span>
              <span className="serif-i pb-[0.2em] text-[clamp(32px,3.4vw,52px)] text-paper/80" aria-hidden>
                days
              </span>
            </p>

            {/* hazard tape toward the 90-day mark */}
            <div className="relative mt-8 pt-7">
              <span
                className="label absolute top-0 -translate-x-1/2 whitespace-nowrap text-[10px] text-signal"
                style={{ left: `${(90 / SCALE) * 100}%` }}
              >
                90 · board
              </span>
              <div className="relative h-7 border-2 border-paper" aria-hidden>
                <span
                  className={clsx(
                    'absolute inset-y-0 left-0 transition-[width,background-color] duration-500 ease-out',
                    crossed ? 'bg-hivis' : 'hazard',
                  )}
                  style={{ width: `${(days / SCALE) * 100}%` }}
                />
                <span className="absolute -inset-y-2 w-0.5 bg-signal" style={{ left: `${(90 / SCALE) * 100}%` }} />
              </div>
              <div className="label mt-2 flex justify-between text-[10px] text-paper/50" aria-hidden>
                <span>0</span>
                <span>{SCALE}</span>
              </div>
            </div>
            <p className="mt-5 text-[15px] leading-snug text-paper/75" aria-live="polite">
              {crossed ? (
                <>
                  <span className="font-semibold text-paper">One 3-day plumbing job later:</span> 91 days. The bot tells him, only because
                  he asked to be told.
                </>
              ) : (
                <>
                  <span className="font-semibold text-paper">{90 - days} days to go.</span> The next job is counted the moment the employer
                  marks it done.
                </>
              )}
            </p>
          </div>

          {/* story */}
          <div className="md:col-span-5">
            <ol className="border-t border-paper/30">
              {STEPS.map((s) => (
                <li key={s.n} className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 border-b border-paper/30 py-6">
                  <span className="label pt-1.5 text-hivis">{s.n}</span>
                  <p className="text-[19px] leading-snug md:text-[21px]">
                    <span className="font-display font-semibold tracking-tight">{s.lead}</span>{' '}
                    <span className="text-paper/75">{s.rest}</span>
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex items-start gap-3 border border-signal p-4">
              <Hand className="mt-0.5 size-5 shrink-0 text-signal" aria-hidden />
              <p className="text-[17px] font-semibold leading-snug">
                Opt-in: <span className="serif-i text-[20px] font-normal text-signal">we only ask when you want to check.</span>
              </p>
            </div>
          </div>
        </div>
        <p className="label mt-8 text-paper/50">Guidance, not a decision · the board and official sites decide eligibility</p>
      </div>
    </section>
  );
}
