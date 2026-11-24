'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Wordmark } from './wordmark';

const LINKS = [
  { href: '/#how', label: 'How it works' },
  { href: '/hire', label: 'Hire' },
  { href: '/live', label: 'Live' },
  { href: '/about', label: 'About' },
];

type Status = { demoMode: boolean; llm: string; voice: string; geo: string; store: string; telegram: string; agent: string };

/** Dev-only pill listing which integrations are mocked. */
function MockPill() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    fetch('/api/status')
      .then((r) => r.json() as Promise<Status>)
      .then(setS)
      .catch(() => undefined);
  }, []);
  if (!s) return null;
  const mocked = Object.entries({ llm: s.llm, voice: s.voice, geo: s.geo, telegram: s.telegram })
    .filter(([, v]) => v === 'mock')
    .map(([k]) => k);
  if (!mocked.length && !s.demoMode) return null;
  return (
    <div className="label fixed bottom-3 right-3 z-[90] flex items-center gap-2 border border-ink bg-signal px-2 py-1 text-ink">
      <span className="inline-block size-1.5 rounded-full bg-ink" />
      {s.demoMode ? 'demo mode' : `mock: ${mocked.join(' · ')}`}
    </div>
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const appLike = path.startsWith('/hire') || path.startsWith('/live');
  const dark = path.startsWith('/live');
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <>
      <a href="#main" className="label sr-only z-[200] bg-hivis px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <header
        className={clsx(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300',
          dark
            ? 'dark-nav border-b border-line-dark bg-ink text-paper'
            : // always opaque: page content (e.g. the hero map) must never show through or sit over the nav
              'border-b border-line bg-paper/95 backdrop-blur-md',
        )}
      >
        <nav className="container-x flex h-14 items-center justify-between gap-4" aria-label="Primary">
          <Link href="/" className="shrink-0" title="KaamSetu home">
            <Wordmark inverted={dark} />
          </Link>
          <ul className="hidden items-center gap-7 md:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={clsx(
                    'label relative py-1 transition-colors hover:text-hivis',
                    path === l.href && 'text-hivis after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-hivis',
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link href="/hire" className="label bg-ink px-3 py-2 text-paper transition-colors hover:bg-hivis md:hidden">
              Hire
            </Link>
            <Link
              href="/hire"
              className={clsx(
                'label hidden items-center gap-2 px-4 py-2.5 transition-colors md:inline-flex',
                dark ? 'bg-hivis text-ink hover:bg-paper' : 'bg-ink text-paper hover:bg-hivis',
              )}
            >
              <span className={clsx('inline-block size-1.5 rounded-full', dark ? 'bg-ink' : 'bg-hivis')} /> Post a job
            </Link>
          </div>
        </nav>
      </header>
      <main id="main" className="min-h-dvh">
        {children}
      </main>
      <MockPill />
    </>
  );
}
