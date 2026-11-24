import { getCtx, isLanguage } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { rateLimit, route, tooMany } from '@/lib/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** multipart: audio=<Blob>, kind=job|worker, lang?=hi|mr|en → { text, language, provider } */
export const POST = route(async (req: Request) => {
  if (!rateLimit(req, 'stt', 20)) return tooMany();
  const form = await req.formData();
  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: 'missing_audio' }, { status: 400 });
  if (audio.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'audio_too_large' }, { status: 413 });
  const kind = form.get('kind') === 'worker' ? 'worker' : 'job';
  const lang = form.get('lang');
  const tr = await getCtx()
    .stt(kind)
    .transcribe(new Uint8Array(await audio.arrayBuffer()), {
      mimeType: audio.type || 'audio/webm',
      filename: 'recording.webm',
      languageHint: isLanguage(lang) ? lang : null,
    });
  return NextResponse.json(tr);
});
