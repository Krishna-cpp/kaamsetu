'use client';

/**
 * The live call UI for Kaam Didi (ElevenLabs Conversational AI). Loaded on demand and rendered
 * through a portal on <body>, so no transformed ancestor (magnetic buttons, GSAP) can resize or clip it.
 * Desktop: 420px right-side sheet. Mobile: full-width bottom sheet. Dim backdrop, Esc/backdrop close, focus trap.
 */
import { useConversation } from '@elevenlabs/react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? '';
const BARS = 28;

type Line = { id: number; source: 'user' | 'ai'; text: string };

export default function CallSheet({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<Sheet onClose={onClose} />, document.body);
}

function Sheet({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [desktop, setDesktop] = useState(true);
  const idRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const conversation = useConversation({
    micMuted: muted,
    onMessage: ({ message, source }) => setLines((l) => [...l.slice(-40), { id: ++idRef.current, source, text: message }]),
    onError: (message) => setError(typeof message === 'string' ? message : 'Connection error'),
  });
  const { status, isSpeaking } = conversation;
  const live = status === 'connected';

  const start = useCallback(async () => {
    setError(null);
    if (!AGENT_ID) {
      setError('The voice agent is not configured on this deployment yet.');
      return;
    }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await conversation.startSession({ agentId: AGENT_ID, connectionType: 'webrtc' });
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'NotAllowedError'
          ? 'Microphone permission is needed to talk to Kaam Didi.'
          : 'Could not start the call. Please try again.',
      );
    }
  }, [conversation]);

  const end = useCallback(async () => {
    if (status === 'connected' || status === 'connecting') await conversation.endSession().catch(() => undefined);
  }, [conversation, status]);

  const close = useCallback(() => {
    void end();
    onClose();
  }, [end, onClose]);

  // Lock page scroll, Esc to close, focus trap, restore focus on close
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialogRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
      if (!focusables.length) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = prevOverflow;
      prevFocus?.focus({ preventScroll: true });
    };
  }, [close]);

  // Live level from the SDK (output while Didi speaks, mic input otherwise)
  const [level, setLevel] = useState(0);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!live) {
      setLevel(0);
      return;
    }
    let raf = 0;
    const tick = () => {
      const v = isSpeaking ? conversation.getOutputVolume() : conversation.getInputVolume();
      setLevel((p) => p * 0.6 + Math.min(1, v * 1.8) * 0.4);
      setPhase((p) => p + 0.18);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, isSpeaking, conversation]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [lines, reduce]);

  const stateLabel = error
    ? 'Not connected'
    : status === 'connecting'
      ? 'Connecting…'
      : live
        ? isSpeaking
          ? 'Kaam Didi is speaking'
          : 'Listening · Hindi, मराठी or English'
        : 'Ready when you are';

  const enter = desktop ? { x: 48, opacity: 0 } : { y: 48, opacity: 0 };

  return (
    <div className="fixed inset-0 z-[1000]" role="presentation">
      <motion.button
        type="button"
        aria-label="Close call panel"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default bg-ink/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.25 }}
        onClick={close}
      />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kd-title"
        tabIndex={-1}
        className={clsx(
          'absolute flex flex-col overflow-hidden bg-ink text-paper shadow-[0_0_0_1px_rgb(255_255_255/0.06)] outline-none',
          // mobile: full-width bottom sheet · ≥640px: 420px right-side sheet
          'inset-x-0 bottom-0 max-h-[92dvh] sm:inset-x-auto sm:top-0 sm:right-0 sm:h-dvh sm:max-h-none sm:w-[420px]',
        )}
        initial={reduce ? { opacity: 0 } : enter}
        animate={{ x: 0, y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : enter}
        transition={{ duration: reduce ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hazard hazard-anim h-2 w-full shrink-0" aria-hidden />

        {/* header */}
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line-dark px-6 py-5">
          <div className="min-w-0">
            <p className="label whitespace-nowrap text-paper/55">ElevenLabs voice agent · 24×7</p>
            <h2 id="kd-title" className="mt-1.5 flex items-baseline gap-2 font-display text-[28px] leading-none font-bold tracking-tight">
              Kaam Didi
              <span lang="hi" className="deva text-lg font-semibold text-paper/50">
                काम दीदी
              </span>
            </h2>
          </div>
          <button type="button" onClick={close} className="-mr-2 shrink-0 p-2 text-paper/70 transition-colors hover:text-hivis" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        {/* avatar + live waveform + status */}
        <div className="shrink-0 border-b border-line-dark px-6 py-6">
          <div className="flex items-center gap-4">
            <span
              className={clsx(
                'relative grid size-16 shrink-0 place-items-center transition-colors duration-200',
                live ? (isSpeaking ? 'bg-hivis text-ink' : 'bg-paper text-ink') : 'bg-line-dark text-paper/70',
              )}
              aria-hidden
            >
              {live && <span className="absolute inset-0 animate-ping bg-current opacity-20" style={{ animationDuration: '1.8s' }} />}
              {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
            </span>
            <div className="flex h-12 min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
              {Array.from({ length: BARS }, (_, i) => {
                const wave = live ? 0.25 + 0.75 * level * (0.55 + 0.45 * Math.sin(phase + i * 0.7)) : 0.12 + 0.06 * Math.sin(i * 1.3);
                return (
                  <span
                    key={i}
                    className={clsx('w-full rounded-[1px]', live && isSpeaking ? 'bg-hivis' : live ? 'bg-paper' : 'bg-paper/25')}
                    style={{ height: `${Math.max(8, Math.min(100, wave * 100))}%`, transition: 'height 80ms linear' }}
                  />
                );
              })}
            </div>
          </div>
          <p className="label mt-4 text-paper/65" aria-live="polite">
            {stateLabel}
          </p>
        </div>

        {/* transcript: the only scrolling region */}
        <ol ref={listRef} className="min-h-[96px] flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 py-5 text-[15px] leading-relaxed" aria-live="polite" aria-label="Conversation">
          {lines.length === 0 && (
            <li className="text-paper/55">
              Try: <span lang="hi" className="text-paper">“Mujhe kaam chahiye, main painter hoon, Baner mein rehta hoon.”</span> Kaam Didi registers you and
              reads out jobs near you. Built for workers who can’t type or read.
            </li>
          )}
          {lines.map((l) => (
            <li key={l.id} className={clsx('flex gap-3', l.source === 'user' && 'flex-row-reverse text-right')}>
              <span className={clsx('label mt-1 shrink-0', l.source === 'ai' ? 'text-hivis' : 'text-signal')}>{l.source === 'ai' ? 'Didi' : 'You'}</span>
              <span className="deva min-w-0 break-words">{l.text}</span>
            </li>
          ))}
        </ol>

        {error && <p className="shrink-0 border-t border-line-dark bg-signal px-6 py-3 text-sm text-ink">{error}</p>}

        {/* actions */}
        <footer className="flex shrink-0 items-center gap-2 border-t border-line-dark px-6 py-4">
          {!live ? (
            <button
              type="button"
              onClick={() => void start()}
              disabled={status === 'connecting'}
              className="flex-1 bg-hivis px-5 py-4 font-display text-lg font-semibold text-ink transition-colors hover:bg-paper disabled:opacity-60"
            >
              {status === 'connecting' ? 'Connecting…' : 'Start call'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="border border-line-dark p-4 transition-colors hover:border-paper"
                aria-pressed={muted}
                aria-label="Mute microphone"
              >
                {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
              </button>
              <button
                type="button"
                onClick={() => void end()}
                className="flex flex-1 items-center justify-center gap-2 bg-paper px-5 py-4 font-display text-lg font-semibold text-ink transition-colors hover:bg-hivis"
              >
                <PhoneOff className="size-5" /> End call
              </button>
            </>
          )}
        </footer>
        <p className="shrink-0 px-6 pb-5 text-xs leading-snug text-paper/50">
          Voice is processed by ElevenLabs. Your number is shared only when you accept a job. Say “delete my data” anytime.
        </p>
      </motion.div>
    </div>
  );
}
