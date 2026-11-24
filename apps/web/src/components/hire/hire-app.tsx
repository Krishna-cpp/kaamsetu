'use client';

import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { skillLabel, type Job, type MatchStatus, type PublicWorker } from '@kaamsetu/core';
import { api, ApiError, type JobView, type PublicWorkerWithPin } from '@/lib/api';
import { KMap, type DotPoint, type JobPin, type WorkerPin } from '@/components/map';
import { ToastProvider, useToast } from '@/components/ui/toast';
import { Composer } from './composer';
import { MatchList } from './match-list';
import { RecentJobs } from './recent-jobs';

const POLL_MS = 2500;

export function HireApp() {
  return (
    <ToastProvider>
      <HireInner />
    </ToastProvider>
  );
}

function HireInner() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const jobId = params.get('job');

  const [view, setView] = useState<JobView | null>(null);
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [celebrate, setCelebrate] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, PublicWorker>>({});
  const [allWorkers, setAllWorkers] = useState<PublicWorkerWithPin[]>([]);
  const [recent, setRecent] = useState<Job[] | null>(null);
  const [composerKey, setComposerKey] = useState(0);
  const prevStatus = useRef(new Map<string, MatchStatus>());
  const justPosted = useRef<string | null>(null);
  const mapRef = useRef<HTMLElement>(null);

  const loadRecent = useCallback(() => {
    api
      .listJobs(8)
      .then(setRecent)
      .catch(() => setRecent([]));
  }, []);

  useEffect(() => {
    api.workers().then(setAllWorkers).catch(() => undefined);
    loadRecent();
  }, [loadRecent]);

  const flash = useCallback((id: string) => {
    setCelebrate((s) => new Set(s).add(id));
    window.setTimeout(
      () =>
        setCelebrate((s) => {
          const n = new Set(s);
          n.delete(id);
          return n;
        }),
      1800,
    );
  }, []);

  /* ── poll the job ── */
  useEffect(() => {
    if (!jobId) {
      setView(null);
      setError(null);
      setLoading(false);
      return;
    }
    let alive = true;
    let timer: number | undefined;
    let fails = 0;
    let first = true;
    prevStatus.current = new Map();
    setLoading(true);
    setError(null);
    setView((v) => (v?.job.id === jobId ? v : null));

    const tick = async () => {
      try {
        const v = await api.jobView(jobId);
        if (!alive) return;
        fails = 0;
        setError(null);
        // status transitions → toasts + celebration
        let newlyFilled = false;
        for (const m of v.matches) {
          const prev = prevStatus.current.get(m.id);
          if (!first && prev && prev !== m.status && m.status === 'accepted') {
            const firstName = m.worker.name.split(' ')[0];
            toast.push({ tone: 'success', title: `${firstName} accepted · contact unlocked`, body: `${skillLabel(v.job.skill)} · ${m.distanceKm.toFixed(1)} km away` });
            flash(m.id);
            newlyFilled = true;
          }
          prevStatus.current.set(m.id, m.status);
        }
        if (first && justPosted.current === v.job.id) {
          const sent = v.matches.filter((m) => m.status !== 'suggested').length;
          toast.push({ title: `Voice alerts sent to ${sent} workers`, body: `JOB #${v.job.code} · ${v.job.locality} · within ${v.job.radiusKm} km` });
          justPosted.current = null;
        }
        if (newlyFilled && v.job.status === 'filled') {
          window.setTimeout(() => toast.push({ tone: 'success', title: `JOB #${v.job.code} is filled`, body: `All ${v.job.workersNeeded} slots taken.` }), 900);
          loadRecent();
        }
        first = false;
        setView(v);
        setLoading(false);
        const pending = v.matches.some((m) => m.status === 'alerted' || m.status === 'viewed');
        const age = Date.now() - Date.parse(v.job.createdAt);
        if ((v.job.status === 'open' || pending) && age < 10 * 60_000) timer = window.setTimeout(tick, POLL_MS);
      } catch (e) {
        if (!alive) return;
        fails++;
        setLoading(false);
        if (e instanceof ApiError && e.status === 404) {
          setError('This job doesn’t exist any more.');
          return;
        }
        setError(e instanceof Error ? e.message : 'Network error');
        timer = window.setTimeout(tick, Math.min(15_000, POLL_MS * 2 ** fails));
      }
    };
    void tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [jobId, nonce, toast, flash, loadRecent]);

  const openJob = useCallback(
    (id: string) => {
      setSelectedId(null);
      setHoverId(null);
      router.replace(`/hire?job=${encodeURIComponent(id)}`, { scroll: false });
      if (window.innerWidth < 1024) mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [router],
  );

  const onPosted = useCallback(
    (job: Job) => {
      justPosted.current = job.id;
      setRecent((r) => [job, ...(r ?? []).filter((j) => j.id !== job.id)].slice(0, 8));
      openJob(job.id);
    },
    [openJob],
  );

  const respond = useCallback(
    async (matchId: string, action: 'accepted' | 'declined') => {
      try {
        await api.respond(matchId, action);
        setNonce((n) => n + 1);
      } catch (e) {
        toast.push({ tone: 'error', title: 'Could not update', body: e instanceof Error ? e.message : undefined });
      }
    },
    [toast],
  );

  /* ── map data ── */
  const jobPin: JobPin | null = view
    ? { id: view.job.id, lat: view.job.location.lat, lng: view.job.location.lng, radiusKm: view.job.radiusKm, label: `Job #${view.job.code} in ${view.job.locality}` }
    : null;
  const workerPins: WorkerPin[] = useMemo(
    () =>
      (view?.matches ?? []).map((m) => ({
        id: m.workerId,
        lat: m.approxLocation.lat,
        lng: m.approxLocation.lng,
        rank: m.rank,
        status: m.status,
        label: `${m.worker.name}, rank ${m.rank}, score ${Math.round(m.score)}`,
      })),
    [view],
  );
  const dots: DotPoint[] = useMemo(
    () => (jobId ? [] : allWorkers.map((w) => ({ id: w.id, lat: w.approxLocation.lat, lng: w.approxLocation.lng }))),
    [allWorkers, jobId],
  );
  const fitKey = jobId ? `${jobId}:${view ? 1 : 0}` : `all:${allWorkers.length}`;
  const activeId = hoverId ?? selectedId;

  return (
    <div className="pt-14 lg:h-dvh lg:overflow-hidden">
      <div className="md:grid md:grid-cols-2 lg:h-[calc(100dvh-56px)] lg:grid-cols-[minmax(360px,400px)_minmax(0,1fr)_minmax(360px,400px)] xl:grid-cols-[420px_minmax(0,1fr)_420px]">
        {/* composer */}
        <aside
          className="ks-scroll border-line md:col-start-1 md:row-start-2 md:border-r lg:row-start-1 lg:overflow-y-auto"
          aria-label="Post a job"
        >
          {view && (
            <div className="flex items-center justify-between gap-2 border-b border-line bg-paper-2/60 px-4 py-2 sm:px-6">
              <p className="label truncate text-concrete-dark">Viewing JOB #{view.job.code}</p>
              <button
                type="button"
                onClick={() => {
                  router.replace('/hire', { scroll: false });
                  setComposerKey((k) => k + 1);
                }}
                className="label inline-flex items-center gap-1 hover:text-hivis"
              >
                <Plus className="size-3.5" aria-hidden /> New job
              </button>
            </div>
          )}
          <Composer key={composerKey} onPosted={onPosted} onPostingChange={setPosting} onNewJob={() => router.replace('/hire', { scroll: false })} />
          <div className="hidden lg:block">
            <RecentJobs jobs={recent} activeId={jobId} onOpen={openJob} />
          </div>
        </aside>

        {/* map */}
        <section
          ref={mapRef}
          className="relative h-[46vh] min-h-[320px] scroll-mt-14 border-y border-line md:col-span-2 md:row-start-1 md:h-[42vh] md:border-t-0 lg:col-span-1 lg:col-start-2 lg:row-start-1 lg:h-auto lg:border-y-0"
          aria-label="Map"
        >
          <KMap
            job={jobPin}
            workers={workerPins}
            dots={dots}
            activeId={activeId}
            onHover={setHoverId}
            onSelect={(id) => setSelectedId((s) => (s === id ? null : id))}
            fitKey={fitKey}
            ariaLabel={view ? `Map of workers near ${view.job.locality}` : 'Map of available workers in Pune'}
          />
          <MapLegend hasJob={!!view} count={allWorkers.length} locality={view?.job.locality} />
        </section>

        {/* matches */}
        <aside
          className="ks-scroll border-line md:col-start-2 md:row-start-2 lg:col-start-3 lg:row-start-1 lg:overflow-y-auto lg:border-l"
          aria-label="Matches"
        >
          <MatchList
            view={view}
            posting={posting}
            loading={loading}
            error={error}
            onRetry={() => setNonce((n) => n + 1)}
            activeId={activeId}
            selectedId={selectedId}
            celebrate={celebrate}
            workerOverrides={overrides}
            onHover={setHoverId}
            onSelect={(id) => setSelectedId((s) => (s === id ? null : id))}
            onRespond={respond}
            onRated={(w) => setOverrides((o) => ({ ...o, [w.id]: w }))}
            workerCount={allWorkers.length}
          />
        </aside>

        <div className="md:col-span-2 lg:hidden">
          <RecentJobs jobs={recent} activeId={jobId} onOpen={openJob} />
        </div>
      </div>
    </div>
  );
}

function MapLegend({ hasJob, count, locality }: { hasJob: boolean; count: number; locality?: string }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
      <p className="label bg-ink px-2 py-1 text-paper">{hasJob ? `Around ${locality}` : `${count || '—'} workers · Pune`}</p>
      {hasJob && (
        <ul className="label flex flex-wrap gap-x-2.5 gap-y-1 border border-line bg-paper/95 px-2 py-1.5 text-[10px] text-ink">
          {[
            ['Alerted', 'bg-concrete'],
            ['Listened', 'bg-signal'],
            ['Accepted', 'bg-hivis'],
          ].map(([l, c]) => (
            <li key={l} className="flex items-center gap-1">
              <span className={clsx('size-2 rounded-full border border-ink', c)} aria-hidden /> {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
