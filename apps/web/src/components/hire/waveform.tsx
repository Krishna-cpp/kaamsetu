'use client';

import { useEffect, useRef } from 'react';

/** Live mic waveform: mirrored bars on a canvas. Idle = a calm flat hairline of dots. */
export function Waveform({ analyser, active, className }: { analyser: AnalyserNode | null; active: boolean; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const history: number[] = [];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) {
        c.width = w * dpr;
        c.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bar = 3;
      const gap = 3;
      const n = Math.floor(w / (bar + gap));
      let level = 0;
      if (analyser && data && active) {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        level = Math.min(1, Math.sqrt(sum / data.length) * 4.2);
      }
      history.push(level);
      while (history.length > n) history.shift();
      const mid = h / 2;
      for (let i = 0; i < n; i++) {
        const v = history[history.length - n + i] ?? 0;
        const amp = Math.max(1.5, v * (h / 2 - 2));
        const recent = i > n - 6;
        ctx.fillStyle = active ? (recent ? '#FF5B14' : '#121210') : '#C9C2B4';
        ctx.fillRect(i * (bar + gap), mid - amp, bar, amp * 2);
      }
      if (active && !reduce) raf = requestAnimationFrame(draw);
    };
    draw();
    if (active && reduce) {
      const id = window.setInterval(draw, 200);
      return () => window.clearInterval(id);
    }
    return () => cancelAnimationFrame(raf);
  }, [analyser, active]);

  return <canvas ref={canvas} className={className} aria-hidden />;
}
