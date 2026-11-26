import { completeMatch, getCtx, respondToMatch } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ action: z.enum(['accepted', 'declined', 'viewed', 'completed']) });

/** Respond on a worker's behalf (web fallback for the Telegram buttons and demo controls), or mark a job done. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { action } = Body.parse(await req.json());
  const id = decodeURIComponent((await params).id);
  if (action === 'completed') {
    // employer: one tap = job done + 'this worker did this job' (work-record tick); may fire the opt-in 90-day alert
    const r = await completeMatch(getCtx(), id, { confirm: true });
    return NextResponse.json({ match: r.match, jobStatus: r.job.status, constructionDays12m: r.daysAfter, alerted: r.alerted });
  }
  const res = await respondToMatch(getCtx(), id, action);
  return NextResponse.json({ match: res.match, jobStatus: res.job.status });
});
