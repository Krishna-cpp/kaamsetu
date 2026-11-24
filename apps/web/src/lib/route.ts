import 'server-only';
import { MatchError } from '@kaamsetu/core/server';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Uniform JSON errors: zod → 400, MatchError → 404/409, anything else → 500. */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof ZodError) return NextResponse.json({ error: 'invalid_input', issues: e.issues }, { status: 400 });
      if (e instanceof MatchError)
        return NextResponse.json({ error: e.code, message: e.message }, { status: e.code === 'not_found' ? 404 : 409 });
      console.error('[api]', e);
      return NextResponse.json({ error: 'internal', message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
    }
  };
}

const buckets = new Map<string, { n: number; reset: number }>();

/** Tiny in-memory fixed-window rate limiter (per instance): basic abuse protection for job posts / TTS. */
export function rateLimit(req: Request, key: string, max: number, windowMs = 60_000): boolean {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.reset < now) {
    buckets.set(k, { n: 1, reset: now + windowMs });
    return true;
  }
  b.n++;
  return b.n <= max;
}

export const tooMany = () =>
  NextResponse.json({ error: 'rate_limited', message: 'Slow down a little and try again in a minute.' }, { status: 429 });
