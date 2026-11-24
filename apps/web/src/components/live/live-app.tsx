'use client';

import clsx from 'clsx';
import { animate, AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BriefcaseBusiness, Handshake, Headphones, Radio, Star, UserPlus, X, Zap, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PUNE_LOCALITIES, SKILL_CODES, type EventType, type FeedEvent, type Job, type Skill } from '@kaamsetu/core';
import { api, type FeedResponse, type PublicWorkerWithPin } from '@/lib/api';
import { timeAgo } from '@/lib/format';
import { KMap, type DotPoint, type JobPin, type Ping } from '@/components/map';

const POLL_MS = 2500;

const META: Record<EventType, { icon: LucideIcon; label: string; color: string; tone: Ping['tone'] }> = {
  worker_registered: { icon: UserPlus, label: 'New worker', color: '#FFD23F', tone: 'signal' },
  job_posted: { icon: BriefcaseBusiness, label: 'Job posted', color: '#F3EFE6', tone: 'paper' },
  match_alerted: { icon: Radio, label: 'Voice alerts', color: '#8C8A84', tone: 'signal' },
  match_viewed: { icon: Headphones, label: 'Listened', color: '#FFD23F', tone: 'signal' },
  match_accepted: { icon: Handshake, label: 'Hired', color: '#FF5B14', tone: 'hivis' },
  match_declined: { icon: X, label: 'Declined', color: '#5F5D58', tone: 'paper' },
  rating_added: { icon: Star, label: 'Rated', color: '#FFD23F', tone: 'signal' },
};

const istDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

