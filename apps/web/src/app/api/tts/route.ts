import { getCtx, LanguageSchema } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, route, tooMany } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ text: z.string().min(1).max(400), lang: LanguageSchema, fast: z.boolean().optional() });

/** Returns audio/mpeg, or 204 when voice is mocked (the client then shows captions only). */
export const POST = route(async (req: Request) => {
  if (!rateLimit(req, 'tts', 15)) return tooMany();
  const { text, lang, fast } = Body.parse(await req.json());
  const speech = await getCtx().tts.speak(text, lang, { fast });
  if (!speech) return new NextResponse(null, { status: 204 });
  return new NextResponse(Buffer.from(speech.audio), {
    headers: { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=86400' },
  });
});
