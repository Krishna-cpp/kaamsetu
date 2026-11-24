import { getCtx, getJobView } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Poll target for the dashboard: job + ranked matches with live statuses. */
export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const view = await getJobView(getCtx(), (await params).id);
  if (!view) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json(view, { headers: { 'cache-control': 'no-store' } });
});
