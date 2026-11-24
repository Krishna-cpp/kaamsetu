'use client';

import clsx from 'clsx';
import { useEffect, useMemo, useRef } from 'react';
import { seededBars, type ClipPlayer } from './clip-player';

/**
 * Telegram-style voice-note waveform. Static, deterministic bars when idle;
 * while `playing`, bars are lit up to the playback progress and modulated by
 * the player's live level (Web Audio analyser, or the synthetic envelope).
 */
export function Waveform({
  seed,
  bars = 34,
  playing,
  player,
  className,
  tone = 'ink',
  height = 28,
}: {
  seed: number;
  bars?: number;
  playing: boolean;
  player?: ClipPlayer | null;
  className?: string;
  tone?: 'ink' | 'paper' | 'hivis';
  height?: number;
}) {
  const base = useMemo(() => seededBars(seed, bars), [seed, bars]);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;
    const nodes = Array.from(root.children) as HTMLElement[];
    if (!playing || !player) {
      nodes.forEach((n, i) => {
        n.style.transform = `scaleY(${base[i] ?? 0.3})`;
        n.dataset.lit = 'false';
      });
      return;
    }
    let raf = 0;
    const loop = () => {
      const p = player.progress();
      const lvl = player.level();
      const t = performance.now() / 1000;
      nodes.forEach((n, i) => {
        const b = base[i] ?? 0.3;
        const lit = i / nodes.length <= p;
        const wobble = 0.55 + lvl * (0.7 + 0.35 * Math.sin(t * 14 + i * 1.7));
        n.style.transform = `scaleY(${Math.max(0.1, Math.min(1, lit ? b * wobble : b))})`;
        n.dataset.lit = lit ? 'true' : 'false';
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, player, base]);

  return (
    <div
      ref={wrap}
      aria-hidden
      className={clsx('ks-wave flex items-center gap-[2px]', `ks-wave-${tone}`, className)}
      style={{ height }}
    >
      {base.map((b, i) => (
        <span key={i} data-lit="false" className="block h-full w-[3px] origin-center rounded-[1px]" style={{ transform: `scaleY(${b})` }} />
      ))}
    </div>
  );
}
