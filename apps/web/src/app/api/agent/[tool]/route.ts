import { getCtx, runAgentTool, type ToolName } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOLS: ToolName[] = ['register_worker', 'find_jobs_near_me', 'accept_job'];

/** Server tools for the ElevenLabs "Kaam Didi" agent. Auth: x-kaamsetu-secret header. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ tool: string }> }) => {
  const ctx = getCtx();
  const secret = ctx.env.AGENT_TOOL_SECRET;
  if (secret && req.headers.get('x-kaamsetu-secret') !== secret) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const tool = (await params).tool as ToolName;
  if (!TOOLS.includes(tool)) return NextResponse.json({ error: 'unknown_tool' }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as unknown;
  return NextResponse.json(await runAgentTool(ctx, tool, body));
});
