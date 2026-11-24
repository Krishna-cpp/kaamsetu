'use client';

import clsx from 'clsx';
import { WEIGHTS, type ScoreBreakdown } from '@kaamsetu/core';

export const SCORE_PARTS: { key: keyof ScoreBreakdown; label: string; color: string }[] = [
  { key: 'skill', label: 'Skill', color: '#121210' },
  { key: 'proximity', label: 'Proximity', color: '#FF5B14' },
  { key: 'wage', label: 'Wage fit', color: '#FFD23F' },
  { key: 'trust', label: 'Trust', color: '#5F5D58' },
  { key: 'availability', label: 'Availability', color: '#A8A59D' },
];

/** Segmented 0–100 bar: each segment = weight × component. Hover/focus reveals the legend. */
export function ScoreBar({ breakdown, score, className }: { breakdown: ScoreBreakdown; score: number; className?: string }) {
  return (
    <div className={clsx('group/score relative', className)}>
      <div
        tabIndex={0}
        role="img"
        aria-label={`Match score ${Math.round(score)} of 100. ${SCORE_PARTS.map((p) => `${p.label} ${Math.round(WEIGHTS[p.key] * breakdown[p.key] * 100)} of ${WEIGHTS[p.key] * 100}`).join(', ')}`}
        className="flex h-2 w-full gap-px bg-paper-2 outline-offset-2"
      >
        {SCORE_PARTS.map((p) => (
          <span key={p.key} className="relative h-full bg-line/60" style={{ width: `${WEIGHTS[p.key] * 100}%` }}>
            <span className="absolute inset-y-0 left-0 transition-[width] duration-500" style={{ width: `${breakdown[p.key] * 100}%`, background: p.color }} />
          </span>
        ))}
      </div>
      <div
        role="tooltip"
        className="pointer-events-none absolute left-0 top-4 z-20 w-60 border border-ink bg-paper p-3 opacity-0 shadow-[4px_4px_0_0_#121210] transition-opacity duration-150 group-focus-within/score:opacity-100 group-hover/score:opacity-100"
      >
        <p className="label mb-2 text-concrete-dark">Why this score · {Math.round(score)}/100</p>
        <ul className="space-y-1.5">
          {SCORE_PARTS.map((p) => (
            <li key={p.key} className="flex items-center gap-2 text-xs">
              <span className="size-2.5 shrink-0 border border-ink/20" style={{ background: p.color }} />
              <span className="flex-1">{p.label}</span>
              <span className="font-mono tabular-nums text-concrete-dark">
                {Math.round(WEIGHTS[p.key] * breakdown[p.key] * 100)}
                <span className="text-concrete">/{WEIGHTS[p.key] * 100}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
