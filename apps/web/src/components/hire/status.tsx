'use client';

import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import type { MatchStatus } from '@kaamsetu/core';

export const STATUS_META: Record<MatchStatus, { label: string; bg: string; fg: string; step: number }> = {
  suggested: { label: 'Shortlisted', bg: '#EBE5D8', fg: '#5F5D58', step: 0 },
  alerted: { label: 'Alerted', bg: '#D9D3C7', fg: '#121210', step: 1 },
  viewed: { label: 'Listened', bg: '#FFD23F', fg: '#121210', step: 2 },
  accepted: { label: 'Accepted', bg: '#FF5B14', fg: '#121210', step: 3 },
  declined: { label: 'Declined', bg: '#F3EFE6', fg: '#8C8A84', step: 3 },
};

/** Status chip with a 3-step tick strip; colour morphs when the status changes. */
export function StatusChip({ status, className }: { status: MatchStatus; className?: string }) {
  const m = STATUS_META[status];
  const reduce = useReducedMotion();
  return (
    <motion.span
      layout={!reduce}
      initial={false}
      animate={{ backgroundColor: m.bg, color: m.fg }}
      transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'label inline-flex h-6 items-center gap-1.5 whitespace-nowrap border px-2',
        status === 'declined' ? 'border-dashed border-concrete line-through decoration-1' : 'border-ink',
        className,
      )}
      aria-label={`Status: ${m.label}`}
    >
      <span className="flex gap-[2px]" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={clsx('h-2 w-[3px] transition-colors duration-300', i <= m.step ? (status === 'declined' ? 'bg-concrete' : 'bg-ink') : 'bg-ink/15')}
          />
        ))}
      </span>
      <motion.span key={status} initial={reduce ? false : { y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.22 }}>
        {m.label}
      </motion.span>
    </motion.span>
  );
}
