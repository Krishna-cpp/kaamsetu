'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGsapContext } from './gsap';

type Stat = {
  id: string;
  /** final rendered value (SSR / reduced motion) */
  final: string;
  from: number;
  to: number;
  fmt: (v: number) => string;
  kicker: string;
  caption: string;
  accent?: boolean;
};

const STATS: Stat[] = [
  {
    id: 'workers',
    final: '450M',
    from: 0,
    to: 450,
    fmt: (v) => `${Math.round(v)}M`,
    kicker: 'Informal workers',
    caption: 'Nine in ten Indian workers have no contract, no payslip, and no profile anywhere online.',
  },
  {
    id: 'cut',
    final: '10–30%',
    from: 10,
    to: 30,
    fmt: (v) => `10–${Math.round(v)}%`,
    kicker: 'The thekedar’s cut',
    caption: 'Work flows through a contractor who keeps a slice of every day’s wage, simply for knowing who needs whom.',
    accent: true,
  },
  {
    id: 'platforms',
    final: '0',
    from: 22,
    to: 0,
    fmt: (v) => `${Math.round(v)}`,
    kicker: 'Platforms in their language',
    caption: 'India has 22 scheduled languages. Job apps speak one, in text, on a desktop. A mason’s ₹7,000 phone speaks Marathi.',
  },
  {
    id: 'naka',
    final: '7 AM',
    from: 4,
    to: 7,
    fmt: (v) => `${Math.round(v)} AM`,
    kicker: 'At the labour naka',
    caption: 'The fallback: stand at a chowk at dawn and hope a tempo stops. Miss it, and the day is gone.',
  },
];

export function Problem() {
  const root = useRef<HTMLElement>(null);

  useGsapContext(root, (reduced) => {
    if (reduced) return;
    const mm = gsap.matchMedia();
    const rows = gsap.utils.toArray<HTMLElement>('[data-stat]');

    const counter = (row: HTMLElement, s: Stat) => {
      const num = row.querySelector<HTMLElement>('[data-num]');
      const obj = { v: s.from };
      return gsap.to(obj, {
        v: s.to,
        duration: 1,
        ease: 'power2.out',
        onUpdate: () => {
          if (num) num.textContent = s.fmt(obj.v);
        },
      });
    };

    mm.add('(min-width: 1024px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${window.innerHeight * 2.4}`, pin: true, scrub: 0.6, anticipatePin: 1 },
      });
      rows.forEach((row, i) => {
        const s = STATS[i];
        if (!s) return;
        const at = i * 1.1;
        tl.fromTo(row, { opacity: 0.12 }, { opacity: 1, duration: 0.4 }, at);
        tl.from(row.querySelector('[data-num]'), { yPercent: 40, duration: 0.8, ease: 'power3.out' }, at);
        tl.add(counter(row, s), at);
        tl.from(row.querySelector('[data-cap]'), { y: 24, opacity: 0, duration: 0.6 }, at + 0.2);
        tl.from(row.querySelector('[data-bar]'), { scaleX: 0, transformOrigin: 'left center', duration: 0.9, ease: 'none' }, at);
      });
      tl.to({}, { duration: 0.6 });
    });

    mm.add('(max-width: 1023px)', () => {
      rows.forEach((row, i) => {
        const s = STATS[i];
        if (!s) return;
        const tl = gsap.timeline({ scrollTrigger: { trigger: row, start: 'top 80%', once: true } });
        tl.add(counter(row, s), 0);
        tl.from(row.querySelector('[data-cap]'), { y: 16, opacity: 0, duration: 0.6 }, 0.15);
        tl.from(row.querySelector('[data-bar]'), { scaleX: 0, transformOrigin: 'left center', duration: 0.9 }, 0);
      });
    });
    ScrollTrigger.refresh();
  });

  return (
    <section ref={root} aria-labelledby="problem-title" className="relative bg-paper lg:h-[100svh]">
      <div className="container-x flex h-full flex-col pt-20 pb-10 lg:pt-20 lg:pb-8">
        <div className="grid grid-cols-1 gap-4 border-b border-ink pb-5 md:grid-cols-12">
          <p className="label md:col-span-3">§ 01 · The problem, in numbers</p>
          <h2 id="problem-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
            The work is <span className="serif-i text-hivis">nearby.</span> The way to find it isn’t.
          </h2>
        </div>
        <ol className="grid flex-1 grid-cols-1 md:grid-cols-2">
          {STATS.map((s, i) => (
            <li
              key={s.id}
              data-stat
              className={`relative flex flex-col justify-between gap-4 border-b border-line py-7 md:py-6 ${i % 2 === 0 ? 'md:border-r md:pr-8' : 'md:pl-8'}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <span className="label text-concrete">0{i + 1}</span>
                <span className="label">{s.kicker}</span>
              </div>
              <p
                data-num
                className={`display overflow-hidden text-[clamp(84px,11vw,184px)] tabular-nums ${s.accent ? 'text-hivis' : 'text-ink'}`}
                aria-label={`${s.final} ${s.kicker}`}
              >
                {s.final}
              </p>
              <div>
                <div className="relative mb-3 h-px bg-line">
                  <div data-bar className="absolute inset-0 bg-ink" />
                </div>
                <p data-cap className="max-w-[46ch] text-[15px] leading-[1.5] text-ink/80">
                  {s.caption}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
