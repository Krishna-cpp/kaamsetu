import { getCtx, respondToMatch } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ action: z.enum(['accepted', 'declined', 'viewed']) });

/** Respond on a worker's behalf (web fallback for the Telegram buttons and demo controls). */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { action } = Body.parse(await req.json());
  const res = await respondToMatch(getCtx(), decodeURIComponent((await params).id), action);
  return NextResponse.json({ match: res.match, jobStatus: res.job.status });
});
