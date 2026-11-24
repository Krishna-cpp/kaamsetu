'use client';

import clsx from 'clsx';
import { Check, Pause, Phone, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { captionMs, ClipPlayer } from './clip-player';
import { PhoneFrame } from './phone';
import { Waveform } from './waveform';

type Clip = { src: string; hi: string; en: string };

const CLIPS = {
  intro: {
    src: '/audio/demo/worker-intro-hi.mp3',
    hi: 'मेरा नाम रमेश है, मैं प्लंबर हूँ, कोथरूड में रहता हूँ, 800 रुपये रोज़ चाहिए।',
    en: 'My name is Ramesh, I’m a plumber, I live in Kothrud, I need ₹800 a day.',
  },
  confirm: {
    src: '/audio/demo/bot-confirm-hi.mp3',
    hi: 'रमेश जी, आप कोथरूड में प्लंबर हैं, और रोज़ 800 रुपये चाहते हैं। क्या यह सही है?',
    en: 'Ramesh ji, you’re a plumber in Kothrud and want ₹800 a day. Is that right?',
  },
  saved: {
    src: '/audio/demo/bot-saved-hi.mp3',
    hi: 'हो गया! आपकी प्रोफ़ाइल चालू है। आपके पास काम आते ही मैं आपको आवाज़ में बताऊँगा।',
    en: 'Done! Your profile is live. I’ll tell you by voice as soon as there’s work near you.',
  },
  alert: {
    src: '/audio/demo/alert-hi.mp3',
    hi: 'रमेश जी, कोथरूड में 1.2 किलोमीटर दूर प्लंबर का काम है। 850 रुपये रोज़, 1 दिन के लिए, कल से। काम चाहिए तो “हाँ” दबाइए।',
    en: 'Ramesh ji, there’s plumber work in Kothrud, 1.2 km away. ₹850 a day, for 1 day, from tomorrow. Press “yes” if you want it.',
  },
} satisfies Record<string, Clip>;

type ClipKey = keyof typeof CLIPS;

type Msg =
  | { id: number; kind: 'text'; from: 'bot' | 'user'; text: string; lang: 'hi' | 'en'; time: string }
  | { id: number; kind: 'voice'; from: 'bot' | 'user'; clip: ClipKey; seed: number; secs: number; time: string }
  | { id: number; kind: 'choice'; options: string[]; chosen: number | null }
  | { id: number; kind: 'divider'; text: string }
  | { id: number; kind: 'job'; state: 'open' | 'accepted' | 'declined' };

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewMsg = DistOmit<Msg, 'id'>;

type Phase = 'idle' | 'running' | 'await' | 'done';

const STAGES = ['Voice note', 'Read-back', 'Profile live', 'Job alert', 'Hired'] as const;

export function VoiceDemo() {
  const player = useRef<ClipPlayer | null>(null);
  const token = useRef(0);
  const idSeq = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState<null | 'bot' | 'user'>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [caption, setCaption] = useState<Clip | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [stage, setStage] = useState(-1);
  const [muted, setMuted] = useState(false);
  const [realAudio, setRealAudio] = useState<boolean | null>(null);

  useEffect(() => {
    player.current = new ClipPlayer();
    return () => {
      token.current++;
      player.current?.dispose();
      player.current = null;
    };
  }, []);

  useEffect(() => {
    if (player.current) player.current.muted = muted;
  }, [muted]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: phase === 'idle' ? 'auto' : 'smooth' });
  }, [msgs, typing, phase]);

  const push = useCallback((m: NewMsg) => {
    const id = ++idSeq.current;
    setMsgs((xs) => [...xs, { ...m, id } as Msg]);
    return id;
  }, []);

  const run = useCallback(async () => {
    const p = player.current;
    if (!p) return;
    p.unlock();
    const my = ++token.current;
    const alive = () => token.current === my;
    const wait = (ms: number) => new Promise<boolean>((r) => window.setTimeout(() => r(alive()), ms));
    const now = () => '7:0' + Math.min(9, idSeq.current % 10);

    const speak = async (from: 'bot' | 'user', clip: ClipKey, seed: number) => {
      const c = CLIPS[clip];
      const ms = captionMs(c.hi);
      const id = push({ kind: 'voice', from, clip, seed, secs: Math.round(ms / 1000), time: now() });
      setCaption(c);
      setPlayingId(id);
      const r = await p.play(c.src, ms);
      setRealAudio(p.isReal);
      if (alive()) setPlayingId(null);
      return r === 'ended' && alive();
    };

    setMsgs([]);
    idSeq.current = 0;
    setPhase('running');
    setCaption(null);

    setStage(0);
    setTyping('bot');
    if (!(await wait(500))) return;
    setTyping(null);
    push({ kind: 'text', from: 'bot', lang: 'hi', text: 'अपना नाम, काम, इलाका और रोज़ कितने पैसे चाहिए, बताइए।', time: now() });
    if (!(await wait(700))) return;
    setTyping('user');
    if (!(await wait(1100))) return;
    setTyping(null);
    if (!(await speak('user', 'intro', 3))) return;

    setStage(1);
    setTyping('bot');
    if (!(await wait(900))) return;
    setTyping(null);
    if (!(await speak('bot', 'confirm', 11))) return;
    const choiceId = push({ kind: 'choice', options: ['सही है', 'बदलें'], chosen: null });
    if (!(await wait(1300))) return;
    setMsgs((xs) => xs.map((m) => (m.id === choiceId && m.kind === 'choice' ? { ...m, chosen: 0 } : m)));
    if (!(await wait(500))) return;

    setStage(2);
    setTyping('bot');
    if (!(await wait(700))) return;
    setTyping(null);
    if (!(await speak('bot', 'saved', 19))) return;
    if (!(await wait(600))) return;

    push({ kind: 'divider', text: 'Next morning · 6:58 AM' });
    setStage(3);
    if (!(await wait(700))) return;
    setTyping('bot');
    if (!(await wait(800))) return;
    setTyping(null);
    push({ kind: 'job', state: 'open' });
    if (!(await wait(300))) return;
    if (!(await speak('bot', 'alert', 27))) return;
    setPhase('await');
  }, [push]);

  const respond = useCallback(
    async (accept: boolean) => {
      const my = ++token.current;
      player.current?.stop();
      setPlayingId(null);
      setPhase('running');
      setMsgs((xs) => xs.map((m) => (m.kind === 'job' ? { ...m, state: accept ? 'accepted' : 'declined' } : m)));
      setTyping('bot');
      await new Promise((r) => window.setTimeout(r, 700));
      if (token.current !== my) return;
      setTyping(null);
      push(
        accept
          ? { kind: 'text', from: 'bot', lang: 'hi', text: 'बहुत बढ़िया! मालिक सुनीता देशपांडे को बता दिया गया है। उन्हें +91 98765 43210 पर फ़ोन कीजिए। शुभकामनाएँ!', time: '7:01' }
          : { kind: 'text', from: 'bot', lang: 'hi', text: 'ठीक है, कोई बात नहीं। अगला काम आते ही बताऊँगा।', time: '7:01' },
      );
      setCaption(
        accept
          ? { src: '', hi: 'बहुत बढ़िया! मालिक को बता दिया गया है।', en: 'Wonderful! The employer has been told, and her number is now shared with Ramesh.' }
          : { src: '', hi: 'ठीक है, कोई बात नहीं।', en: 'Okay, no problem. The next match in line gets the alert.' },
      );
      setStage(accept ? 4 : 3);
      setPhase('done');
    },
    [push],
  );

  const stop = () => {
    token.current++;
    player.current?.stop();
    setPlayingId(null);
    setTyping(null);
    setPhase('done');
  };

  const primary =
    phase === 'running' ? (
      <button type="button" onClick={stop} className="ks-btn ks-btn-paper">
        <Pause className="size-4" aria-hidden /> Stop
      </button>
    ) : (
      <button type="button" onClick={() => void run()} className="ks-btn ks-btn-hivis">
        {phase === 'idle' ? <Play className="size-4" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
        {phase === 'idle' ? 'Play the demo' : 'Replay'}
      </button>
    );

  return (
    <section aria-labelledby="demo-title" className="relative overflow-hidden bg-ink text-paper">
      <div className="hazard h-2" aria-hidden />
      <div className="container-x py-20 md:py-24">
        <div className="grid grid-cols-1 gap-4 border-b border-line-dark pb-5 md:grid-cols-12">
          <p className="label text-concrete md:col-span-3">§ 03 · Hear it work</p>
          <h2 id="demo-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
            Ramesh joins in <span className="serif-i text-hivis">one voice note.</span>
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-12 md:mt-14 lg:grid-cols-12 lg:gap-6">
          {/* left: narrative + captions */}
          <div className="order-2 flex flex-col lg:order-1 lg:col-span-6">
            <ol className="grid grid-cols-5 border-t border-line-dark" aria-label="Demo progress">
              {STAGES.map((s, i) => (
                <li key={s} className={clsx('label border-r border-line-dark py-3 pr-2 transition-colors duration-300 last:border-r-0 [&:not(:first-child)]:pl-2', i <= stage ? 'text-paper' : 'text-concrete-dark')}>
                  <span className={clsx('mb-2 block h-[3px] transition-colors duration-300', i < stage ? 'bg-paper' : i === stage ? 'bg-hivis' : 'bg-line-dark')} />
                  <span className="hidden sm:inline">0{i + 1} · </span>
                  {s}
                </li>
              ))}
            </ol>

            <div className="mt-8 min-h-[220px] md:min-h-[250px]" aria-live="polite">
              {caption ? (
                <div key={caption.hi} className="ks-fade-up">
                  <p className="label mb-4 flex items-center gap-2 text-concrete">
                    {playingId !== null ? (
                      <>
                        <span className="inline-block size-1.5 animate-pulse rounded-full bg-hivis" /> Now playing{realAudio === false || muted ? ' · captions mode' : ''}
                      </>
                    ) : (
                      'Transcript'
                    )}
                  </p>
                  <p lang="hi" className="text-[clamp(26px,2.8vw,40px)] leading-[1.35] font-semibold">
                    {caption.hi}
                  </p>
                  <p className="mt-4 max-w-[52ch] font-serif text-[20px] leading-snug text-paper/70 italic md:text-[22px]">{caption.en}</p>
                </div>
              ) : (
                <div>
                  <p className="max-w-[40ch] text-[18px] leading-relaxed text-paper/80 md:text-[20px]">
                    Ramesh is a plumber in Kothrud. He has never filled a job form. Press play to watch him join KaamSetu with a single Hindi voice note, then get a job alert the next morning.
                  </p>
                  <p className="label mt-6 text-concrete">Real Telegram flow · voices by ElevenLabs · works with sound off</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {primary}
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-pressed={muted}
                aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
                className="ks-btn ks-btn-ghost"
              >
                {muted ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
                {muted ? 'Sound off' : 'Sound on'}
              </button>
              {phase === 'await' && <span className="label animate-pulse text-signal">Tap Accept on the phone →</span>}
            </div>
          </div>

          {/* right: phone */}
          <div className="order-1 flex justify-center pt-6 lg:order-2 lg:col-span-6 lg:pt-0">
            <div className="relative">
              <span className="label absolute -top-6 left-0 text-concrete">Telegram · @KaamSetuBot</span>
              <PhoneFrame className="h-[600px] w-[300px] ring-1 ring-paper/15 md:h-[620px] md:w-[320px]" subtitle={typing === 'bot' ? 'typing…' : 'bot · online'} time="7:02">
                <div ref={scroller} data-lenis-prevent className="ks-noscroll absolute inset-0 overflow-y-auto px-3 pb-4 pt-3 text-ink">
                  <div className="flex min-h-full flex-col justify-end gap-2">
                    {msgs.length === 0 && phase === 'idle' && (
                      <div className="m-auto flex flex-col items-center gap-3 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => void run()}
                          aria-label="Play the demo"
                          className="grid size-16 place-items-center rounded-full bg-hivis text-ink transition-transform duration-200 hover:scale-105"
                        >
                          <Play className="ml-1 size-7" aria-hidden />
                        </button>
                        <p className="label text-concrete-dark">Tap to start · 40 seconds</p>
                      </div>
                    )}
                    {msgs.map((m) => (
                      <Bubble key={m.id} m={m} playing={m.id === playingId} player={player.current} onRespond={(a) => void respond(a)} />
                    ))}
                    {typing && (
                      <div className={clsx('ks-fade-up flex items-center gap-1.5 px-3 py-2.5', typing === 'user' ? 'self-end bg-ink text-paper' : 'self-start bg-paper shadow-[0_0_0_1px_var(--color-line)]')}>
                        {typing === 'user' ? (
                          <span className="label flex items-center gap-2">
                            <span className="inline-block size-2 animate-pulse rounded-full bg-hivis" /> Recording voice…
                          </span>
                        ) : (
                          <span className="ks-typing flex gap-1" aria-label="typing">
                            <span />
                            <span />
                            <span />
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Bubble({ m, playing, player, onRespond }: { m: Msg; playing: boolean; player: ClipPlayer | null; onRespond: (accept: boolean) => void }) {
  if (m.kind === 'divider') {
    return (
      <div className="label my-2 flex items-center gap-2 text-concrete-dark">
        <span className="h-px flex-1 bg-line" /> {m.text} <span className="h-px flex-1 bg-line" />
      </div>
    );
  }
  if (m.kind === 'text') {
    const mine = m.from === 'user';
    return (
      <div className={clsx('ks-fade-up max-w-[86%] px-3 py-2 text-[13.5px] leading-snug', mine ? 'self-end bg-ink text-paper' : 'self-start bg-paper shadow-[0_0_0_1px_var(--color-line)]')}>
        <p lang={m.lang}>{m.text}</p>
        <p className="mt-0.5 text-right text-[10px] text-concrete">{m.time}</p>
      </div>
    );
  }
  if (m.kind === 'voice') {
    const mine = m.from === 'user';
    const c = CLIPS[m.clip];
    return (
      <div className={clsx('ks-fade-up w-[86%] px-3 py-2.5', mine ? 'self-end bg-ink text-paper' : 'self-start bg-paper shadow-[0_0_0_1px_var(--color-line)]')}>
        <div className="flex items-center gap-2.5">
          <span className={clsx('grid size-9 shrink-0 place-items-center rounded-full', mine ? 'bg-hivis text-ink' : 'bg-ink text-paper')} aria-hidden>
            {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
          </span>
          <Waveform seed={m.seed} bars={30} playing={playing} player={player} tone={mine ? 'paper' : 'ink'} className="flex-1" />
        </div>
        <p lang="hi" className={clsx('mt-2 text-[12.5px] leading-snug', mine ? 'text-paper/75' : 'text-ink/75')}>
          {c.hi}
        </p>
        <p className={clsx('label mt-1 flex justify-between', mine ? 'text-paper/50' : 'text-concrete')}>
          <span>0:{String(m.secs).padStart(2, '0')}</span>
          <span>{m.time}</span>
        </p>
      </div>
    );
  }
  if (m.kind === 'choice') {
    return (
      <div className="ks-fade-up grid w-[86%] grid-cols-2 gap-1 self-start">
        {m.options.map((o, i) => (
          <span
            key={o}
            lang="hi"
            className={clsx(
              'flex items-center justify-center gap-1.5 border py-2 text-[13px] font-semibold transition-colors duration-300',
              m.chosen === i ? 'border-ink bg-ink text-paper' : 'border-line bg-paper text-ink',
            )}
          >
            {m.chosen === i && <Check className="size-3.5" aria-hidden />}
            {o}
          </span>
        ))}
      </div>
    );
  }
  // job alert
  return (
    <div className="ks-fade-up w-[92%] self-start border border-ink bg-paper">
      <div className="hazard h-1.5" aria-hidden />
      <div className="px-3 pb-3 pt-2.5">
        <p className="label">Job #0407 · Kothrud · ₹850/day</p>
        <p className="mt-2 flex items-baseline justify-between gap-2 font-display text-[22px] font-bold leading-none tracking-tight">
          Plumber
          <span lang="hi" className="text-[15px] font-semibold text-hivis-deep">
            प्लंबर
          </span>
        </p>
        <p className="mt-1.5 text-[12.5px] text-concrete-dark">1.2 km away · 1 day · from tomorrow</p>
      </div>
      {m.state === 'open' ? (
        <div className="grid grid-cols-2 border-t border-ink">
          <button type="button" onClick={() => onRespond(true)} className="ks-accept flex items-center justify-center gap-1.5 bg-hivis py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-ink hover:text-paper">
            <Check className="size-4" aria-hidden /> <span lang="hi">हाँ, काम चाहिए</span>
          </button>
          <button type="button" onClick={() => onRespond(false)} className="border-l border-ink py-2.5 text-[13px] font-semibold transition-colors hover:bg-paper-2">
            <span lang="hi">नहीं चाहिए</span>
          </button>
        </div>
      ) : m.state === 'accepted' ? (
        <div className="flex items-center justify-between gap-2 border-t border-ink bg-ok px-3 py-2.5 text-paper">
          <span className="label flex items-center gap-1.5">
            <Check className="size-3.5" aria-hidden /> Accepted
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap font-mono text-[12px] font-semibold tabular-nums">
            <Phone className="size-3.5" aria-hidden /> +91 98765 43210
          </span>
        </div>
      ) : (
        <div className="label border-t border-ink px-3 py-2.5 text-concrete-dark">Declined · passed to the next match</div>
      )}
    </div>
  );
}
