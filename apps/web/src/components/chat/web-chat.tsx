'use client';

/**
 * /chat: the KaamSetu bot in the browser. Same conversation as Telegram (same handler, same voice),
 * delivered through the WebChannel. Demo fallback when Telegram is unavailable.
 */
import clsx from 'clsx';
import { ArrowUpRight, HeartHandshake, MapPin, Mic, Pause, Play, RotateCcw, Send, Square } from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { MiniMap, mapsHref } from '@/components/benefits/mini-map';
import { useRecorder } from '@/components/hire/use-recorder';

const SCHEMES_ON = process.env.NEXT_PUBLIC_FEATURE_SCHEMES === 'true';

interface Button {
  text: string;
  data?: string;
  url?: string;
}
interface Msg {
  id: number;
  from: 'bot' | 'user';
  kind: 'text' | 'voice' | 'location';
  text: string;
  audioUrl: string | null;
  duration: number | null;
  buttons: Button[][] | null;
  /** kind=location: a place to show on a mini map */
  location?: { lat: number; lng: number; title: string; address: string } | null;
  at: string;
}

const STORE_KEY = 'kaamsetu.webchat.id';

function newChatId(): string {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return 'web_' + Array.from(bytes, (b) => a[b % a.length]).join('');
}

/** https:// URLs in bot text become tappable links (http and other schemes stay plain text). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https:\/\/[^\s<>"']+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return p ? <Fragment key={i}>{p}</Fragment> : null;
        // keep trailing punctuation out of the link
        const m = /^(.*?)([).,;:!?]*)$/.exec(p);
        const href = m?.[1] ?? p;
        return (
          <Fragment key={i}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="break-all font-medium text-ink underline decoration-hivis decoration-2 underline-offset-2 hover:bg-signal">
              {href.replace(/^https:\/\//, '').replace(/\/$/, '')}
            </a>
            {m?.[2]}
          </Fragment>
        );
      })}
    </>
  );
}

/** Renders the Telegram HTML subset the bot uses (<b>, <i>, entities) without dangerouslySetInnerHTML. */
function RichText({ text }: { text: string }) {
  const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const out: ReactNode[] = [];
  let bold = false;
  let italic = false;
  text.split(/(<\/?[bi]>)/).forEach((part, i) => {
    if (part === '<b>') bold = true;
    else if (part === '</b>') bold = false;
    else if (part === '<i>') italic = true;
    else if (part === '</i>') italic = false;
    else if (part) {
      const lines = decode(part).split('\n');
      out.push(
        <span key={i} className={clsx(bold && 'font-semibold', italic && 'italic text-ink/70')}>
          {lines.map((l, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              <Linkified text={l} />
            </Fragment>
          ))}
        </span>,
      );
    }
  });
  return <>{out}</>;
}

function VoiceNote({ src, mine, duration }: { src: string | null; mine: boolean; duration: number | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [len, setLen] = useState(duration ?? 0);
  const bars = 26;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={!src}
        onClick={() => {
          const a = ref.current;
          if (!a) return;
          if (a.paused) void a.play();
          else a.pause();
        }}
        className={clsx('grid size-10 shrink-0 place-items-center rounded-full', mine ? 'bg-paper text-ink' : 'bg-ink text-paper', !src && 'opacity-40')}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
      </button>
      <div className="flex h-7 flex-1 items-center gap-[2px]" aria-hidden>
        {Array.from({ length: bars }, (_, i) => {
          const h = 30 + 60 * Math.abs(Math.sin(i * 1.7 + (src?.length ?? 3)));
          const done = len > 0 && i / bars < t / len;
          return <span key={i} className={clsx('w-full rounded-[1px]', done ? (mine ? 'bg-paper' : 'bg-hivis') : mine ? 'bg-paper/40' : 'bg-ink/25')} style={{ height: `${h}%` }} />;
        })}
      </div>
      <span className={clsx('label shrink-0 tabular-nums', mine ? 'text-paper/70' : 'text-concrete')}>
        0:{String(Math.round(playing ? t : len)).padStart(2, '0')}
      </span>
      {src && (
        <audio
          ref={ref}
          src={src}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setT(0);
          }}
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => Number.isFinite(e.currentTarget.duration) && setLen(e.currentTarget.duration)}
        />
      )}
    </div>
  );
}

