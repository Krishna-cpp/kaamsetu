'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useEffect, useLayoutEffect, useState, type DependencyList, type RefObject } from 'react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };

export const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

/** True on mouse/trackpad devices: used to gate cursor effects. */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const on = () => setFine(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return fine;
}

/**
 * useGSAP-style helper: runs `setup` inside a gsap.context scoped to `scope`
 * and reverts everything (tweens, ScrollTriggers, SplitTexts) on unmount.
 */
export function useGsapContext(scope: RefObject<HTMLElement | null>, setup: (reduced: boolean) => void, deps: DependencyList = []) {
  useIsoLayoutEffect(() => {
    const el = scope.current;
    if (!el) return;
    const ctx = gsap.context(() => setup(prefersReducedMotion()), el);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Today's date in IST (YYYY-MM-DD), plus `addDays`. */
export function istDate(addDays = 0): string {
  return new Date(Date.now() + 5.5 * 3_600_000 + addDays * 86_400_000).toISOString().slice(0, 10);
}
