'use client';

import { ArrowUpRight, Github, Send } from 'lucide-react';
import Link from 'next/link';
import { useRef } from 'react';
import { TalkToKaamSetu } from '@/components/voice-agent';
import { gsap, useGsapContext } from './gsap';
import { Magnetic } from './interactions';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/';

export function FooterCta() {
  const root = useRef<HTMLElement>(null);

  useGsapContext(root, (reduced) => {
    if (reduced) return;
    gsap.fromTo(
      '[data-wm-char]',
      { yPercent: 105 },
      {
        yPercent: 0,
        ease: 'none',
        stagger: 0.06,
        scrollTrigger: { trigger: '[data-wm]', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
      },
    );
    gsap.fromTo(
      '[data-wm]',
      { scale: 0.92 },
      { scale: 1, ease: 'none', scrollTrigger: { trigger: '[data-wm]', start: 'top bottom', end: 'bottom bottom', scrub: true } },
    );
  });

  return (
    <footer ref={root} aria-labelledby="cta-title" className="relative overflow-hidden bg-ink text-paper">
      <div className="hazard hazard-anim h-3" aria-hidden />
      <div className="container-x pt-20 md:pt-28">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="label text-concrete">§ {process.env.NEXT_PUBLIC_FEATURE_SCHEMES === 'true' ? '07' : '06'} · Start</p>
            <h2 id="cta-title" className="display mt-4 text-[clamp(48px,7vw,120px)]">
              Say it. <span className="serif-i text-hivis">Get work.</span>
            </h2>
            <p lang="hi" className="mt-4 text-[22px] font-semibold text-paper/70 md:text-[26px]">
              बोलिए, काम पाइए। बोला, काम मिळवा।
            </p>
          </div>
          <div className="flex flex-col justify-end gap-3 md:col-span-5 md:items-end">
            <Magnetic>
              <TalkToKaamSetu variant="primary" />
            </Magnetic>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link href="/hire" className="ks-btn ks-btn-paper">
                Post a job <ArrowUpRight className="size-4" aria-hidden />
              </Link>
              <a href={BOT_URL} target="_blank" rel="noreferrer" className="ks-btn ks-btn-ghost">
                <Send className="size-4" aria-hidden /> Open the Telegram bot
              </a>
            </div>
          </div>
        </div>
      </div>

      <div data-wm className="mt-16 origin-bottom select-none md:mt-24" aria-hidden>
        <p className="display flex justify-center overflow-hidden whitespace-nowrap text-[clamp(64px,20.5vw,360px)] leading-[0.8] text-paper">
          {'KaamSetu'.split('').map((ch, i) => (
            <span key={i} data-wm-char className={`inline-block ${i >= 4 ? 'text-hivis' : ''}`}>
              {ch}
            </span>
          ))}
        </p>
      </div>

      <div className="container-x">
        <div className="label flex flex-col gap-3 border-t border-line-dark py-5 text-concrete sm:flex-row sm:items-center sm:justify-between">
          <span>Team Meteora · Devnovate 2026 · MIT licence</span>
          <span className="flex items-center gap-5">
            <Link href="/about" className="transition-colors hover:text-paper">
              About &amp; architecture
            </Link>
            <a href="https://github.com/Krishna-cpp/kaamsetu" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-paper">
              <Github className="size-3.5" aria-hidden /> GitHub
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
