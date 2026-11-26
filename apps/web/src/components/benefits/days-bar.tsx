import clsx from 'clsx';
import { Check } from 'lucide-react';

export const BOCW_DAYS = 90;

/** "88 / 90 construction days (last 12 months)": the hazard-tape progress bar toward the welfare-board threshold. */
export function DaysBar({ days, className }: { days: number; className?: string }) {
  const done = days >= BOCW_DAYS;
  const pct = Math.min(100, (days / BOCW_DAYS) * 100);
  const left = Math.max(0, BOCW_DAYS - days);
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-3">
        <p className="flex items-baseline gap-2">
          <span className={clsx('display text-[56px] tabular-nums sm:text-[64px]', done && 'text-hivis')}>{days}</span>
          <span className="font-display text-xl font-semibold tracking-tight text-concrete-dark">/ {BOCW_DAYS}</span>
        </p>
        {done ? (
          <span className="label mb-2 inline-flex items-center gap-1.5 bg-ink px-2 py-1 text-signal">
            <Check className="size-3.5" aria-hidden /> Threshold crossed
          </span>
        ) : (
          <span className="label mb-2 text-concrete-dark">
            {left} day{left === 1 ? '' : 's'} to go
          </span>
        )}
      </div>
      <div
        className="relative mt-3 h-6 border-2 border-ink bg-paper"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={BOCW_DAYS}
        aria-valuenow={Math.min(days, BOCW_DAYS)}
        aria-label="Construction days in the last 12 months"
      >
        <span className={clsx('absolute inset-y-0 left-0', done ? 'bg-hivis' : 'hazard')} style={{ width: `${pct}%` }} aria-hidden />
        {/* 30-day ticks */}
        {[1, 2].map((i) => (
          <span key={i} className="absolute inset-y-0 w-px bg-ink/40" style={{ left: `${(i / 3) * 100}%` }} aria-hidden />
        ))}
      </div>
      <div className="label mt-1.5 flex justify-between text-[10px] text-concrete" aria-hidden>
        <span>0</span>
        <span>30</span>
        <span>60</span>
        <span>90</span>
      </div>
      <p className="mt-3 text-[15px] font-medium leading-snug">
        {done ? (
          <>
            <span className="inline-flex items-center gap-1">
              <Check className="size-4 text-hivis-deep" strokeWidth={3} aria-hidden />
              90+ construction days:
            </span>{' '}
            may qualify for the construction welfare board.
          </>
        ) : (
          <>
            <span className="font-mono">{days}</span> / {BOCW_DAYS} construction days{' '}
            <span className="text-concrete-dark">(last 12 months)</span>
          </>
        )}
      </p>
    </div>
  );
}
