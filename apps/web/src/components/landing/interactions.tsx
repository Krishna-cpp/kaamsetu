'use client';

import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { gsap } from './gsap';

function canHover() {
  return (
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Pulls its child gently toward the cursor (fine pointers only). */
export function Magnetic({ children, strength = 0.32, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover()) return;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.killTweensOf(el);
    };
  }, [strength]);
  return (
    <div ref={ref} className={clsx('inline-block will-change-transform', className)}>
      {children}
    </div>
  );
}

/**
 * Card with a surveyor's crosshair + soft highlight that follows the cursor.
 * Sets --mx/--my; CSS in globals (.ks-spot) draws the effect. Off on touch.
 */
export function SpotCard({
  children,
  className,
  as: Tag = 'div',
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li';
  dark?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !canHover()) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        el.dataset.spot = 'on';
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      el.dataset.spot = 'off';
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
    };
  }, []);
  return (
    <Tag ref={(n: HTMLElement | null) => void (ref.current = n)} className={clsx('ks-spot', dark && 'ks-spot-dark', className)} data-spot="off">
      {children}
    </Tag>
  );
}
