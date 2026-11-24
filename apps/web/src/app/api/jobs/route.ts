import { createJob, getCtx } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { rateLimit, route, tooMany } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (req: Request) => {
  const limit = Math.min(100, Number(new URL(req.url).searchParams.get('limit') ?? 30) || 30);
  return NextResponse.json(await getCtx().repo.listJobs({ limit }), { headers: { 'cache-control': 'no-store' } });
});

/** Create a job → rank → alert. Body: JobDraftInput. Returns { job, matches }. */
export const POST = route(async (req: Request) => {
  if (!rateLimit(req, 'jobs', 8)) return tooMany();
  const res = await createJob(getCtx(), await req.json());
  return NextResponse.json(res, { status: 201 });
});
