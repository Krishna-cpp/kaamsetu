'use client';

import clsx from 'clsx';
import { useRef, useState, type ReactNode } from 'react';
import { gsap, ScrollTrigger, useGsapContext } from './gsap';
import { HiredVisual, MatchedVisual, SpeakVisual, UnderstoodVisual } from './how-visuals';

type Step = { n: string; title: string; em: string; deva: string; body: string; meta: string; visual: ReactNode };

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Speak',
    em: 'once.',
    deva: 'बोलिए',
    body: 'A worker sends one Telegram voice note, or calls Kaam Didi, in Hindi, Marathi or English. No forms, no typing, no app to install.',
    meta: 'Telegram · Phone agent · ElevenLabs Scribe',
    visual: <SpeakVisual />,
  },
  {
    n: '02',
    title: 'Understood',
    em: 'exactly.',
    deva: 'समझ गए',
    body: 'Speech becomes text; Amazon Nova pulls out name, trade, locality and wage; Amazon Location pins the area. The bot reads it back to confirm.',
    meta: 'Scribe STT · Bedrock Nova · Location Service',
    visual: <UnderstoodVisual />,
  },
  {
    n: '03',
    title: 'Matched',
    em: 'nearby.',
    deva: 'पास में',
    body: 'An explainable engine ranks every worker in the radius. No black box: each match shows why, weighted by skill, distance, wage, trust and availability.',
    meta: '0.35 skill · 0.25 proximity · 0.15 wage · 0.15 trust · 0.10 availability',
    visual: <MatchedVisual />,
  },
  {
    n: '04',
    title: 'Hired',
    em: 'directly.',
    deva: 'काम मिला',
    body: 'Top matches hear a spoken job alert in their own language. One tap on Accept and both sides get each other’s number. No thekedar in between.',
    meta: 'Multilingual TTS · Accept / Not interested',
    visual: <HiredVisual />,
  },
];

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useGsapContext(root, (reduced) => {
    const panels = gsap.utils.toArray<HTMLElement>('[data-panel]');
    const set = (i: number, on: boolean) => {
      const p = panels[i];
      if (p) p.dataset.active = on ? 'true' : 'false';
    };
    if (reduced) {
      panels.forEach((_, i) => set(i, true));
      return;
    }
    panels.forEach((_, i) => set(i, false));
    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      const el = track.current;
      if (!el) return;
      const distance = () => el.scrollWidth - window.innerWidth;
      const tween = gsap.to(el, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: root.current,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const pr = document.querySelector<HTMLElement>('[data-how-progress]');
            if (pr) pr.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      panels.forEach((p, i) => {
        ScrollTrigger.create({
          trigger: p,
          containerAnimation: tween,
          start: 'left 60%',
          end: 'right 40%',
          onToggle: (self) => {
            set(i, self.isActive || p.dataset.active === 'true');
            if (self.isActive) setActive(i);
          },
        });
      });
      set(0, true);
      return () => panels.forEach((_, i) => set(i, false));
    });

    mm.add('(max-width: 767px)', () => {
      panels.forEach((p, i) => {
        ScrollTrigger.create({
          trigger: p,
          start: 'top 70%',
          once: true,
          onEnter: () => set(i, true),
        });
      });
    });
  });

  return (
    <section id="how" ref={root} aria-labelledby="how-title" className="relative overflow-hidden border-t border-ink bg-paper motion-safe:md:h-[100svh]">
      <div className="flex h-full flex-col">
        <header className="container-x shrink-0 pt-20 md:pt-[72px]">
          <div className="grid grid-cols-1 items-end gap-4 border-b border-ink pb-4 md:grid-cols-12">
            <p className="label md:col-span-3">§ 02 · How it works</p>
            <h2 id="how-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9 lg:col-span-6">
              Four steps. <span className="serif-i text-hivis">Zero typing.</span>
            </h2>
            <ol className="hidden items-center justify-end gap-3 lg:col-span-3 lg:flex" aria-hidden>
              {STEPS.map((s, i) => (
                <li key={s.n} className={clsx('label transition-colors duration-300', i === active ? 'text-ink' : 'text-concrete')}>
                  {s.title}
                  {i < STEPS.length - 1 && <span className="ml-3 text-concrete">→</span>}
                </li>
              ))}
            </ol>
          </div>
          <div className="relative hidden h-[3px] bg-line motion-safe:md:block" aria-hidden>
            <div data-how-progress className="absolute inset-0 origin-left scale-x-0 bg-hivis" />
          </div>
        </header>

        <div className="min-h-0 flex-1">
          <div ref={track} className="flex h-full flex-col motion-safe:md:w-max motion-safe:md:flex-row">
            {STEPS.map((s, i) => (
              <article
                key={s.n}
                data-panel
                data-active="true"
                aria-labelledby={`how-${s.n}`}
                className="ks-step group/panel container-x grid shrink-0 grid-cols-1 gap-8 border-b border-line py-12 md:grid-cols-12 md:gap-6 md:py-8 motion-safe:md:h-full motion-safe:md:w-[86vw] motion-safe:md:max-w-none motion-safe:md:border-r motion-safe:md:border-b-0 motion-safe:lg:w-[78vw]"
              >
                <div className="flex flex-col md:col-span-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="display text-[clamp(96px,12vw,200px)] leading-[0.8] text-ink/[0.07] transition-colors duration-500 group-data-[active=true]/panel:text-ink" aria-hidden>
                      {s.n}
                    </span>
                    <span lang="hi" className="pt-2 text-[22px] font-semibold text-ink md:text-[26px]">
                      {s.deva}
                    </span>
                  </div>
                  <h3 id={`how-${s.n}`} className="display mt-6 text-[clamp(44px,5vw,84px)]">
                    {s.title} <span className="serif-i text-hivis">{s.em}</span>
                  </h3>
                  <p className="mt-5 max-w-[42ch] text-[16px] leading-[1.55] text-ink/85 md:text-[17px]">{s.body}</p>
                  <p className="label mt-auto border-t border-line pt-4 text-concrete-dark max-md:mt-6">{s.meta}</p>
                </div>
                <div className="flex items-center justify-center md:col-span-7 md:pl-6">{s.visual}</div>
              </article>
            ))}
            <div className="hidden w-[14vw] shrink-0 motion-safe:md:block lg:w-[22vw]" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
