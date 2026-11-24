'use client';

import { Check, Link2, Pause, Play, Printer } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function IntroPlayer({ src, name }: { src: string; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <audio ref={ref} src={src} preload="none" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <button
        type="button"
        onClick={() => (playing ? ref.current?.pause() : void ref.current?.play())}
        className="label no-print inline-flex h-10 items-center gap-2 bg-ink px-4 text-paper hover:bg-hivis hover:text-ink"
        aria-label={playing ? `Pause ${name}'s voice intro` : `Play ${name}'s voice intro`}
      >
        {playing ? <Pause className="size-4" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
        {playing ? 'Pause' : 'Hear the voice intro'}
      </button>
    </>
  );
}

export function UtilityActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);
  return (
    <div className="no-print flex gap-2">
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(url).then(() => setCopied(true), () => undefined)}
        className="label inline-flex h-11 flex-1 items-center justify-center gap-2 border border-ink hover:bg-paper-2"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <button type="button" onClick={() => window.print()} className="label inline-flex h-11 flex-1 items-center justify-center gap-2 border border-ink hover:bg-paper-2">
        <Printer className="size-4" aria-hidden /> Print card
      </button>
    </div>
  );
}