export function WebChat() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRecorder();
  const listRef = useRef<HTMLOListElement>(null);
  const lang = typeof navigator !== 'undefined' ? navigator.language : 'hi';

  const post = useCallback(
    async (body: Record<string, unknown> | FormData) => {
      if (!chatId) return;
      setBusy(true);
      setError(null);
      try {
        const isForm = body instanceof FormData;
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: isForm ? undefined : { 'content-type': 'application/json' },
          body: isForm ? body : JSON.stringify({ chatId, ...body }),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { message?: string }).message ?? `Error ${res.status}`);
        setMessages(((await res.json()) as { messages: Msg[] }).messages);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setBusy(false);
      }
    },
    [chatId],
  );

  // chat id per browser
  useEffect(() => {
    let id: string | null = null;
    try {
      id = localStorage.getItem(STORE_KEY);
    } catch {
      /* storage blocked */
    }
    if (!id || !/^web_[a-z0-9]{8,32}$/.test(id)) {
      id = newChatId();
      try {
        localStorage.setItem(STORE_KEY, id);
      } catch {
        /* ignore */
      }
    }
    setChatId(id);
  }, []);

  // load history; start the conversation if empty
  useEffect(() => {
    if (!chatId) return;
    void (async () => {
      const r = await fetch(`/api/chat?chatId=${chatId}`, { cache: 'no-store' });
      const m = r.ok ? ((await r.json()) as { messages: Msg[] }).messages : [];
      if (m.length) setMessages(m);
      else await post({ text: '/start', lang });
    })();
  }, [chatId, post, lang]);

  // poll for job alerts pushed by employers
  const lastId = messages[messages.length - 1]?.id ?? 0;
  useEffect(() => {
    if (!chatId) return;
    const t = window.setInterval(async () => {
      if (busy) return;
      const r = await fetch(`/api/chat?chatId=${chatId}&after=${lastId}`, { cache: 'no-store' }).catch(() => null);
      if (!r?.ok) return;
      const fresh = ((await r.json()) as { messages: Msg[] }).messages;
      if (fresh.length) setMessages((cur) => [...cur.filter((m) => m.id <= lastId), ...fresh]);
    }, 3000);
    return () => window.clearInterval(t);
  }, [chatId, lastId, busy]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, busy]);

  const onMic = async () => {
    if (rec.state === 'recording') {
      const elapsed = rec.elapsed;
      const blob = await rec.stop();
      if (!blob || !chatId) return;
      const fd = new FormData();
      fd.append('chatId', chatId);
      fd.append('audio', blob, 'voice.webm');
      fd.append('duration', String(Math.max(1, Math.round(elapsed))));
      fd.append('lang', lang);
      await post(fd);
    } else {
      await rec.start();
    }
  };

  const sendText = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await post({ text: t, lang });
  };

  const reset = () => {
    const id = newChatId();
    try {
      localStorage.setItem(STORE_KEY, id);
    } catch {
      /* ignore */
    }
    setMessages([]);
    setChatId(id);
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px)] w-full max-w-[520px] flex-col border-x border-line bg-paper-2">
      {/* chat header */}
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-paper px-4 py-3">
        <span className="grid size-10 place-items-center bg-hivis" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 32 32">
            <path d="M5 23c3-8 7-12 11-12s8 4 11 12" fill="none" stroke="#121210" strokeWidth="3" />
            <path d="M5 23h22M10 23v-5M16 23v-9M22 23v-5" stroke="#121210" strokeWidth="2" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg leading-tight font-bold tracking-tight">KaamSetu bot</h1>
          <p className="label text-concrete">{busy ? 'speaking…' : 'web chat · same bot as Telegram'}</p>
        </div>
        <button type="button" onClick={reset} className="label flex items-center gap-1.5 border border-line px-2.5 py-2 hover:border-ink" title="Start a new chat">
          <RotateCcw className="size-3.5" /> New
        </button>
      </header>

      {/* messages */}
      <ol ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4" aria-live="polite" aria-label="Conversation">
        {messages.map((m) => {
          const mine = m.from === 'user';
          return (
            <li key={m.id} className={clsx('flex flex-col', mine ? 'items-end' : 'items-start')}>
              <div
                className={clsx(
                  'min-w-0 max-w-[86%] text-[15px] leading-snug shadow-[0_1px_0_rgb(0_0_0/0.06)]',
                  m.kind === 'location' && m.location ? 'w-[280px] p-0' : 'px-3.5 py-2.5',
                  mine ? 'bg-ink text-paper' : 'border border-line bg-paper text-ink',
                )}
              >
                {m.kind === 'voice' && <VoiceNote src={m.audioUrl} mine={mine} duration={m.duration} />}
                {m.kind === 'location' && m.location && <LocationCard place={m.location} />}
                {m.text && m.kind !== 'location' && (
                  <p lang={/[ऀ-ॿ]/.test(m.text) ? 'hi' : undefined} className={clsx('deva break-words [overflow-wrap:anywhere]', m.kind === 'voice' && 'mt-2')}>
                    <RichText text={m.text} />
                  </p>
                )}
              </div>
              {m.buttons && (
                <div className="mt-1.5 grid w-full max-w-[86%] gap-1.5">
                  {m.buttons.map((row, ri) => (
                    <div key={ri} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0,1fr))` }}>
                      {row.map((b) =>
                        b.url ? (
                          <a key={b.text} href={b.url} target="_blank" rel="noreferrer" className="deva border border-ink bg-paper px-3 py-2.5 text-center text-sm font-semibold hover:bg-ink hover:text-paper">
                            {b.text}
                          </a>
                        ) : (
                          <button
                            key={b.text}
                            type="button"
                            disabled={busy}
                            onClick={() => void post({ callback: b.data ?? b.text, label: b.text, messageId: m.id })}
                            className="deva border border-ink bg-paper px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
                          >
                            {b.text}
                          </button>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
        {busy && (
          <li className="flex items-center gap-2 text-concrete" aria-label="KaamSetu is replying">
            <span className="flex gap-1 border border-line bg-paper px-3 py-3">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-concrete" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
          </li>
        )}
      </ol>

      {error && <p className="shrink-0 border-t border-line bg-signal px-4 py-2 text-sm">{error}</p>}
      {rec.state === 'denied' && (
        <p className="shrink-0 border-t border-line bg-signal px-4 py-2 text-sm">Microphone blocked. Allow it in the browser, or type below.</p>
      )}

      {/* opt-in benefits shortcut: just sends the words, the bot does the rest */}
      {SCHEMES_ON && rec.state !== 'recording' && (
        <div className="flex shrink-0 items-center gap-2 border-t border-line bg-paper px-3 pt-2.5">
          <button
            type="button"
            disabled={busy || !chatId}
            onClick={() => void post({ text: 'My benefits', lang })}
            className="label inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap border border-ink bg-paper px-2.5 text-ink transition-colors hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            <HeartHandshake className="size-3.5" aria-hidden /> My benefits
          </button>
          <span className="label min-w-0 truncate text-[10px] text-concrete">Gov. schemes · only if you ask</span>
        </div>
      )}

      {/* composer */}
      <form
        className={clsx('flex shrink-0 items-center gap-2 bg-paper p-3', !(SCHEMES_ON && rec.state !== 'recording') && 'border-t border-line')}
        onSubmit={(e) => {
          e.preventDefault();
          void sendText();
        }}
      >
        {rec.state === 'recording' ? (
          <p className="label flex flex-1 items-center gap-2 px-2 text-hivis-deep" aria-live="polite">
            <span className="size-2 animate-pulse rounded-full bg-hivis" /> Recording 0:{String(Math.floor(rec.elapsed)).padStart(2, '0')}. Tap stop to send.
          </p>
        ) : (
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type, or hold a voice note…"
            aria-label="Message"
            className="min-w-0 flex-1 border border-line bg-paper-2 px-3 py-3 text-[15px] outline-none focus:border-ink"
          />
        )}
        {text.trim() && rec.state !== 'recording' ? (
          <button type="submit" disabled={busy} className="grid size-12 shrink-0 place-items-center bg-ink text-paper disabled:opacity-50" aria-label="Send">
            <Send className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void onMic()}
            disabled={busy || rec.state === 'requesting'}
            className={clsx('grid size-12 shrink-0 place-items-center text-ink disabled:opacity-50', rec.state === 'recording' ? 'bg-ink text-paper' : 'bg-hivis')}
            aria-label={rec.state === 'recording' ? 'Stop and send voice note' : 'Record a voice note'}
          >
            {rec.state === 'recording' ? <Square className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
      </form>
    </div>
  );
}

/** kind=location: compact mini-map card (help centres are sample data, so say so). */
function LocationCard({ place }: { place: { lat: number; lng: number; title: string; address: string } }) {
  return (
    <div className="overflow-hidden">
      <MiniMap lat={place.lat} lng={place.lng} label={`${place.title}, ${place.address}`} className="h-[120px] border-0 border-b border-b-line" spanDeg={0.03} caption={place.address.split(",")[0]} />
      <div className="px-3.5 py-2.5">
        <p className="flex items-start gap-1.5 font-semibold leading-tight">
          <MapPin className="mt-0.5 size-4 shrink-0 text-hivis-deep" aria-hidden />
          <span className="min-w-0 break-words">{place.title}</span>
        </p>
        <p className="mt-1 break-words text-[13px] text-concrete-dark">{place.address}</p>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="label text-[10px] text-concrete">Sample location</span>
          <a
            href={mapsHref(place.lat, place.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="label inline-flex h-8 items-center gap-1 bg-ink px-2.5 text-paper hover:bg-hivis hover:text-ink"
          >
            Open in Maps <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </div>
  );
}
