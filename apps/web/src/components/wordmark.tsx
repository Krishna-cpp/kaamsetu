import clsx from 'clsx';

/** KaamSetu wordmark: a bridge-arc glyph + bilingual name. */
export function Wordmark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={clsx('inline-flex items-center gap-2', className)}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden className="shrink-0">
        <rect width="32" height="32" fill="var(--color-hivis)" />
        <path d="M5 23c3-8 7-12 11-12s8 4 11 12" fill="none" stroke={inverted ? 'var(--color-ink)' : 'var(--color-ink)'} strokeWidth="3" />
        <path d="M5 23h22M10 23v-5M16 23v-9M22 23v-5" stroke="var(--color-ink)" strokeWidth="2" />
      </svg>
      <span className="flex items-baseline gap-1.5">
        <span className={clsx('font-display text-[19px] font-bold tracking-[-0.04em]', inverted ? 'text-paper' : 'text-ink')}>KaamSetu</span>
        <span lang="hi" className={clsx('deva text-[13px] font-semibold', inverted ? 'text-paper/60' : 'text-concrete')}>
          काम सेतु
        </span>
      </span>
    </span>
  );
}
