'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';
import { gsap, ScrollTrigger } from './gsap';

/**
 * Lenis smooth scroll for the landing page only, driven by the GSAP ticker so
 * ScrollTrigger pins/scrubs stay in lock-step. Disabled for reduced motion.
 */
export function SmoothScroll() {
  // Keep ScrollTrigger positions in sync with the real page height. Fonts arriving late and lazily
  // loaded sections change the layout after triggers were measured; stale triggers leave content
  // stuck in its pre-animation state (the "empty page" bug). Refresh whenever the document height changes.
  useEffect(() => {
    let last = 0;
    let t = 0;
    const refresh = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const h = document.documentElement.scrollHeight;
        if (Math.abs(h - last) < 2) return;
        ScrollTrigger.refresh();
        last = document.documentElement.scrollHeight; // includes pin spacing → no refresh loop
      }, 150);
    };
    const ro = new ResizeObserver(refresh);
    ro.observe(document.body);
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener('load', onLoad);
    return () => {
      window.clearTimeout(t);
      ro.disconnect();
      window.removeEventListener('load', onLoad);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.11, anchors: { offset: -56 } });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // honour a /#how deep link after hydration
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target instanceof HTMLElement) requestAnimationFrame(() => lenis.scrollTo(target, { immediate: true, offset: -56 }));
    }
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    };
  }, []);
  return null;
}
