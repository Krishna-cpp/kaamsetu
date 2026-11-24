'use client';

/**
 * "Talk to KaamSetu": a live voice call with the ElevenLabs Conversational AI agent "Kaam Didi".
 * The agent registers workers, finds jobs and accepts jobs through our server tools (/api/agent/*).
 *   <TalkToKaamSetu variant="primary" | "ghost" | "inverted" label?="Talk to KaamSetu" className? />
 */
import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useState } from 'react';

// The ElevenLabs SDK (WebRTC) is ~130 KB: load it only when someone actually opens the call.
const CallSheet = dynamic(() => import('./voice-call-sheet'), { ssr: false });


export function TalkToKaamSetu({
  variant = 'primary',
  label = 'Talk to KaamSetu',
  className,
}: {
  variant?: 'primary' | 'ghost' | 'inverted';
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onPointerEnter={() => void import('./voice-call-sheet')}
        aria-haspopup="dialog"
        className={clsx(
          'group inline-flex items-center gap-3 px-5 py-4 font-display text-lg font-semibold tracking-tight transition-colors duration-200',
          variant === 'primary' && 'bg-hivis text-ink hover:bg-ink hover:text-paper',
          variant === 'ghost' && 'border border-ink text-ink hover:bg-ink hover:text-paper',
          variant === 'inverted' && 'bg-paper text-ink hover:bg-hivis',
          className,
        )}
      >
        <span className="relative inline-flex size-2.5" aria-hidden>
          <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-50" />
          <span className="relative inline-block size-2.5 rounded-full bg-current" />
        </span>
        {label}
      </button>
      <AnimatePresence>{open && <CallSheet onClose={() => setOpen(false)} />}</AnimatePresence>
    </>
  );
}
