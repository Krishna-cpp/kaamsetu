'use client';

import clsx from 'clsx';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useState } from 'react';
import type { PublicWorker } from '@kaamsetu/core';
import { api } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

const WORDS = ['', 'Poor', 'Okay', 'Good', 'Great', 'Excellent'];

export function RatePanel({ jobId, worker, onDone }: { jobId: string; worker: PublicWorker; onDone: (w: PublicWorker) => void }) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const shown = hover || stars;
  const first = worker.name.split(' ')[0];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stars) return;
    setBusy(true);
    try {
      const { worker: nw } = await api.rate({ jobId, workerId: worker.id, stars, comment: comment.trim() || null });
      const delta = nw.kaamScore - worker.kaamScore;
      toast.push({
        tone: 'success',
        title: `Rated ${first} ${stars}★`,
        body: `KaamScore ${worker.kaamScore} → ${nw.kaamScore}${delta ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}`,
      });
      onDone(nw);
    } catch (err) {
      toast.push({ tone: 'error', title: 'Could not save rating', body: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden border-t border-line"
    >
      <div className="space-y-3 p-3.5">
        <fieldset>
          <legend className="label mb-2 text-concrete-dark">How was {first}&rsquo;s work?</legend>
          <div className="flex items-center gap-1" role="radiogroup" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={stars === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setStars(n)}
                className="grid size-9 place-items-center"
              >
                <Star className={clsx('size-6 transition-colors', n <= shown ? 'fill-hivis text-ink' : 'text-line')} strokeWidth={1.5} aria-hidden />
              </button>
            ))}
            <span className="label ml-2 text-concrete-dark">{WORDS[shown]}</span>
          </div>
        </fieldset>
        <label className="block">
          <span className="sr-only">Comment (optional)</span>
          <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a note (optional)" maxLength={300} className="ks-field text-sm" />
        </label>
        <button
          type="submit"
          disabled={!stars || busy}
          className="label h-10 w-full bg-ink text-paper transition-colors hover:bg-hivis hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Saving…' : 'Submit rating'}
        </button>
      </div>
    </motion.form>
  );
}
