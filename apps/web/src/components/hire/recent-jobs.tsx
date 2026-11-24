'use client';

import clsx from 'clsx';
import { skillLabel, type Job } from '@kaamsetu/core';
import { inr, timeAgo } from '@/lib/format';
import { tradeColor } from '@/components/ui/trade';

export function RecentJobs({ jobs, activeId, onOpen }: { jobs: Job[] | null; activeId: string | null; onOpen: (id: string) => void }) {
  return (
    <section className="border-t border-line px-4 pb-10 pt-5 sm:px-6" aria-labelledby="recent-h">
      <h2 id="recent-h" className="label flex items-center justify-between text-concrete">
        Recent jobs <span className="text-concrete/70">{jobs?.length ?? ''}</span>
      </h2>
      {!jobs ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <p className="mt-3 text-sm text-concrete-dark">Nothing posted yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {jobs.map((j) => {
            const tc = tradeColor(j.skill);
            return (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => onOpen(j.id)}
                  aria-current={activeId === j.id ? 'true' : undefined}
                  className={clsx('group flex w-full items-center gap-3 py-2.5 text-left', activeId === j.id && 'bg-paper-2/70')}
                >
                  <span className="h-8 w-1 shrink-0" style={{ background: tc.bg }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium group-hover:text-hivis-deep">
                      {j.workersNeeded} × {skillLabel(j.skill)} · {j.locality}
                    </span>
                    <span className="label block truncate text-[10px] text-concrete">
                      #{j.code} · {inr(j.wagePerDay)}/day · {timeAgo(j.createdAt)}
                    </span>
                  </span>
                  <span className={clsx('label shrink-0 px-1.5 py-0.5 text-[10px]', j.status === 'filled' ? 'bg-hivis text-ink' : j.status === 'open' ? 'border border-ink' : 'text-concrete')}>
                    {j.status}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
