import { getCtx, LanguageSchema, parseJob } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { route } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ transcript: z.string().min(3).max(2000), language: LanguageSchema.nullish() });

/** Transcript → structured, editable job draft (+ geocode, + min-wage warning). */
export const POST = route(async (req: Request) => {
  const { transcript, language } = Body.parse(await req.json());
  return NextResponse.json(await parseJob(getCtx(), transcript, language ?? null));
});