export function LiveApp() {
  const reduce = useReducedMotion();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [stats, setStats] = useState<FeedResponse['stats'] | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pings, setPings] = useState<Ping[]>([]);
  const [workers, setWorkers] = useState<PublicWorkerWithPin[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [offline, setOffline] = useState(false);
  const [injecting, setInjecting] = useState(false);
  const [, setNowTick] = useState(0);
  const lastNow = useRef<string | null>(null);
  const seen = useRef(new Set<string>());

  const refreshEntities = useCallback(() => {
    api.workers().then(setWorkers).catch(() => undefined);
    api.listJobs(60).then(setJobs).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshEntities();
  }, [refreshEntities]);

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const tick = async () => {
      try {
        // overlap the window by 60 s: simulated events can be back-dated slightly; we dedupe by id
        const since = lastNow.current ? new Date(Date.parse(lastNow.current) - 60_000).toISOString() : undefined;
        const res = await api.feed(since);
        if (!alive) return;
        setOffline(false);
        setStats(res.stats);
        const initial = lastNow.current === null;
        lastNow.current = res.now;
        const incoming = res.events.filter((e) => !seen.current.has(e.id));
        if (incoming.length) {
          incoming.forEach((e) => seen.current.add(e.id));
          setEvents((prev) => [...incoming, ...prev].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 80));
          if (!initial) {
            const ids = new Set(incoming.map((e) => e.id));
            setFresh(ids);
            const newPings = incoming
              .filter((e) => e.location)
              .map((e) => ({ id: e.id, lat: e.location!.lat, lng: e.location!.lng, tone: META[e.type].tone }));
            if (newPings.length) {
              setPings((p) => [...p, ...newPings].slice(-24));
              window.setTimeout(() => setPings((p) => p.filter((x) => !newPings.some((n) => n.id === x.id))), 4200);
            }
            if (incoming.some((e) => e.type === 'job_posted' || e.type === 'worker_registered' || e.type === 'match_accepted')) refreshEntities();
          }
        }
      } catch {
        if (alive) setOffline(true);
      }
      if (alive) timer = window.setTimeout(tick, POLL_MS);
    };
    void tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [refreshEntities]);

  // re-render relative times + clock
  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const today = istDay(new Date());
  const matchesToday = events.filter((e) => e.type === 'match_accepted' && istDay(new Date(e.at)) === today).length;
  const dots: DotPoint[] = workers.map((w) => ({ id: w.id, lat: w.approxLocation.lat, lng: w.approxLocation.lng }));
  const jobPins: JobPin[] = jobs.filter((j) => j.status === 'open').map((j) => ({ id: j.id, lat: j.location.lat, lng: j.location.lng, label: `Job #${j.code}` }));

  async function injectDemoJob() {
    setInjecting(true);
    const skills: Skill[] = ['painter', 'plumber', 'electrician', 'mason', 'carpenter', 'cook', 'helper'];
    const skill = skills[Math.floor(Math.random() * skills.length)] ?? SKILL_CODES[0];
    const loc = PUNE_LOCALITIES.slice(0, 10)[Math.floor(Math.random() * 10)] ?? PUNE_LOCALITIES[0]!;
    try {
      await api.createJob({
        skill,
        workersNeeded: 1 + Math.floor(Math.random() * 2),
        durationDays: 1 + Math.floor(Math.random() * 4),
        wagePerDay: 700 + Math.floor(Math.random() * 6) * 50,
        startDate: istDay(new Date(Date.now() + 86_400_000)),
        locality: loc.name,
        location: { lat: loc.lat, lng: loc.lng },
        radiusKm: 8,
        employer: { name: 'Demo employer', phone: null, business: null },
        language: 'en',
        source: 'form',
      });
    } catch {
      /* rate limited etc: the feed simply won't change */
    } finally {
      setInjecting(false);
    }
  }

  return (
    <div className="dark-live min-h-dvh bg-ink pt-14 text-paper lg:h-dvh lg:overflow-hidden">
      <div className="flex h-full flex-col">
        {/* top bar */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-dark px-4 pb-4 pt-5 sm:px-6">
          <div>
            <p className="label flex items-center gap-2 text-paper/60">
              <span className="relative inline-flex size-2.5">
                {!offline && <span className="absolute inset-0 animate-ping rounded-full bg-hivis/70" />}
                <span className={clsx('relative size-2.5 rounded-full', offline ? 'bg-concrete' : 'bg-hivis')} />
              </span>
              <span className={offline ? 'text-concrete' : 'text-hivis'}>{offline ? 'Reconnecting' : 'Live'}</span> · KaamSetu network ops
            </p>
            <h1 className="mt-2 font-display text-[34px] font-bold leading-none tracking-[-0.04em] sm:text-[44px]">
              Pune, <span className="serif-i font-normal text-paper/70">right now.</span>
            </h1>
          </div>
          <Clock />
        </div>

        {/* counters */}
        <dl className="grid grid-cols-2 border-b border-line-dark md:grid-cols-4">
          <Counter label="Workers online" value={stats?.workers} />
          <Counter label="Open jobs" value={stats?.openJobs} />
          <Counter label="Filled jobs" value={stats?.filledJobs} />
          <Counter label="Hires today" value={stats ? matchesToday : undefined} hot />
        </dl>

        {/* body */}
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_440px]">
          <section className="relative h-[52vh] min-h-[320px] border-b border-line-dark lg:h-auto lg:border-b-0 lg:border-r" aria-label="Live map">
            <KMap variant="dark" dots={dots} jobs={jobPins} pings={pings} fitKey={`live:${dots.length > 0 ? 1 : 0}`} ariaLabel="Live map of workers and open jobs in Pune" />
            <ul className="label pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-x-3 gap-y-1 border border-line-dark bg-ink/90 px-2.5 py-1.5 text-[10px] text-paper/70">
              <li className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-paper/70" aria-hidden /> Worker
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2.5 border border-ink bg-paper" aria-hidden /> Open job
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-hivis" aria-hidden /> Hire
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-signal" aria-hidden /> Alert / reply
              </li>
            </ul>
          </section>

          <section className="flex min-h-0 flex-col" aria-labelledby="feed-h">
            <div className="flex items-center justify-between border-b border-line-dark px-4 py-3 sm:px-5">
              <h2 id="feed-h" className="label text-paper/60">
                Event stream
              </h2>
              <button
                type="button"
                onClick={injectDemoJob}
                disabled={injecting}
                className="label inline-flex h-8 items-center gap-1.5 border border-line-dark px-2.5 text-paper/70 transition-colors hover:border-hivis hover:text-hivis disabled:opacity-50"
              >
                <Zap className="size-3.5" aria-hidden /> {injecting ? 'Posting…' : 'Demo job'}
              </button>
            </div>
            <ol className="ks-scroll-dark max-h-[70vh] min-h-0 flex-1 overflow-y-auto lg:max-h-none" aria-live="polite" aria-relevant="additions">
              {events.length === 0 &&
                [0, 1, 2, 3, 4, 5].map((i) => (
                  <li key={i} className="flex gap-3 border-b border-line-dark px-5 py-4" style={{ opacity: 1 - i * 0.14 }}>
                    <span className="size-9 bg-ink-2" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-3/4 bg-ink-2" />
                      <span className="block h-2.5 w-1/2 bg-ink-2" />
                    </span>
                  </li>
                ))}
              <AnimatePresence initial={false}>
                {events.map((e) => {
                  const m = META[e.type];
                  const Icon = m.icon;
                  const isFresh = fresh.has(e.id);
                  return (
                    <motion.li
                      key={e.id}
                      layout={!reduce}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <div className={clsx('relative flex gap-3 border-b border-line-dark px-4 py-3.5 sm:px-5', e.type === 'match_accepted' && 'bg-hivis/[0.07]')}>
                        {isFresh && !reduce && (
                          <motion.span
                            className="absolute inset-y-0 left-0 w-[3px]"
                            style={{ background: m.color }}
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 3, delay: 1 }}
                            aria-hidden
                          />
                        )}
                        <span className="grid size-9 shrink-0 place-items-center border" style={{ borderColor: m.color, color: m.color }}>
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="label text-[10px]" style={{ color: m.color }}>
                              {m.label}
                            </p>
                            <time className="label shrink-0 text-[10px] text-paper/40" dateTime={e.at}>
                              {timeAgo(e.at)}
                            </time>
                          </div>
                          <p className="mt-0.5 truncate text-[15px] font-medium leading-snug">{e.title}</p>
                          {e.subtitle && <p className="truncate font-mono text-[11.5px] text-paper/50">{e.subtitle}</p>}
                        </div>
                      </div>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const t = now?.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }) ?? '--:--:--';
  const d = now?.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }) ?? '';
  return (
    <div className="text-right">
      <p className="font-mono text-[28px] font-medium leading-none tabular-nums tracking-tight sm:text-[34px]" suppressHydrationWarning>
        {t}
      </p>
      <p className="label mt-1.5 text-paper/50">
        {d} · IST · UTC+5:30
      </p>
    </div>
  );
}

