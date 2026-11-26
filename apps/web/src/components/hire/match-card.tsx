'use client';

import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BadgeCheck, Check, ClipboardCheck, ExternalLink, LoaderCircle, MoreHorizontal, Phone, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { skillLabel, type PublicWorker, type Skill } from '@kaamsetu/core';
import type { MatchView } from '@/lib/api';
import { initials, inr, km } from '@/lib/format';
import { tradeColor } from '@/components/ui/trade';
import { ScoreBar } from './score-bar';
import { StatusChip } from './status';
import { RatePanel } from './rate-panel';

interface Props {
  match: MatchView;
  jobSkill: Skill;
  jobId: string;
  active: boolean;
  selected?: boolean;
  celebrate: boolean;
  worker: PublicWorker;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onRespond: (matchId: string, action: 'accepted' | 'declined') => Promise<void>;
  onRated: (w: PublicWorker) => void;
  /** employer: mark an accepted job done + confirm the worker (feeds the Scheme Finder work record) */
  onComplete?: (matchId: string) => Promise<void>;
}

const SCHEMES_ON = process.env.NEXT_PUBLIC_FEATURE_SCHEMES === 'true';

export function MatchCard({ match: m, jobSkill, jobId, active, selected = false, celebrate, worker: w, onHover, onSelect, onRespond, onRated, onComplete }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [menu, setMenu] = useState(false);
  const [rating, setRating] = useState(false);
  const [rated, setRated] = useState(false);
  const skill = w.skills.includes(jobSkill) ? jobSkill : (w.skills[0] ?? jobSkill);
  const tc = tradeColor(skill);
  const accepted = m.status === 'accepted';
  const declined = m.status === 'declined';
  const done = SCHEMES_ON && accepted && !!m.completedAt;
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [selected, reduce]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [menu]);

  return (
    <motion.article
      ref={ref}
      layout={!reduce}
      transition={{ layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }}
      onMouseEnter={() => onHover(m.workerId)}
      onMouseLeave={() => onHover(null)}
      onFocusCapture={() => onHover(m.workerId)}
      className={clsx(
        'relative border bg-paper transition-[border-color,box-shadow,opacity] duration-200',
        accepted ? 'border-ink shadow-[4px_4px_0_0_#FF5B14]' : active ? 'border-ink shadow-[4px_4px_0_0_#121210]' : 'border-line hover:border-concrete',
        declined && 'opacity-60',
      )}
      aria-label={`Rank ${m.rank}: ${w.name}, score ${Math.round(m.score)}`}
    >
      <AnimatePresence>
        {celebrate && !reduce && (
          <motion.div
            className="ks-sweep z-10"
            initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }}
            animate={{ clipPath: 'inset(0 0% 0 0)', opacity: [1, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], opacity: { duration: 1.4, times: [0, 0.55, 1] } }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {m.rank === 1 && (
        <span className="label absolute -top-px left-3 -translate-y-1/2 bg-ink px-1.5 py-0.5 text-[10px] text-signal">#1 Best match</span>
      )}

      <div className="flex gap-3 p-3.5 pb-3">
        <button
          type="button"
          onClick={() => onSelect(m.workerId)}
          className="relative grid size-12 shrink-0 place-items-center font-display text-lg font-bold tracking-tight"
          style={{ background: tc.bg, color: tc.fg }}
          aria-label={`Show ${w.name} on map`}
        >
          {initials(w.name)}
          <span className="label absolute -bottom-1 -right-1 grid size-5 place-items-center border border-ink bg-paper text-[10px] text-ink">{m.rank}</span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="flex items-center gap-1 truncate font-display text-[17px] font-semibold leading-tight tracking-tight">
                <span className="truncate">{w.name}</span>
                {w.verified && <BadgeCheck className="size-4 shrink-0 text-hivis" aria-label="Verified" />}
              </h3>
              <p className="mt-0.5 truncate text-[13px] text-concrete-dark">
                {skillLabel(skill)} · {w.locality} · <span className="font-mono">{km(m.distanceKm)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none tabular-nums tracking-tight">{Math.round(m.score)}</p>
              <p className="label mt-0.5 text-[9px] text-concrete">match</p>
            </div>
          </div>

          <dl className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
            <div className="flex items-center gap-1">
              <dt className="sr-only">Asks</dt>
              <dd className="font-mono">{inr(w.expectedWage)}/day</dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="sr-only">Rating</dt>
              <Star className="size-3 fill-ink" aria-hidden />
              <dd className="font-mono">
                {w.stats.ratingAvg.toFixed(1)} <span className="text-concrete">· {w.stats.jobsCompleted} jobs</span>
              </dd>
            </div>
            <div className="flex items-center gap-1">
              <dt className="label text-[10px] text-concrete">KaamScore</dt>
              <dd className="font-mono font-semibold">{w.kaamScore}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="px-3.5">
        <ScoreBar breakdown={m.breakdown} score={m.score} />
        <p className="mt-2 text-[12px] leading-snug text-concrete-dark">{m.why}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line px-3.5 py-2">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <StatusChip status={m.status} />
          {done && (
            <span className="label inline-flex h-6 items-center gap-1 whitespace-nowrap bg-ink px-2 text-signal">
              <Check className="size-3" strokeWidth={3} aria-hidden /> Done{m.employerConfirmed ? ' · confirmed' : ''}
            </span>
          )}
        </span>
        <div className="relative flex items-center gap-1">
          {accepted && !rated && (
            <button type="button" onClick={() => setRating((r) => !r)} className="label whitespace-nowrap px-2 py-1.5 hover:text-hivis" aria-expanded={rating}>
              Rate work
            </button>
          )}
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            className="grid size-8 place-items-center hover:bg-paper-2"
            aria-label={`More actions for ${w.name}`}
            aria-expanded={menu}
            aria-haspopup="menu"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
          <AnimatePresence>
            {menu && (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 z-30 mb-1 w-52 border border-ink bg-paper py-1 shadow-[4px_4px_0_0_#121210]"
              >
                <Link role="menuitem" href={`/w/${w.id}`} target="_blank" className="flex items-center justify-between px-3 py-2 text-sm hover:bg-paper-2">
                  View ID card <ExternalLink className="size-3.5" aria-hidden />
                </Link>
                <p className="label border-t border-line px-3 pb-1 pt-2 text-[10px] text-concrete">Demo controls</p>
                {(['accepted', 'declined'] as const).map((a) => (
                  <button
                    key={a}
                    role="menuitem"
                    type="button"
                    disabled={accepted || declined}
                    onClick={() => {
                      setMenu(false);
                      void onRespond(m.id, a);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-paper-2 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Simulate {a === 'accepted' ? 'accept' : 'decline'}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {accepted && (
          <motion.div
            key="contact"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 bg-ink px-3.5 py-2.5 text-paper">
              <div className="min-w-0">
                <p className="label text-[10px] text-signal">Contact unlocked</p>
                <p className="truncate font-mono text-sm">{m.contactPhone ?? 'Shared on Telegram'}</p>
              </div>
              {m.contactPhone && (
                <a href={`tel:${m.contactPhone.replace(/\s+/g, '')}`} className="label inline-flex h-9 items-center gap-1.5 bg-hivis px-3 text-ink hover:bg-signal">
                  <Phone className="size-3.5" aria-hidden /> Call
                </a>
              )}
            </div>
            {SCHEMES_ON && onComplete && !m.completedAt && (
              <button
                type="button"
                disabled={completing}
                onClick={async () => {
                  setCompleting(true);
                  try {
                    await onComplete(m.id);
                  } finally {
                    setCompleting(false);
                  }
                }}
                className="group flex min-h-11 w-full items-center justify-between gap-2 border-t border-ink bg-signal px-3.5 py-2 text-left text-ink transition-colors hover:bg-hivis disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {completing ? <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden /> : <ClipboardCheck className="size-4 shrink-0" aria-hidden />}
                  <span className="whitespace-nowrap font-display text-[15px] font-bold tracking-tight">
                    Mark job done <span className="font-sans text-[13px] font-medium text-ink/75">· confirm worker</span>
                  </span>
                </span>
                <span className="label shrink-0 text-[10px] text-ink/75 max-[400px]:hidden">Work record</span>
              </button>
            )}
          </motion.div>
        )}
        {accepted && rating && (
          <RatePanel
            key="rate"
            jobId={jobId}
            worker={w}
            onDone={(nw) => {
              setRating(false);
              setRated(true);
              onRated(nw);
            }}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
}
