'use client';

import clsx from 'clsx';
import { animate, motion, useDragControls, useMotionValue, useReducedMotion, type PanInfo } from 'framer-motion';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type SheetState = 'peek' | 'half' | 'full';
const ORDER: SheetState[] = ['peek', 'half', 'full'];
export const PEEK_PX = 132;
const HANDLE_PX = 28;

function heights(container: number) {
  const vh = typeof window === 'undefined' ? 844 : window.innerHeight;
  const full = Math.max(PEEK_PX + 40, Math.min(Math.round(vh * 0.92), container));
  const half = Math.min(full, Math.max(PEEK_PX + 40, Math.round(vh * 0.55)));
  return { peek: PEEK_PX, half, full } satisfies Record<SheetState, number>;
}

interface Props {
  state: SheetState;
  onStateChange: (s: SheetState) => void;
  /** element the sheet sits in (its height caps "full") */
  containerRef: React.RefObject<HTMLElement | null>;
  label: string;
  children: React.ReactNode;
}

/**
 * Mobile swipe-up sheet with three snap points. Drag from the handle/header (always) or from
 * anywhere when not at full; at full the inner list scrolls instead.
 */
export function BottomSheet({ state, onStateChange, containerRef, label, children }: Props) {
  const reduce = useReducedMotion();
  const controls = useDragControls();
  const [h, setH] = useState(() => heights(800));
  const y = useMotionValue(h.full - h.peek);
  const scroller = useRef<HTMLDivElement>(null);
  const lastDragEnd = useRef(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    const measure = () => setH(heights(el?.clientHeight ?? window.innerHeight));
    measure();
    window.addEventListener('resize', measure);
    const ro = el && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (el) ro?.observe(el);
    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, [containerRef]);

  const target = useCallback((s: SheetState) => h.full - h[s], [h]);

  useEffect(() => {
    const to = target(state);
    if (reduce) {
      y.set(to);
      return;
    }
    const c = animate(y, to, { type: 'spring', stiffness: 420, damping: 42, mass: 0.9 });
    return () => c.stop();
  }, [state, target, reduce, y]);

  useEffect(() => {
    if (state !== 'full' && scroller.current) scroller.current.scrollTop = 0;
  }, [state]);

  function onDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    lastDragEnd.current = Date.now();
    // nearest snap to where the sheet was released…
    const pos = y.get();
    let best: SheetState = state;
    let dist = Infinity;
    for (const s of ORDER) {
      const d = Math.abs(target(s) - pos);
      if (d < dist) {
        dist = d;
        best = s;
      }
    }
    // …unless it was a quick flick that didn't travel far: then step one snap in the flick direction
    const v = info.velocity.y;
    if (best === state && Math.abs(v) > 500) {
      const i = ORDER.indexOf(state) + (v < 0 ? 1 : -1);
      best = ORDER[Math.max(0, Math.min(ORDER.length - 1, i))] ?? state;
    }
    if (best === state) {
      if (reduce) y.set(target(state));
      else animate(y, target(state), { type: 'spring', stiffness: 420, damping: 42 });
    }
    onStateChange(best);
  }

  function startDrag(e: React.PointerEvent, fromHeader: boolean) {
    if (!fromHeader && state === 'full') return;
    controls.start(e);
  }

  const next = ORDER[(ORDER.indexOf(state) + 1) % ORDER.length] ?? 'peek';

  return (
    <motion.div
      className="absolute inset-x-0 bottom-0 z-30 flex flex-col border-t-2 border-ink bg-paper shadow-[0_-8px_24px_-12px_rgb(18_18_16/0.35)]"
      style={{ height: h.full, y }}
      drag="y"
      dragControls={controls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: h.full - h.peek }}
      dragElastic={0.08}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      role="region"
      aria-label={label}
    >
      <button
        type="button"
        onPointerDown={(e) => startDrag(e, true)}
        onClick={() => {
          if (Date.now() - lastDragEnd.current < 350) return; // the click that ends a drag
          onStateChange(next);
        }}
        aria-expanded={state !== 'peek'}
        aria-label={`${label}: ${state === 'peek' ? 'collapsed' : state === 'half' ? 'half open' : 'fully open'}. Activate to ${next === 'peek' ? 'collapse' : 'expand'}.`}
        className="flex w-full shrink-0 touch-none items-center justify-center bg-paper"
        style={{ height: HANDLE_PX }}
      >
        <span className="h-1 w-11 rounded-full bg-ink/70" aria-hidden />
      </button>
      <div
        ref={scroller}
        onPointerDown={(e) => startDrag(e, false)}
        className={clsx(
          'ks-scroll min-h-0 flex-1 overscroll-contain',
          state === 'full' ? 'touch-pan-y overflow-y-auto' : 'touch-none overflow-hidden',
        )}
      >
        {children}
      </div>
    </motion.div>
  );
}
