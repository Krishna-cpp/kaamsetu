'use client';

import { jobAlertText, LANGUAGES, type Language } from '@kaamsetu/core';
import clsx from 'clsx';
import { Pause, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { captionMs, ClipPlayer } from './clip-player';
import { istDate } from './gsap';
import { SpotCard } from './interactions';
import { Waveform } from './waveform';

const ORDER: Language[] = ['hi', 'mr', 'en'];
const SEEDS: Record<Language, number> = { hi: 5, mr: 13, en: 21 };

export function LanguageShowcase() {
  const [today, tomorrow] = useMemo(() => [istDate(0), istDate(1)], []);
  const texts = useMemo(
    () =>
      Object.fromEntries(
        ORDER.map((l) => [
          l,
          jobAlertText(l, { workerName: 'Ramesh Pawar', skill: 'plumber', locality: 'Kothrud', distanceKm: 1.2, wage: 850, days: 1, startDate: tomorrow, today }),
        ]),
      ) as Record<Language, string>,
    [today, tomorrow],
  );
  const player = useRef<ClipPlayer | null>(null);
  const [playing, setPlaying] = useState<Language | null>(null);
  const [tab, setTab] = useState<Language>('hi');

  useEffect(() => {
    player.current = new ClipPlayer();
    return () => {
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  const toggle = async (l: Language) => {
    const p = player.current;
    if (!p) return;
    if (playing === l) {
      p.stop();
      setPlaying(null);
      return;
    }
    p.unlock();
    setPlaying(l);
    const r = await p.play(`/audio/demo/alert-${l}.mp3`, captionMs(texts[l]));
    if (r === 'ended') setPlaying((cur) => (cur === l ? null : cur));
  };

  return (
    <section aria-labelledby="lang-title" className="relative bg-paper">
      <div className="container-x py-20 md:py-28">
        <div className="grid grid-cols-1 gap-4 border-b border-ink pb-5 md:grid-cols-12">
          <p className="label md:col-span-3">§ 04 · One alert, three languages</p>
          <h2 id="lang-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
            Spoken in the language <span className="serif-i text-hivis">he thinks in.</span>
          </h2>
        </div>
        <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-ink/80 md:ml-[25%] md:text-[17px]">
          The same job, rendered by the same template the bot uses, then voiced by ElevenLabs Multilingual. Workers set their language once, by voice; every alert after that arrives in it.
        </p>

        {/* mobile tabs */}
        <div role="tablist" aria-label="Alert language" className="mt-8 grid grid-cols-3 border border-ink md:hidden">
          {ORDER.map((l) => (
            <button
              key={l}
              role="tab"
              type="button"
              aria-selected={tab === l}
              aria-controls={`lang-panel-${l}`}
              id={`lang-tab-${l}`}
              onClick={() => setTab(l)}
              className={clsx('py-3 text-[15px] font-semibold transition-colors [&:not(:first-child)]:border-l [&:not(:first-child)]:border-ink', tab === l ? 'bg-ink text-paper' : 'bg-paper')}
            >
              <span lang={l}>{LANGUAGES[l].nativeName}</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 border-ink md:mt-12 md:grid-cols-3 md:border-t md:border-l">
          {ORDER.map((l, i) => {
            const isDeva = LANGUAGES[l].script === 'Deva';
            return (
              <SpotCard
                key={l}
                as="article"
                className={clsx('relative flex-col border border-ink md:flex md:border-0 md:border-r md:border-b', tab === l ? 'flex' : 'hidden')}
              >
                <div id={`lang-panel-${l}`} role="tabpanel" aria-labelledby={`lang-tab-${l}`} className="flex h-full flex-col">
                  <header className="flex items-center justify-between border-b border-line px-5 py-3">
                    <span className="label">
                      0{i + 1} · {LANGUAGES[l].name}
                    </span>
                    <span className="label text-concrete">{LANGUAGES[l].locale}</span>
                  </header>
                  <div className="flex flex-1 flex-col px-5 pb-5 pt-6 md:px-7 md:pt-8">
                    <p lang={l} className={clsx(isDeva ? 'text-[44px] font-bold leading-none md:text-[56px]' : 'display text-[44px] md:text-[56px]', 'text-hivis')}>
                      {LANGUAGES[l].nativeName}
                    </p>
                    <p
                      lang={l}
                      className={clsx('mt-6 flex-1', isDeva ? 'text-[21px] leading-[1.6] font-medium md:text-[22px]' : 'text-[20px] leading-[1.5] md:text-[21px]')}
                    >
                      {texts[l]}
                    </p>
                    <div className="mt-8 flex items-center gap-4 border-t border-line pt-5">
                      <button
                        type="button"
                        onClick={() => void toggle(l)}
                        aria-label={playing === l ? `Stop ${LANGUAGES[l].name} alert` : `Play ${LANGUAGES[l].name} alert`}
                        className={clsx(
                          'grid size-12 shrink-0 place-items-center rounded-full transition-colors duration-200',
                          playing === l ? 'bg-ink text-paper' : 'bg-hivis text-ink hover:bg-ink hover:text-paper',
                        )}
                      >
                        {playing === l ? <Pause className="size-5" aria-hidden /> : <Play className="ml-0.5 size-5" aria-hidden />}
                      </button>
                      <Waveform seed={SEEDS[l]} bars={36} playing={playing === l} player={player.current} className="flex-1" height={32} />
                    </div>
                  </div>
                </div>
              </SpotCard>
            );
          })}
        </div>
        <p className="label mt-4 text-concrete-dark">Text generated live by jobAlertText() · Job #0407 · start: tomorrow (IST)</p>
      </div>
    </section>
  );
}
