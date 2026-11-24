'use client';

/** The live call UI for Kaam Didi. Loaded on demand (it pulls in the ElevenLabs/WebRTC SDK). */
import { useConversation } from '@elevenlabs/react';
import clsx from 'clsx';
import { motion, useReducedMotion } from 'framer-motion';
import { Mic, MicOff, PhoneOff, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? '';

type Line = { id: number; source: 'user' | 'ai'; text: string };

export default function CallSheet({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion();
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const idRef = useRef(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const conversation = useConversation({
    micMuted: muted,
    onMessage: ({ message, source }) => setLines((l) => [...l.slice(-30), { id: ++idRef.current, source, text: message }]),
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
      setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Microphone permission is needed to talk to Kaam Didi.' : 'Could not start the call. Please try again.');
    }
  }, [conversation]);

  const end = useCallback(async () => {
    if (status === 'connected' || status === 'connecting') await conversation.endSession().catch(() => undefined);
  }, [conversation, status]);

  const close = useCallback(() => {
    void end();
    onClose();
  }, [end, onClose]);

  // Esc to close + focus management
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [close]);

  // Level meter driven by input/output volume
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    const tick = () => {
      const v = isSpeaking ? conversation.getOutputVolume() : conversation.getInputVolume();
      setLevel((p) => p * 0.6 + Math.min(1, v * 1.6) * 0.4);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [live, isSpeaking, conversation]);

  const listRef = useRef<HTMLOListElement>(null);
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
          : 'Listening: speak in Hindi, Marathi or English'
        : 'Ready';

  return (
    <motion.div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kd-title"
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-[460px] flex-col bg-ink text-paper outline-none"
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="hazard hazard-anim h-2 w-full" aria-hidden />
        <header className="flex items-start justify-between border-b border-line-dark px-5 py-4">
          <div>
            <p className="label text-paper/50">ElevenLabs voice agent · 24×7</p>
            <h2 id="kd-title" className="mt-1 font-display text-3xl font-bold tracking-tight">
              Kaam Didi{' '}
              <span lang="hi" className="deva text-xl font-semibold text-paper/50">
                काम दीदी
              </span>
            </h2>
          </div>
          <button type="button" onClick={close} className="p-2 text-paper/70 transition-colors hover:text-hivis" aria-label="Close">
            <X className="size-5" />
          </button>
        </header>

        {/* level meter: concentric squares */}
        <div className="relative flex h-56 items-center justify-center overflow-hidden border-b border-line-dark">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden
              className={clsx('absolute border', isSpeaking ? 'border-hivis' : 'border-paper/40')}
              style={{
                width: 64 + i * 38 + level * (40 + i * 30),
                height: 64 + i * 38 + level * (40 + i * 30),
                opacity: live ? 0.9 - i * 0.2 : 0.15,
                transition: 'width 90ms linear, height 90ms linear, border-color 200ms',
              }}
            />
          ))}
          <span className={clsx('relative grid size-16 place-items-center', live ? (isSpeaking ? 'bg-hivis text-ink' : 'bg-paper text-ink') : 'bg-line-dark text-paper/60')}>
            {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
          </span>
          <p className="label absolute bottom-3 left-0 right-0 text-center text-paper/60" aria-live="polite">
            {stateLabel}
          </p>
        </div>

        <ol ref={listRef} className="min-h-24 flex-1 space-y-3 overflow-y-auto px-5 py-4 text-[15px]" aria-live="polite">
          {lines.length === 0 && (
            <li className="text-paper/50">
              Try: <span className="text-paper">“Mujhe kaam chahiye, main painter hoon, Baner mein rehta hoon.”</span> Kaam Didi registers you and
              reads out jobs near you. Built for workers who can’t type or read.
            </li>
          )}
          {lines.map((l) => (
            <li key={l.id} className={clsx('flex gap-3', l.source === 'user' && 'flex-row-reverse text-right')}>
              <span className={clsx('label mt-1 shrink-0', l.source === 'ai' ? 'text-hivis' : 'text-signal')}>{l.source === 'ai' ? 'Didi' : 'You'}</span>
              <span className="deva">{l.text}</span>
            </li>
          ))}
        </ol>

        {error && <p className="border-t border-line-dark bg-signal px-5 py-3 text-sm text-ink">{error}</p>}

        <footer className="flex items-center gap-2 border-t border-line-dark p-4">
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
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
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
        <p className="label px-5 pb-4 text-paper/40">Voice is processed by ElevenLabs. Say “delete my data” anytime.</p>
      </motion.div>
    </motion.div>
  );
}
