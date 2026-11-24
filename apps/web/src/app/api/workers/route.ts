import { getCtx, jitter, toPublicWorker } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Public worker list with approximate (≈400 m) pins for maps. Never exposes phone or exact coordinates. */
export const GET = route(async () => {
  const workers = (await getCtx().repo.listWorkers()).filter((w) => w.status === 'active');
  return NextResponse.json(
    workers.map((w, i) => ({ ...toPublicWorker(w), approxLocation: jitter(w.location, i + 7, 400) })),
    { headers: { 'cache-control': 'no-store' } },
  );
});
