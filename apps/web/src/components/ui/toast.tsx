'use client';

import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, CircleAlert, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

export type ToastTone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  title: string;
  body?: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (t: { title: string; body?: string; tone?: ToastTone; ms?: number }) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useToast must be used inside <ToastProvider>');
  return v;
}

const ICON = { info: Info, success: Check, error: CircleAlert } as const;

/** Tiny dependency-free toast stack: bottom-left, newest on top, auto-dismiss. */
export function ToastProvider({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const reduce = useReducedMotion();

  const dismiss = useCallback((id: number) => setToasts((ts) => ts.filter((t) => t.id !== id)), []);
  const push = useCallback<ToastApi['push']>(
    ({ title, body, tone = 'info', ms = 4200 }) => {
      const id = ++seq.current;
      setToasts((ts) => [{ id, title, body, tone }, ...ts].slice(0, 4));
      window.setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );
  const api = useMemo(() => ({ push }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-[120] flex flex-col items-start gap-2 sm:right-auto sm:w-[360px]"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const Icon = ICON[t.tone];
            return (
              <motion.div
                key={t.id}
                layout={!reduce}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24, transition: { duration: 0.18 } }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className={clsx(
                  'pointer-events-auto flex w-full items-stretch border',
                  dark ? 'border-paper/20 bg-ink-2 text-paper' : 'border-ink bg-ink text-paper',
                )}
                role={t.tone === 'error' ? 'alert' : 'status'}
              >
                <span
                  className={clsx(
                    'grid w-10 shrink-0 place-items-center',
                    t.tone === 'success' && 'bg-hivis text-paper',
                    t.tone === 'error' && 'bg-signal text-ink',
                    t.tone === 'info' && 'bg-paper/10 text-paper',
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1 px-3 py-2.5">
                  <p className="text-sm font-semibold leading-tight">{t.title}</p>
                  {t.body && <p className="mt-0.5 text-xs leading-snug text-paper/70">{t.body}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="grid w-9 shrink-0 place-items-center text-paper/60 transition-colors hover:text-paper"
                  aria-label="Dismiss notification"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
