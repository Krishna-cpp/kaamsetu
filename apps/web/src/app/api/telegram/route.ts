import { getCtx, handleUpdate, type TgUpdate } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Telegram webhook (fallback host; the primary is the AWS Lambda in services/bot). */
export async function POST(req: Request) {
  const ctx = getCtx();
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get('x-telegram-bot-api-secret-token') !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  const update = (await req.json()) as TgUpdate;
  await handleUpdate(ctx, update);
  return NextResponse.json({ ok: true });
}