function Counter({ label, value, hot = false }: { label: string; value: number | undefined; hot?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<number | null>(null);
  const reduce = useReducedMotion();
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (value === undefined || !ref.current) return;
    const from = prev.current ?? 0;
    const first = prev.current === null;
    prev.current = value;
    if (!first && from !== value) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 900);
    }
    if (reduce) {
      ref.current.textContent = String(value);
      return;
    }
    const c = animate(from, value, {
      duration: first ? 1.2 : 0.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = String(Math.round(v));
      },
    });
    return () => c.stop();
  }, [value, reduce]);

  return (
    <div className="relative border-line-dark px-4 py-4 sm:px-6 [&:not(:first-child)]:border-l max-md:[&:nth-child(3)]:border-l-0 max-md:[&:nth-child(n+3)]:border-t">
      <dt className="label text-paper/50">{label}</dt>
      <dd
        className={clsx(
          'mt-2 font-display text-[56px] font-bold leading-[0.85] tabular-nums tracking-[-0.05em] transition-colors duration-500 sm:text-[72px] lg:text-[84px]',
          flash ? 'text-hivis' : hot ? 'text-signal' : 'text-paper',
        )}
      >
        {value === undefined ? <span className="text-paper/20">—</span> : <span ref={ref}>0</span>}
      </dd>
    </div>
  );
}
