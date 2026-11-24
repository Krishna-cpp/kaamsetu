'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { TalkToKaamSetu } from '@/components/voice-agent';
import { gsap, SplitText, useGsapContext } from './gsap';
import { Magnetic } from './interactions';
import { PuneMap, type MatchInfo } from './pune-map';

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const [last, setLast] = useState<MatchInfo | null>(null);
  const [count, setCount] = useState(0);

  useGsapContext(root, (reduced) => {
    if (reduced) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    SplitText.create('[data-hero-line]', {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit(self: SplitText) {
        return gsap.from(self.lines, { yPercent: 110, duration: 1.3, stagger: 0.09, ease: 'expo.out', delay: 0.1 });
      },
    });
    tl.from('[data-hero-fade]', { y: 18, opacity: 0, duration: 0.9, stagger: 0.07 }, 0.55);
    tl.from('[data-hero-map]', { opacity: 0, duration: 1.6, ease: 'power2.out' }, 0);
    tl.from('[data-hero-rule]', { scaleX: 0, transformOrigin: 'left center', duration: 1.2 }, 0.2);
    // subtle parallax as you leave the hero
    gsap.to('[data-hero-map]', {
      yPercent: 10,
      ease: 'none',
      scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden pt-14">
      <div className="grid-rules pointer-events-none absolute inset-0 -z-20 opacity-60" aria-hidden />
      <div data-hero-map className="absolute inset-0 -z-10">
        <PuneMap
          avoid={title}
          className="h-full w-full"
          onMatch={(m) => {
            setLast(m);
            setCount((c) => c + 1);
          }}
        />
      </div>

      {/* meta row */}
      <div className="container-x relative flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line py-3" data-hero-fade>
        <p className="label flex items-center gap-2">
          <span className="relative inline-flex size-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-hivis opacity-60" />
            <span className="relative size-2 rounded-full bg-hivis" />
          </span>
          Pune · 18.52°N 73.85°E · 60 workers online
        </p>
        <p className="label hidden text-concrete sm:block" aria-live="off">
          {last ? (
            <>
              Last match · <span className="text-ink">{last.skill}</span> → {last.locality} · {last.km.toFixed(1)} km
            </>
          ) : (
            'Listening for jobs…'
          )}
        </p>
      </div>

      <div className="container-x relative mt-auto pb-8 pt-[282px] sm:pt-[450px] md:pb-10 lg:pt-24">
        <p className="label mb-6 hidden items-center gap-3 lg:flex" data-hero-fade>
          <span className="inline-block h-px w-10 bg-ink" /> Vol. 01 · A job network that listens
        </p>
        <h1 ref={title} id="hero-title" className="display text-[clamp(72px,20vw,200px)] md:text-[clamp(96px,13.4vw,200px)]">
          <span data-hero-line className="block">
            Kaam milega.
          </span>
          <span data-hero-line className="serif-i block pr-[0.1em] text-hivis">
            Paas mein.
          </span>
        </h1>

        <div data-hero-rule className="mt-8 h-px w-full bg-ink md:mt-10" aria-hidden />

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="lg:col-span-5" data-hero-fade>
            <p className="max-w-[30ch] font-display text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] md:text-[28px]">
              Work, found by voice, within walking distance.
            </p>
            <p lang="hi" className="mt-3 text-[20px] font-semibold text-concrete-dark md:text-[22px]">
              काम मिलेगा। पास में।
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:col-span-7 lg:justify-end" data-hero-fade>
            <Magnetic>
              <TalkToKaamSetu />
            </Magnetic>
            <Magnetic strength={0.2}>
              <Link
                href="/hire"
                className="group inline-flex items-center gap-2 border border-ink px-5 py-4 font-display text-lg font-semibold tracking-tight transition-colors duration-200 hover:bg-ink hover:text-paper"
              >
                I&rsquo;m hiring
                <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
              </Link>
            </Magnetic>
          </div>
        </div>

        <div className="label mt-8 flex flex-wrap items-center justify-between gap-3 text-concrete" data-hero-fade>
          <span className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-hivis" /> Workers
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 border border-ink bg-signal" /> Jobs
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-px w-4 bg-hivis" /> Match
            </span>
          </span>
          <span className="tabular-nums">Simulated feed · {count} matches since you arrived</span>
        </div>
      </div>
    </section>
  );
}
