import clsx from 'clsx';
import type { ReactNode } from 'react';

/** Hand-built phone: ink body, paper screen, Telegram-ish chat chrome. */
export function PhoneFrame({
  children,
  className,
  title = 'KaamSetu',
  subtitle = 'bot · Hindi · मराठी · English',
  time = '7:02',
  footer,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  time?: string;
  footer?: ReactNode;
}) {
  return (
    <div className={clsx('relative rounded-[42px] bg-ink p-[9px] shadow-[0_1px_0_#2c2c28_inset,0_40px_80px_-40px_rgb(18_18_16/0.55)]', className)}>
      <div className="relative flex h-full flex-col overflow-hidden rounded-[34px] bg-paper text-ink">
        {/* status bar */}
        <div className="relative flex h-9 shrink-0 items-center justify-between px-6 text-[12px] font-semibold tabular-nums">
          <span>{time}</span>
          <span className="absolute left-1/2 top-2 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-ink" aria-hidden />
          <span className="flex items-center gap-1" aria-hidden>
            <span className="flex items-end gap-[2px]">
              {[4, 6, 8, 10].map((h) => (
                <span key={h} className="w-[3px] bg-ink" style={{ height: h }} />
              ))}
            </span>
            <span className="ml-1 inline-block h-[10px] w-[20px] rounded-[3px] border border-ink p-[1px]">
              <span className="block h-full w-3/5 bg-ink" />
            </span>
          </span>
        </div>
        {/* chat header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-line px-4 pb-2.5 pt-1">
          <svg width="34" height="34" viewBox="0 0 32 32" aria-hidden className="shrink-0">
            <rect width="32" height="32" fill="var(--color-hivis)" />
            <path d="M5 23c3-8 7-12 11-12s8 4 11 12" fill="none" stroke="var(--color-ink)" strokeWidth="3" />
            <path d="M5 23h22M10 23v-5M16 23v-9M22 23v-5" stroke="var(--color-ink)" strokeWidth="2" />
          </svg>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold">{title}</p>
            <p className="truncate text-[11px] text-concrete">{subtitle}</p>
          </div>
        </div>
        {/* chat body */}
        <div className="ks-chat-bg relative min-h-0 flex-1">{children}</div>
        {footer}
      </div>
    </div>
  );
}
