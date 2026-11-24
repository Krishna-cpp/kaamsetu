import { getCtx, toPublicWorker } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const ctx = getCtx();
  const id = (await params).id;
  const w = await ctx.repo.getWorker(id);
  if (!w || w.status === 'deleted') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const ratings = (await ctx.repo.listRatings(id)).slice(0, 10);
  return NextResponse.json({ worker: toPublicWorker(w), ratings });
});
