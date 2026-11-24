import { getCtx, tickRecentJobs } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Live ops feed: newest events first (+ totals). ?since=<iso> for incremental polling. */
export const GET = route(async (req: Request) => {
  const ctx = getCtx();
  await tickRecentJobs(ctx);
  const since = new URL(req.url).searchParams.get('since') ?? undefined;
  const [events, workers, jobs] = await Promise.all([
    ctx.repo.listEvents({ since, limit: 60 }),
    ctx.repo.listWorkers(),
    ctx.repo.listJobs({ limit: 500 }),
  ]);
  const stats = {
    workers: workers.filter((w) => w.status === 'active').length,
    jobs: jobs.length,
    openJobs: jobs.filter((j) => j.status === 'open').length,
    filledJobs: jobs.filter((j) => j.status === 'filled').length,
  };
  return NextResponse.json({ events, stats, now: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } });
});
