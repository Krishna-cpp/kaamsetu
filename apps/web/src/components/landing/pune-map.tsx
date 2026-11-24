'use client';

import { PUNE_LOCALITIES, SKILLS, SKILL_CODES, type Skill } from '@kaamsetu/core';
import { useEffect, useRef, type RefObject } from 'react';

const C = {
  ink: '#121210',
  hivis: '#FF5B14',
  signal: '#FFD23F',
  concrete: '#8C8A84',
  line: '#D9D3C7',
  paper: '#F3EFE6',
  paper2: '#EBE5D8',
};

const B = { minLat: 18.435, maxLat: 18.648, minLng: 73.72, maxLng: 73.955 };
const COS = Math.cos((18.54 * Math.PI) / 180);

type LL = { lat: number; lng: number };
type Pt = { x: number; y: number };
type Worker = LL & { phase: number; skill: Skill };
type Job = LL & { phase: number; skill: Skill; locality: string };
type Match = { w: Worker; j: Job; t0: number; km: number; score: number };

export type MatchInfo = { skill: string; locality: string; km: number; score: number };

/** Mula–Mutha river, roughly. */
const RIVER: LL[] = [
  { lat: 18.446, lng: 73.765 },
  { lat: 18.468, lng: 73.79 },
  { lat: 18.49, lng: 73.812 },
  { lat: 18.506, lng: 73.832 },
  { lat: 18.519, lng: 73.846 },
  { lat: 18.531, lng: 73.861 },
  { lat: 18.541, lng: 73.879 },
  { lat: 18.545, lng: 73.9 },
  { lat: 18.552, lng: 73.922 },
  { lat: 18.561, lng: 73.95 },
];
const MULA: LL[] = [
  { lat: 18.612, lng: 73.74 },
  { lat: 18.6, lng: 73.77 },
  { lat: 18.578, lng: 73.795 },
  { lat: 18.565, lng: 73.812 },
  { lat: 18.548, lng: 73.836 },
  { lat: 18.531, lng: 73.861 },
];
const HILLS: (LL & { r: number; rings: number })[] = [
  { lat: 18.527, lng: 73.822, r: 0.011, rings: 6 }, // Vetal tekdi
  { lat: 18.448, lng: 73.86, r: 0.012, rings: 6 }, // Katraj ghat
  { lat: 18.5, lng: 73.775, r: 0.008, rings: 4 }, // Bavdhan hills
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function kmBetween(a: LL, b: LL) {
  const dy = (a.lat - b.lat) * 111;
  const dx = (a.lng - b.lng) * 111 * COS;
  return Math.hypot(dx, dy);
}

export function PuneMap({
  className,
  onMatch,
  avoid,
}: {
  className?: string;
  onMatch?: (m: MatchInfo) => void;
  /** element (e.g. the headline) whose box should stay clear of labels */
  avoid?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── data (deterministic) ──
    const rand = rng(7);
    const workers: Worker[] = [];
    const jobs: Job[] = [];
    const trades = SKILL_CODES.filter((s) => s !== 'security_guard' && s !== 'delivery');
    PUNE_LOCALITIES.forEach((l, i) => {
      const n = 2 + (i % 2);
      for (let k = 0; k < n; k++) {
        const a = rand() * Math.PI * 2;
        const d = 0.002 + rand() * 0.009;
        workers.push({ lat: l.lat + Math.sin(a) * d, lng: l.lng + Math.cos(a) * d, phase: rand() * 3, skill: trades[Math.floor(rand() * trades.length)] ?? 'helper' });
      }
      if (i % 3 !== 2) {
        const a = rand() * Math.PI * 2;
        jobs.push({ lat: l.lat + Math.sin(a) * 0.006, lng: l.lng + Math.cos(a) * 0.006, phase: rand() * 3, skill: trades[Math.floor(rand() * trades.length)] ?? 'helper', locality: l.name });
      }
    });

    // ── layout ──
    let W = 0;
    let H = 0;
    let dpr = 1;
    let ox = 0;
    let oy = 0;
    let scale = 1; // px per km
    let compact = false;
    let fixedLabels = false;
    let holes: { l: number; t: number; r: number; b: number }[] = [];
    const inHole = (p: Pt, pad = 0) => holes.some((h) => p.x > h.l - pad && p.x < h.r + pad && p.y > h.t - pad && p.y < h.b + pad);
    /** tight boxes around the actual glyphs of the `avoid` element */
    function measureHoles(origin: DOMRect) {
      holes = [];
      const el = avoid?.current;
      if (!el) return;
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        range.selectNodeContents(n);
        for (const r of Array.from(range.getClientRects())) {
          holes.push({ l: r.left - origin.left, t: r.top - origin.top + r.height * 0.26, r: r.right - origin.left, b: r.bottom - origin.top - r.height * 0.34 });
        }
      }
    }
    const stat = document.createElement('canvas');
    const sctx = stat.getContext('2d');

    const P = (p: LL): Pt => ({ x: ox + (p.lng - B.minLng) * 111 * COS * scale, y: oy + (B.maxLat - p.lat) * 111 * scale });

    function layout() {
      const r = canvas!.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(W * dpr);
      canvas!.height = Math.round(H * dpr);
      compact = W < 1024;
      measureHoles(r);
      fixedLabels = W >= 640;
      // region that the map is fitted into
      const box = compact
        ? { x: 12, y: 112, w: W - 24, h: W < 640 ? 262 : 420 }
        : { x: W * 0.34, y: 118, w: W * 0.66 - 48, h: Math.max(320, H - 118 - 190) };
      const kmW = (B.maxLng - B.minLng) * 111 * COS;
      const kmH = (B.maxLat - B.minLat) * 111;
      scale = Math.min(box.w / kmW, box.h / kmH);
      ox = box.x + (box.w - kmW * scale) / 2;
      oy = box.y + (box.h - kmH * scale) / 2;
      drawStatic();
    }

    function smooth(c: CanvasRenderingContext2D, pts: Pt[]) {
      const first = pts[0];
      if (!first) return;
      c.beginPath();
      c.moveTo(first.x, first.y);
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        c.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      const last = pts[pts.length - 1]!;
      c.lineTo(last.x, last.y);
    }

    function drawStatic() {
      if (!sctx) return;
      stat.width = canvas!.width;
      stat.height = canvas!.height;
      const c = sctx;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const tl = P({ lat: B.maxLat, lng: B.minLng });
      const br = P({ lat: B.minLat, lng: B.maxLng });

      // dot grid, 1 km pitch subdivided
      const step = Math.max(12, scale * 0.5);
      c.fillStyle = C.line;
      for (let x = tl.x; x <= br.x; x += step) {
        for (let y = tl.y; y <= br.y; y += step) c.fillRect(x, y, 1.2, 1.2);
      }
      // contours
      c.strokeStyle = 'rgba(140,138,132,0.35)';
      c.lineWidth = 0.75;
      HILLS.forEach((h, hi) => {
        for (let i = 1; i <= h.rings; i++) {
          c.beginPath();
          for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 40) {
            const k = 1 + 0.16 * Math.sin(3 * a + i * 0.6 + hi) + 0.08 * Math.sin(5 * a + i + hi * 2);
            const rr = h.r * (i / h.rings) * k;
            const p = P({ lat: h.lat + Math.sin(a) * rr, lng: h.lng + (Math.cos(a) * rr) / COS });
            if (a === 0) c.moveTo(p.x, p.y);
            else c.lineTo(p.x, p.y);
          }
          c.stroke();
        }
      });
      // rivers: wide paper band + hairline
      for (const river of [RIVER, MULA]) {
        const pts = river.map(P);
        smooth(c, pts);
        c.strokeStyle = C.paper2;
        c.lineWidth = Math.max(4, scale * 0.28);
        c.lineCap = 'round';
        c.stroke();
        smooth(c, pts);
        c.strokeStyle = 'rgba(140,138,132,0.55)';
        c.lineWidth = 0.75;
        c.stroke();
      }
      // roads: connect each locality to its nearest neighbours
      c.strokeStyle = 'rgba(18,18,16,0.11)';
      c.lineWidth = 1;
      const seen = new Set<string>();
      PUNE_LOCALITIES.forEach((a, i) => {
        const near = PUNE_LOCALITIES.map((b, j) => ({ j, d: kmBetween(a, b) }))
          .filter((x) => x.j !== i)
          .sort((x, y) => x.d - y.d)
          .slice(0, 3);
        near.forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (seen.has(key)) return;
          seen.add(key);
          const b = PUNE_LOCALITIES[j]!;
          const pa = P(a);
          const pb = P(b);
          c.beginPath();
          c.moveTo(pa.x, pa.y);
          c.lineTo(pb.x, pb.y);
          c.stroke();
        });
      });
      // frame ticks + graticule labels
      c.strokeStyle = C.ink;
      c.lineWidth = 1;
      const tick = 10;
      for (const [x, y, dx, dy] of [
        [tl.x, tl.y, 1, 1],
        [br.x, tl.y, -1, 1],
        [tl.x, br.y, 1, -1],
        [br.x, br.y, -1, -1],
      ] as const) {
        c.beginPath();
        c.moveTo(x, y + dy * tick);
        c.lineTo(x, y);
        c.lineTo(x + dx * tick, y);
        c.stroke();
      }
      c.font = '500 9px ui-monospace, "Geist Mono", monospace';
      c.fillStyle = C.concrete;
      c.textBaseline = 'alphabetic';
      if (!compact) {
        for (const lat of [18.45, 18.5, 18.55, 18.6]) {
          const p = P({ lat, lng: B.minLng });
          if (inHole(p, 30)) continue;
          c.fillRect(p.x - 4, p.y, 4, 1);
          c.fillText(`${lat.toFixed(2)}°N`, p.x - 46, p.y + 3);
        }
        for (const lng of [73.75, 73.8, 73.85, 73.9, 73.95]) {
          const p = P({ lat: B.minLat, lng });
          c.fillRect(p.x, p.y, 1, 4);
          c.fillText(`${lng.toFixed(2)}°E`, p.x - 18, p.y + 16);
        }
      }
      // locality marks + labels
      PUNE_LOCALITIES.forEach((l) => {
        const p = P(l);
        c.fillStyle = C.ink;
        c.fillRect(p.x - 3, p.y, 7, 1);
        c.fillRect(p.x, p.y - 3, 1, 7);
        if (inHole(p, 12)) return;
        if (fixedLabels || ['Kothrud', 'Hadapsar', 'Wakad', 'Shivajinagar', 'Kharadi', 'Katraj', 'Pimpri'].includes(l.name)) {
          c.fillStyle = 'rgba(18,18,16,0.6)';
          c.font = `500 ${compact ? 8.5 : 9.5}px ui-monospace, "Geist Mono", monospace`;
          c.fillText(l.name.toUpperCase(), p.x + 6, p.y - 5);
        }
      });
    }

    // ── animation ──
    const matches: Match[] = [];
    let lastMatch = -10_000;
    let raf = 0;
    let running = false;
    let last = 0;
    const mrand = rng(42);
    const start = performance.now();

    function spawnMatch(now: number) {
      const j = jobs[Math.floor(mrand() * jobs.length)];
      if (!j) return;
      const near = workers
        .map((w) => ({ w, d: kmBetween(w, j) }))
        .sort((a, b) => a.d - b.d)
        .slice(1, 5);
      const pick = near[Math.floor(mrand() * near.length)];
      if (!pick) return;
      const score = 0.78 + mrand() * 0.19;
      matches.push({ w: pick.w, j, t0: now, km: pick.d, score });
      if (matches.length > 3) matches.shift();
      onMatchRef.current?.({ skill: SKILLS[j.skill].label.en, locality: j.locality, km: Math.max(0.4, Math.round(pick.d * 10) / 10), score });
    }

    function ring(p: Pt, t: number, color: string, max: number) {
      const k = t % 1;
      ctx!.beginPath();
      ctx!.arc(p.x, p.y, 2 + k * max, 0, Math.PI * 2);
      ctx!.strokeStyle = color;
      ctx!.globalAlpha = (1 - k) * 0.7;
      ctx!.lineWidth = 1;
      ctx!.stroke();
      ctx!.globalAlpha = 1;
    }

    function frame(now: number) {
      const c = ctx!;
      const t = (now - start) / 1000;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, canvas!.width, canvas!.height);
      c.drawImage(stat, 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!reduced && now - lastMatch > 2100) {
        lastMatch = now;
        spawnMatch(now);
      }

      // workers
      for (const w of workers) {
        const p = P(w);
        const breathe = 0.5 + 0.5 * Math.sin(t * 1.4 + w.phase * 2);
        if (!reduced && w.phase < 1.2) ring(p, t * 0.33 + w.phase, C.hivis, 12);
        c.beginPath();
        c.arc(p.x, p.y, 2.4 + breathe * 0.6, 0, Math.PI * 2);
        c.fillStyle = C.hivis;
        c.fill();
      }
      // jobs
      for (const j of jobs) {
        const p = P(j);
        if (!reduced) ring(p, t * 0.25 + j.phase, C.ink, 9);
        c.fillStyle = C.signal;
        c.fillRect(p.x - 3.5, p.y - 3.5, 7, 7);
        c.strokeStyle = C.ink;
        c.lineWidth = 1;
        c.strokeRect(p.x - 3.5, p.y - 3.5, 7, 7);
      }
      // matches
      for (const m of matches) {
        const age = (now - m.t0) / 1000;
        if (age > 3.2) continue;
        const a = P(m.w);
        const b = P(m.j);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const lift = Math.min(60, len * 0.45);
        const cx = mx - (dy / len) * lift;
        const cy = my + (dx / len) * lift;
        const draw = Math.min(1, age / 0.7);
        const eased = 1 - Math.pow(1 - draw, 3);
        const fade = age > 2.4 ? Math.max(0, 1 - (age - 2.4) / 0.8) : 1;
        c.globalAlpha = fade;
        c.strokeStyle = C.hivis;
        c.lineWidth = 1.6;
        c.setLineDash([]);
        c.beginPath();
        const steps = 28;
        for (let i = 0; i <= steps * eased; i++) {
          const u = i / steps;
          const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x;
          const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y;
          if (i === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
        if (draw >= 1) {
          const k = Math.min(1, (age - 0.7) / 0.9);
          c.beginPath();
          c.arc(b.x, b.y, 4 + k * 22, 0, Math.PI * 2);
          c.strokeStyle = C.hivis;
          c.globalAlpha = fade * (1 - k);
          c.lineWidth = 1.5;
          c.stroke();
          c.globalAlpha = fade;
          // tag
          if (!inHole(b, 20)) {
          const label = `MATCH ${m.score.toFixed(2)} · ${m.km.toFixed(1)} KM`;
          c.font = '600 9.5px ui-monospace, "Geist Mono", monospace';
          const tw = c.measureText(label).width;
          // keep the tag inside the map: clear of the nav/meta band at the top and of every edge
          const tx = Math.max(8, Math.min(b.x + 10, W - tw - 18));
          const ty = Math.max(132, Math.min(b.y - 22, H - 32));
          c.fillStyle = C.ink;
          c.fillRect(tx, ty, tw + 10, 15);
          c.fillStyle = C.paper;
          c.fillText(label, tx + 5, ty + 11);
          }
        }
        c.globalAlpha = 1;
      }
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return; // ~30fps is plenty
      last = now;
      frame(now);
    }
    // Perf: keep the first frame static and start the loop only after the page has loaded and settled.
    let ready = false;
    function play() {
      if (running || reduced || !ready) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function pause() {
      running = false;
      cancelAnimationFrame(raf);
    }

    layout();
    let alive = true;
    const relayout = () => {
      if (!alive) return;
      layout();
      frame(performance.now());
    };
    void document.fonts?.ready.then(relayout);
    // the headline intro animates lines in from below; measure again once it has settled
    const settle = window.setTimeout(relayout, 1900);
    if (reduced) {
      // a single, composed still with two matches drawn in
      spawnMatch(performance.now() - 1500);
      spawnMatch(performance.now() - 1200);
      frame(performance.now());
    }

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible && !document.hidden) play();
      else pause();
    });
    io.observe(canvas);
    const onVis = () => (document.hidden || !visible ? pause() : play());
    document.addEventListener('visibilitychange', onVis);
    let startTimer = 0;
    const begin = () => {
      startTimer = window.setTimeout(() => {
        ready = true;
        if (visible && !document.hidden) play();
      }, 1200);
    };
    if (document.readyState === 'complete') begin();
    else window.addEventListener('load', begin, { once: true });
    frame(performance.now());
    let rt = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => {
        layout();
        frame(performance.now());
      }, 120);
    });
    ro.observe(canvas);

    return () => {
      alive = false;
      window.clearTimeout(settle);
      window.clearTimeout(startTimer);
      window.removeEventListener('load', begin);
      pause();
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(rt);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
