'use client';

import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, RotateCw } from 'lucide-react';
import { useState } from 'react';
import { skillLabel, WEIGHTS, type PublicWorker } from '@kaamsetu/core';
import type { JobView } from '@/lib/api';
import { inr } from '@/lib/format';
import { MatchCard } from './match-card';
import { SCORE_PARTS, ScoreBar } from './score-bar';
import { StatusChip } from './status';

interface Props {
  view: JobView | null;
  posting: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  activeId: string | null;
  selectedId: string | null;
  celebrate: Set<string>;
  workerOverrides: Record<string, PublicWorker>;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onRespond: (matchId: string, action: 'accepted' | 'declined') => Promise<void>;
  onRated: (w: PublicWorker) => void;
  workerCount: number;
  /** rendered inside the mobile bottom sheet: sticky to the sheet, tighter header */
  inSheet?: boolean;
}

export function MatchList(p: Props) {
  if (p.error && !p.view) return <ErrorState message={p.error} onRetry={p.onRetry} />;
  if (p.posting || (!p.view && p.loading)) return <Skeletons />;
  if (!p.view) return <EmptyState workerCount={p.workerCount} inSheet={p.inSheet} />;
  return <Loaded {...p} view={p.view} />;
}

function Loaded({ inSheet = false, view, activeId, selectedId, celebrate, workerOverrides, onHover, onSelect, onRespond, onRated, error, onRetry }: Props & { view: JobView }) {
  const reduce = useReducedMotion();
  const [showMore, setShowMore] = useState(false);
  const { job, matches, counts } = view;
  const alerted = matches.filter((m) => m.status !== 'suggested').sort((a, b) => a.rank - b.rank);
  const suggested = matches.filter((m) => m.status === 'suggested').sort((a, b) => a.rank - b.rank);
  const sent = counts.alerted + counts.viewed + counts.accepted + counts.declined;
  const listened = counts.viewed + counts.accepted + counts.declined;
  const hired = counts.accepted;
  const filled = job.status === 'filled' || hired >= job.workersNeeded;

  return (
    <div className="flex flex-col">
      <header className={clsx('sticky z-20 border-b border-line bg-paper/95 px-4 pb-3 backdrop-blur-sm sm:px-5', inSheet ? 'top-0 pt-0.5' : 'top-14 pt-4 lg:top-0')}>
        <div className="flex items-center justify-between gap-2">
          <p className="label truncate text-concrete-dark">
            JOB #{job.code} · {job.locality} · {inr(job.wagePerDay)}/day
          </p>
          <span
            className={clsx(
              'label inline-flex items-center gap-1.5 px-1.5 py-0.5',
              filled ? 'bg-hivis text-ink' : 'bg-ink text-paper',
            )}
          >
            {!filled && <span className="size-1.5 animate-pulse rounded-full bg-hivis" aria-hidden />}
            {filled ? 'Filled' : 'Live'}
          </span>
        </div>
        <h2 className={clsx('font-display font-bold leading-[1.05] tracking-tight', inSheet ? 'mt-1 text-[22px]' : 'mt-2 text-[26px]')}>
          {job.workersNeeded} × {skillLabel(job.skill)}
          <span className="serif-i font-normal text-concrete-dark">
            {' '}
            for {job.durationDays} day{job.durationDays > 1 ? 's' : ''}
          </span>
        </h2>

        {/* hired progress */}
        <div className={inSheet ? 'mt-2' : 'mt-3'}>
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium" aria-live="polite">
              <span className="font-mono">{Math.min(hired, job.workersNeeded)}</span> of <span className="font-mono">{job.workersNeeded}</span> hired
            </p>
            <p className="label text-concrete">{filled ? 'All slots filled' : 'Waiting for replies'}</p>
          </div>
          <div className="mt-1.5 flex gap-1" aria-hidden>
            {Array.from({ length: job.workersNeeded }, (_, i) => (
              <span key={i} className={clsx('h-1.5 flex-1 transition-colors duration-500', i < hired ? 'bg-hivis' : 'hazard hazard-anim opacity-30')} />
            ))}
          </div>
        </div>

        {/* funnel */}
        <dl className="mt-3 grid grid-cols-4 border border-line">
          {[
            { k: 'Alerted', v: sent },
            { k: 'Listened', v: listened },
            { k: 'Accepted', v: counts.accepted, hot: true },
            { k: 'Declined', v: counts.declined },
          ].map((f, i) => (
            <div key={f.k} className={clsx('px-2 py-1.5', i > 0 && 'border-l border-line')}>
              <dt className="label text-[9.5px] text-concrete">{f.k}</dt>
              <dd className={clsx('font-display text-xl font-bold tabular-nums leading-tight', f.hot && f.v > 0 && 'text-hivis-deep')}>
                <AnimatedNum v={f.v} />
              </dd>
            </div>
          ))}
        </dl>
        {error && (
          <p className="mt-2 flex items-center justify-between bg-signal px-2 py-1 text-xs" role="status">
            Connection hiccup, still retrying.
            <button type="button" onClick={onRetry} className="label underline">
              Retry
            </button>
          </p>
        )}
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-5">
        {alerted.length === 0 && suggested.length === 0 && (
          <div className="border border-dashed border-concrete p-5 text-sm text-concrete-dark">
            No one with this skill is within {job.radiusKm} km yet. Try a wider radius or a nearby locality.
          </div>
        )}
        {alerted.length > 0 && (
          <p className="label text-concrete">
            Voice alerts sent · {alerted.length} worker{alerted.length > 1 ? 's' : ''}
          </p>
        )}
        <motion.ol layout={!reduce} className="space-y-4">
          <AnimatePresence initial={!reduce}>
            {alerted.map((m, i) => (
              <motion.li
                key={m.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: reduce ? 0 : Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              >
                <MatchCard
                  match={m}
                  jobSkill={job.skill}
                  jobId={job.id}
                  active={activeId === m.workerId}
                  selected={selectedId === m.workerId}
                  celebrate={celebrate.has(m.id)}
                  worker={workerOverrides[m.workerId] ?? m.worker}
                  onHover={onHover}
                  onSelect={onSelect}
                  onRespond={onRespond}
                  onRated={onRated}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ol>

        {suggested.length > 0 && (
          <div className="border-t border-line pt-3">
            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className="label flex w-full items-center justify-between py-1.5 text-concrete-dark hover:text-ink"
            >
              Also nearby · {suggested.length} not alerted yet
              <ChevronDown className={clsx('size-4 transition-transform', showMore && 'rotate-180')} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {showMore && (
                <motion.ol
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden pt-4"
                >
                  {suggested.map((m) => (
                    <li key={m.id}>
                      <MatchCard
                        match={m}
                        jobSkill={job.skill}
                        jobId={job.id}
                        active={activeId === m.workerId}
                        celebrate={false}
                        worker={workerOverrides[m.workerId] ?? m.worker}
                        onHover={onHover}
                        onSelect={onSelect}
                        onRespond={onRespond}
                        onRated={onRated}
                      />
                    </li>
                  ))}
                </motion.ol>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function AnimatedNum({ v }: { v: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={v}
          className="inline-block"
          initial={reduce ? false : { y: '100%' }}
          animate={{ y: 0 }}
          exit={reduce ? undefined : { y: '-100%' }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {v}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function Skeletons() {
  return (
    <div className="space-y-4 px-4 py-5 sm:px-5" role="status" aria-label="Finding workers">
      <p className="label flex items-center gap-2 text-concrete-dark">
        <span className="hazard hazard-anim inline-block h-2 w-8" aria-hidden /> Ranking workers nearby…
      </p>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border border-line p-3.5" style={{ opacity: 1 - i * 0.18 }}>
          <div className="flex gap-3">
            <div className="skeleton size-12" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="skeleton mt-4 h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ workerCount, inSheet = false }: { workerCount: number; inSheet?: boolean }) {
  return (
    <div className={clsx('flex h-full flex-col px-5', inSheet ? 'pb-6 pt-1' : 'py-6')}>
      <p className="label text-concrete">Matches</p>
      <h2 className="mt-2 font-display text-[28px] font-bold leading-[1.02] tracking-tight">
        Ranked, nearby, <span className="serif-i font-normal">and explained.</span>
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-concrete-dark">
        Post a job and the top workers get a voice alert on Telegram in their language. You&rsquo;ll watch them listen and reply here, live.
      </p>

      <div className="mt-6 border border-ink">
        <p className="label border-b border-ink bg-ink px-3 py-2 text-paper">How every match is scored · /100</p>
        <ul className="divide-y divide-line">
          {SCORE_PARTS.map((s) => (
            <li key={s.key} className="flex items-center gap-3 px-3 py-2.5">
              <span className="size-3 shrink-0 border border-ink/20" style={{ background: s.color }} aria-hidden />
              <span className="flex-1 text-sm">{s.label}</span>
              <span className="h-1.5 w-24 bg-paper-2" aria-hidden>
                <span className="block h-full" style={{ width: `${(WEIGHTS[s.key] / 0.35) * 100}%`, background: s.color }} />
              </span>
              <span className="w-8 text-right font-mono text-sm tabular-nums">{Math.round(WEIGHTS[s.key] * 100)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-6" aria-hidden inert>
        <p className="label mb-2 text-concrete">Preview · what a match looks like</p>
        <div className="pointer-events-none select-none border border-dashed border-concrete bg-paper p-3.5 opacity-80">
          <div className="flex gap-3">
            <span className="grid size-12 shrink-0 place-items-center font-display text-lg font-bold" style={{ background: '#2F5D62', color: '#F3EFE6' }}>
              RP
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-[17px] font-semibold leading-tight">Ramesh Pawar</p>
                  <p className="text-[13px] text-concrete-dark">
                    Plumber · Kothrud · <span className="font-mono">1.2 km</span>
                  </p>
                </div>
                <p className="font-display text-2xl font-bold leading-none">91</p>
              </div>
            </div>
          </div>
          <ScoreBar className="mt-3" breakdown={{ skill: 1, proximity: 0.85, wage: 0.9, trust: 0.82, availability: 1 }} score={91} />
          <div className="mt-3 flex items-center justify-between">
            <StatusChip status="accepted" />
            <span className="label text-[10px] text-concrete">Contact unlocks on accept</span>
          </div>
        </div>
      </div>

      <p className="label mt-auto flex items-center gap-2 pt-6 text-concrete-dark">
        <span className="relative inline-flex size-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-hivis/60" />
          <span className="relative size-2 rounded-full bg-hivis" />
        </span>
        {workerCount ? `${workerCount} workers on the map right now` : 'Loading workers…'}
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="m-5 border border-ink" role="alert">
      <div className="hazard h-2" aria-hidden />
      <div className="p-5">
        <p className="label text-concrete-dark">Couldn&rsquo;t load matches</p>
        <p className="mt-2 font-display text-xl font-semibold leading-tight">{message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="label mt-4 inline-flex h-10 items-center gap-2 bg-ink px-4 text-paper hover:bg-hivis hover:text-ink"
        >
          <RotateCw className="size-3.5" aria-hidden /> Try again
        </button>
      </div>
    </div>
  );
}
