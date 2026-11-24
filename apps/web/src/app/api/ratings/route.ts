import { addRating, getCtx } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { rateLimit, route, tooMany } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** { jobId, workerId, stars 1-5, comment? } → updated public worker (KaamScore) */
export const POST = route(async (req: Request) => {
  if (!rateLimit(req, 'ratings', 20)) return tooMany();
  return NextResponse.json(await addRating(getCtx(), await req.json()), { status: 201 });
});
