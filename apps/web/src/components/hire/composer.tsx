'use client';

import clsx from 'clsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Check, Keyboard, Loader2, Mic, MicOff, Minus, Plus, Square, TriangleAlert, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LANGUAGES, PUNE_LOCALITIES, SKILL_CODES, skillLabel, type Job, type Language, type LatLng, type Skill } from '@kaamsetu/core';
import { api, ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { useRecorder } from './use-recorder';
import { Waveform } from './waveform';

export const SAMPLES: { chip: string; text: string; lang?: Language }[] = [
  { chip: '2 painters · Baner · ₹900 · 3 days', text: 'Need 2 painters near Baner for 3 days, ₹900 per day, start tomorrow' },
  { chip: 'Plumber in Kothrud today ₹800', text: 'Need a plumber in Kothrud today, ₹800 per day' },
  { chip: 'Kharadi mein do plumber chahiye…', text: 'Kharadi mein do plumber chahiye, kal se, teen din, 850 rupaye roz', lang: 'hi' },
];

type Phase = 'idle' | 'transcribing' | 'parsing' | 'draft' | 'posting';

interface Draft {
  skill: Skill | '';
  workersNeeded: number;
  durationDays: number;
  wagePerDay: string;
  startDate: string;
  locality: string;
  localityMode: 'list' | 'other';
  location: LatLng | null;
  parsedLocality: string | null;
  radiusKm: number;
  description: string;
  language: Language;
  employerName: string;
  employerPhone: string;
}

const todayISO = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Props {
  onPosted: (job: Job) => void;
  onPostingChange: (v: boolean) => void;
  onNewJob: () => void;
}

export function Composer({ onPosted, onPostingChange, onNewJob }: Props) {
  const reduce = useReducedMotion();
  const toast = useToast();
  const rec = useRecorder();
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState<{ text: string; lang: Language | null; source: 'voice' | 'form' } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [posted, setPosted] = useState<Job | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'skill' | 'wage' | 'locality' | 'name', string>>>({});
  const holdStart = useRef(0);
  const toggled = useRef(false);
  const pendingStop = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLFormElement>(null);

  const recording = rec.state === 'recording';
  const busy = phase === 'transcribing' || phase === 'parsing' || phase === 'posting';

  useEffect(() => {
    if (typing) textareaRef.current?.focus();
  }, [typing]);

  /* ── voice ── */
  async function beginRecording() {
    if (busy) return;
    pendingStop.current = false;
    const ok = await rec.start();
    if (ok && pendingStop.current) await finishRecording();
  }

  async function finishRecording() {
    toggled.current = false;
    if (rec.state === 'requesting') {
      pendingStop.current = true;
      return;
    }
    const blob = await rec.stop();
    if (!blob || blob.size < 800) {
      toast.push({ title: 'That was very short', body: 'Hold the mic and speak for a couple of seconds.' });
      return;
    }
    setPhase('transcribing');
    try {
      const t = await api.transcribe(blob, 'job');
      if (!t.text.trim()) throw new Error('We could not hear anything. Try again closer to the mic.');
      await runParse(t.text, 'voice', t.language);
    } catch (e) {
      setPhase(draft ? 'draft' : 'idle');
      toast.push({ tone: 'error', title: 'Transcription failed', body: e instanceof Error ? e.message : undefined });
    }
  }

  function onMicPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    if (recording && toggled.current) {
      void finishRecording();
      return;
    }
    holdStart.current = Date.now();
    void beginRecording();
  }
  function onMicPointerUp() {
    if (!holdStart.current) return;
    const held = Date.now() - holdStart.current;
    holdStart.current = 0;
    if (held > 450) void finishRecording();
    else toggled.current = true; // tap → keep recording until the next tap
  }
  function onMicKey(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.repeat) return;
    if (recording || rec.state === 'requesting') void finishRecording();
    else {
      toggled.current = true;
      void beginRecording();
    }
  }

  /* ── parse (shared by voice, typing, samples) ── */
  async function runParse(text: string, source: 'voice' | 'form', lang: Language | null = null) {
    setTranscript({ text, lang, source });
    setPosted(null);
    setPhase('parsing');
    setErrors({});
    const words = text.split(/\s+/).length;
    try {
      const [parsed] = await Promise.all([api.parseJob(text, lang), sleep(reduce ? 0 : Math.min(1800, words * 55 + 250))]);
      const d = parsed.draft;
      const inList = d.locality ? PUNE_LOCALITIES.some((l) => l.name === d.locality) : true;
      setDraft((prev) => ({
        skill: d.skill ?? '',
        workersNeeded: d.workersNeeded,
        durationDays: d.durationDays,
        wagePerDay: d.wagePerDay ? String(d.wagePerDay) : '',
        startDate: d.startDate,
        locality: d.locality ?? '',
        localityMode: inList ? 'list' : 'other',
        location: d.location,
        parsedLocality: d.locality,
        radiusKm: prev?.radiusKm ?? 8,
        description: d.description && d.description !== text ? d.description : '',
        language: d.language,
        employerName: prev?.employerName ?? 'Mehta Interiors',
        employerPhone: prev?.employerPhone ?? '+91 90110 55667',
      }));
      setWarnings(parsed.warnings);
      setPhase('draft');
      if (!reduce) window.setTimeout(() => cardRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 120);
    } catch (e) {
      setPhase(draft ? 'draft' : 'idle');
      toast.push({ tone: 'error', title: 'Could not read that job', body: e instanceof Error ? e.message : 'Please try again.' });
    }
  }

  function submitTyped(e?: React.FormEvent) {
    e?.preventDefault();
    const t = typed.trim();
    if (t.length < 4 || busy) return;
    void runParse(t, 'form');
  }

  /* ── submit ── */
  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const wage = Number(draft.wagePerDay);
    const errs: typeof errors = {};
    if (!draft.skill) errs.skill = 'Pick a trade';
    if (!Number.isFinite(wage) || wage < 100) errs.wage = 'Enter a daily wage (min ₹100)';
    if (draft.locality.trim().length < 2) errs.locality = 'Where is the work?';
    if (!draft.employerName.trim()) errs.name = 'Your name or business';
    setErrors(errs);
    if (Object.keys(errs).length || !draft.skill) return;

    setPhase('posting');
    onPostingChange(true);
    try {
      const sameLocality = draft.parsedLocality === draft.locality;
      const { job } = await api.createJob({
        skill: draft.skill,
        workersNeeded: draft.workersNeeded,
        durationDays: draft.durationDays,
        wagePerDay: Math.round(wage),
        startDate: draft.startDate,
        locality: draft.locality.trim(),
        location: sameLocality && draft.location ? draft.location : undefined,
        radiusKm: draft.radiusKm,
        description: draft.description.trim() || null,
        employer: { name: draft.employerName.trim(), phone: draft.employerPhone.trim() || null, business: draft.employerName.trim() || null },
        language: draft.language,
        source: transcript?.source ?? 'form',
        transcript: transcript?.text ?? null,
      });
      onPosted(job);
      setPosted(job);
      setPhase('draft');
    } catch (err) {
      setPhase('draft');
      const msg = err instanceof ApiError && err.code === 'rate_limited' ? err.message : err instanceof Error ? err.message : 'Please try again.';
      toast.push({ tone: 'error', title: 'Could not post the job', body: msg });
    } finally {
      onPostingChange(false);
    }
  }

  function reset() {
    setPosted(null);
    setDraft(null);
    setTranscript(null);
    setWarnings([]);
    setPhase('idle');
    setTyped('');
  }

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const micDenied = rec.state === 'denied' || rec.state === 'unsupported';
  const words = transcript?.text.split(/\s+/) ?? [];

  return (
    <div className="px-4 pb-8 pt-6 sm:px-6">
      <p className="label flex items-center gap-2 text-concrete-dark">
        <span className="inline-block size-1.5 bg-hivis" aria-hidden /> New job · speak or type
      </p>
      <h1 className="mt-3 font-display text-[38px] font-bold leading-[0.95] tracking-[-0.04em] sm:text-[44px]">
        Say what you need.
        <br />
        <span className="serif-i text-[1.05em] font-normal tracking-[-0.02em] text-concrete-dark">We&rsquo;ll find who&rsquo;s nearby.</span>
      </h1>

      {/* ── voice bar ── */}
      <div className={clsx('mt-6 flex items-stretch border transition-colors', recording ? 'border-hivis' : 'border-ink')}>
        <button
          type="button"
          onPointerDown={onMicPointerDown}
          onPointerUp={onMicPointerUp}
          onPointerLeave={() => holdStart.current && recording && onMicPointerUp()}
          onKeyDown={onMicKey}
          onContextMenu={(e) => e.preventDefault()}
          disabled={busy}
          aria-pressed={recording}
          aria-label={recording ? 'Stop recording' : 'Record job by voice. Hold to talk, or tap to start and tap again to stop.'}
          className={clsx(
            'relative grid size-[84px] shrink-0 touch-none select-none place-items-center transition-colors duration-200 disabled:cursor-wait',
            recording ? 'bg-hivis text-ink' : 'bg-ink text-paper hover:bg-ink-2',
          )}
        >
          {recording && !reduce && <span className="absolute inset-2 animate-[pulse-ring_1.6s_ease-out_infinite] border-2 border-ink/50" aria-hidden />}
          {phase === 'transcribing' ? (
            <Loader2 className="size-7 animate-spin" aria-hidden />
          ) : recording ? (
            <Square className="size-6 fill-ink" aria-hidden />
          ) : micDenied ? (
            <MicOff className="size-7" aria-hidden />
          ) : (
            <Mic className="size-8" strokeWidth={1.75} aria-hidden />
          )}
        </button>
        <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-1 px-3.5">
          {recording ? (
            <>
              <div className="flex items-center justify-between">
                <span className="label flex items-center gap-1.5 text-hivis-deep">
                  <span className="size-1.5 animate-pulse rounded-full bg-hivis" aria-hidden /> Listening
                </span>
                <span className="font-mono text-xs tabular-nums" aria-live="off">
                  0:{String(rec.elapsed).padStart(2, '0')}
                </span>
              </div>
              <Waveform analyser={rec.analyser} active className="h-9 w-full" />
              <span className="label text-[10px] text-concrete">{toggled.current ? 'Tap again to finish' : 'Release to finish'}</span>
            </>
          ) : phase === 'transcribing' ? (
            <>
              <span className="label text-concrete-dark">Transcribing…</span>
              <div className="skeleton h-2 w-full" />
            </>
          ) : (
            <>
              <span className="text-[15px] font-semibold leading-tight">{micDenied ? 'Microphone unavailable' : 'Hold to talk, or tap once'}</span>
              <span className="text-xs leading-snug text-concrete-dark">
                {micDenied ? (
                  'Allow mic access in your browser, or type the job below.'
                ) : (
                  <>
                    <span lang="hi">{LANGUAGES.hi.nativeName}</span> · <span lang="mr">{LANGUAGES.mr.nativeName}</span> · English
                  </>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── type instead ── */}
      <div className="mt-3">
        {!typing ? (
          <button
            type="button"
            onClick={() => setTyping(true)}
            className={clsx('label inline-flex items-center gap-1.5 py-1.5 hover:text-hivis', micDenied ? 'bg-signal px-2 text-ink' : 'text-concrete-dark')}
          >
            <Keyboard className="size-3.5" aria-hidden /> Type instead
          </button>
        ) : (
          <form onSubmit={submitTyped} className="border border-line bg-paper-2/40 focus-within:border-ink">
            <label htmlFor="typed-job" className="sr-only">
              Describe the job
            </label>
            <textarea
              id="typed-job"
              ref={textareaRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submitTyped();
                }
              }}
              rows={3}
              placeholder="e.g. Need 2 painters near Baner for 3 days, ₹900 per day"
              className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[15px] leading-snug placeholder:text-concrete focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <button type="button" onClick={() => setTyping(false)} className="grid size-8 place-items-center text-concrete hover:text-ink" aria-label="Close typing">
                <X className="size-4" aria-hidden />
              </button>
              <button
                type="submit"
                disabled={typed.trim().length < 4 || busy}
                className="label inline-flex h-8 items-center gap-1.5 bg-ink px-3 text-paper hover:bg-hivis hover:text-ink disabled:opacity-40"
              >
                Read it <ArrowRight className="size-3.5" aria-hidden />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── samples ── */}
      <div className="mt-4">
        <p className="label text-concrete">Try a sample</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <li key={s.chip}>
              <button
                type="button"
                disabled={busy || recording}
                onClick={() => {
                  setTyped(s.text);
                  void runParse(s.text, 'form', s.lang ?? null);
                }}
                className="inline-flex h-8 items-center border border-line bg-paper px-2.5 text-[12.5px] transition-colors hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-50"
                lang={s.lang === 'hi' ? 'hi-Latn' : undefined}
              >
                {s.chip}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* ── transcript ── */}
      <AnimatePresence>
        {transcript && (
          <motion.figure
            key={transcript.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-6 border-l-2 border-hivis pl-3.5"
          >
            <figcaption className="label flex items-center gap-2 text-concrete">
              {transcript.source === 'voice' ? 'You said' : 'You wrote'}
              {transcript.lang && <span className="bg-paper-2 px-1 text-concrete-dark">{LANGUAGES[transcript.lang].name}</span>}
              {phase === 'parsing' && <span className="text-hivis-deep">· reading…</span>}
            </figcaption>
            <blockquote className="mt-1.5 text-[17px] leading-snug" aria-live="polite">
              &ldquo;
              {words.map((w, i) => (
                <motion.span
                  key={i}
                  initial={reduce ? false : { opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.05 }}
                >
                  {w}{' '}
                </motion.span>
              ))}
              &rdquo;
            </blockquote>
          </motion.figure>
        )}
      </AnimatePresence>

      {/* ── warnings ── */}
      <AnimatePresence>
        {phase !== 'parsing' &&
          warnings.map((w) => (
            <motion.p
              key={w}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex gap-2 overflow-hidden border-l-4 border-ink bg-signal px-3 py-2 text-[13px] leading-snug"
              role="status"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {w}
            </motion.p>
          ))}
      </AnimatePresence>

      {/* ── draft card ── */}
      <AnimatePresence>
        {phase === 'parsing' && !draft && (
          <motion.div key="sk" exit={{ opacity: 0 }} className="mt-6 space-y-3 border border-line p-4" role="status" aria-label="Reading the job">
            <div className="skeleton h-3 w-24" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10" />
              ))}
            </div>
          </motion.div>
        )}
        {draft && posted && (
          <motion.div
            key={`posted-${posted.id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 border border-ink bg-paper"
          >
            <div className="hazard h-2" aria-hidden />
            <div className="p-4">
              <p className="label flex items-center gap-2 text-concrete-dark">
                <Check className="size-3.5 text-hivis-deep" aria-hidden /> Posted · JOB #{posted.code}
              </p>
              <p className="mt-2 font-display text-[22px] font-bold leading-tight tracking-tight">
                {posted.workersNeeded} × {skillLabel(posted.skill)} <span className="serif-i font-normal text-concrete-dark">in {posted.locality}</span>
              </p>
              <p className="mt-1 font-mono text-[13px] text-concrete-dark">
                ₹{posted.wagePerDay.toLocaleString('en-IN')}/day · {posted.durationDays} day{posted.durationDays > 1 ? 's' : ''} · from {posted.startDate.slice(8, 10)}/{posted.startDate.slice(5, 7)} · {posted.radiusKm} km
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPosted(null)} className="label h-10 border border-ink hover:bg-paper-2">
                  Edit &amp; repost
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    onNewJob();
                  }}
                  className="label inline-flex h-10 items-center justify-center gap-1.5 bg-ink text-paper hover:bg-hivis hover:text-ink"
                >
                  <Plus className="size-3.5" aria-hidden /> New job
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {draft && !posted && (
          <motion.form
            ref={cardRef}
            key="card"
            onSubmit={post}
            noValidate
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: phase === 'parsing' ? 0.5 : 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 border border-ink bg-paper"
            aria-label="Job details"
          >
            <div className="flex items-center justify-between border-b border-ink px-4 py-2">
              <p className="label">Job card · edit anything</p>
              <button type="button" onClick={reset} className="label text-concrete hover:text-ink">
                Clear
              </button>
            </div>
            <motion.div
              className="grid grid-cols-2 gap-x-4 gap-y-4 p-4"
              initial="hidden"
              animate="show"
              key={transcript?.text}
              variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}
            >
              <Field label="Trade" error={errors.skill} className="col-span-2">
                {(id) => (
                  <select id={id} value={draft.skill} onChange={(e) => set('skill', e.target.value as Skill)} className="ks-field font-display text-xl font-semibold">
                    <option value="" disabled>
                      Choose a trade…
                    </option>
                    {SKILL_CODES.map((s) => (
                      <option key={s} value={s}>
                        {skillLabel(s)} · {skillLabel(s, 'hi')}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Workers">{(id) => <Stepper id={id} value={draft.workersNeeded} min={1} max={50} onChange={(v) => set('workersNeeded', v)} unit="people" />}</Field>
              <Field label="Days">{(id) => <Stepper id={id} value={draft.durationDays} min={1} max={365} onChange={(v) => set('durationDays', v)} unit="days" />}</Field>
              <Field label="Wage / day" error={errors.wage}>
                {(id) => (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 font-mono text-concrete">₹</span>
                    <input
                      id={id}
                      inputMode="numeric"
                      value={draft.wagePerDay}
                      onChange={(e) => set('wagePerDay', e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
                      className="ks-field pl-4 font-mono"
                      placeholder="900"
                    />
                  </div>
                )}
              </Field>
              <Field label="Start">
                {(id) => <input id={id} type="date" min={todayISO()} value={draft.startDate} onChange={(e) => set('startDate', e.target.value)} className="ks-field font-mono text-sm" />}
              </Field>
              <Field label="Locality" error={errors.locality} className="col-span-2">
                {(id) =>
                  draft.localityMode === 'list' ? (
                    <select
                      id={id}
                      value={draft.locality}
                      onChange={(e) => (e.target.value === '__other' ? setDraft({ ...draft, localityMode: 'other', locality: '' }) : set('locality', e.target.value))}
                      className="ks-field"
                    >
                      <option value="" disabled>
                        Choose a locality…
                      </option>
                      {PUNE_LOCALITIES.map((l) => (
                        <option key={l.name} value={l.name}>
                          {l.name}
                        </option>
                      ))}
                      <option value="__other">Other (type it)…</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input id={id} value={draft.locality} onChange={(e) => set('locality', e.target.value)} className="ks-field" placeholder="Area, landmark…" />
                      <button type="button" onClick={() => setDraft({ ...draft, localityMode: 'list', locality: '' })} className="label shrink-0 text-concrete hover:text-ink">
                        List
                      </button>
                    </div>
                  )
                }
              </Field>
              <Field label={`Search radius · ${draft.radiusKm} km`} className="col-span-2">
                {(id) => (
                  <input
                    id={id}
                    type="range"
                    min={2}
                    max={15}
                    step={1}
                    value={draft.radiusKm}
                    onChange={(e) => set('radiusKm', Number(e.target.value))}
                    className="ks-range"
                    style={{ ['--pct' as string]: `${((draft.radiusKm - 2) / 13) * 100}%` }}
                    aria-valuetext={`${draft.radiusKm} kilometres`}
                  />
                )}
              </Field>
              <Field label="Notes for workers (optional)" className="col-span-2">
                {(id) => <input id={id} value={draft.description} onChange={(e) => set('description', e.target.value)} className="ks-field text-sm" placeholder="2BHK repaint, bring own brushes…" maxLength={400} />}
              </Field>
              <Field label="Your name / business" error={errors.name}>
                {(id) => <input id={id} value={draft.employerName} onChange={(e) => set('employerName', e.target.value)} className="ks-field text-sm" autoComplete="organization" />}
              </Field>
              <Field label="Phone (shared on accept)">
                {(id) => <input id={id} type="tel" value={draft.employerPhone} onChange={(e) => set('employerPhone', e.target.value)} className="ks-field font-mono text-sm" autoComplete="tel" />}
              </Field>
            </motion.div>
            <button
              type="submit"
              disabled={busy}
              className="group flex h-14 w-full items-center justify-between bg-hivis px-4 text-ink transition-colors hover:bg-ink hover:text-paper disabled:cursor-wait"
            >
              <span className="font-display text-lg font-bold tracking-tight">{phase === 'posting' ? 'Finding workers…' : 'Find workers'}</span>
              {phase === 'posting' ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
              )}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, error, className, children }: { label: string; error?: string; className?: string; children: (id: string) => React.ReactNode }) {
  const id = `f-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }}
      className={clsx('min-w-0', className)}
    >
      <label htmlFor={id} className="label block text-[10px] text-concrete">
        {label}
      </label>
      {children(id)}
      {error && (
        <p className="mt-1 text-xs font-medium text-hivis-deep" role="alert">
          {error}
        </p>
      )}
    </motion.div>
  );
}

function Stepper({ id, value, min, max, onChange, unit }: { id: string; value: number; min: number; max: number; onChange: (v: number) => void; unit: string }) {
  return (
    <div className="flex h-10 items-center border-b border-line">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className="grid size-8 place-items-center border border-line hover:border-ink disabled:opacity-30" aria-label={`Fewer ${unit}`}>
        <Minus className="size-3.5" aria-hidden />
      </button>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ''));
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n || min)));
        }}
        className="w-full min-w-0 bg-transparent text-center font-display text-xl font-semibold tabular-nums focus:outline-none"
        aria-label={unit}
      />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className="grid size-8 place-items-center border border-line hover:border-ink disabled:opacity-30" aria-label={`More ${unit}`}>
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
