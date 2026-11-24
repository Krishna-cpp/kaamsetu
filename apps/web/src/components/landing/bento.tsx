import { ArrowUpRight, BadgeCheck, EyeOff, MapPin, Mic, PhoneOff, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { SpotCard } from './interactions';

const AWS = [
  { k: 'Bedrock · Nova', v: 'Pulls name, trade, area and wage out of free speech' },
  { k: 'Lambda', v: 'Runs the bot, matching and alert fan-out' },
  { k: 'API Gateway', v: 'Telegram and voice-agent webhooks' },
  { k: 'DynamoDB', v: 'Workers, jobs, matches; single-digit ms reads' },
  { k: 'S3', v: 'Voice notes and generated alert audio' },
  { k: 'Location Service', v: 'Geocodes “Kothrud” to a point and a radius' },
  { k: 'Amplify', v: 'Hosts this site and the employer app' },
  { k: 'CloudWatch', v: 'Latency, errors and match funnels' },
];

const PIPE = ['Voice note', 'Scribe', 'Nova', 'Location', 'DynamoDB', 'Match', 'TTS', 'Telegram'];

const VOICE = [
  { k: 'Scribe', v: 'Speech-to-text tuned for Hindi, Marathi and Hinglish code-switching', bars: [0.4, 0.7, 1, 0.6, 0.8, 0.3, 0.5] },
  { k: 'Multilingual v2 · Flash', v: 'Natural job alerts and read-backs in the worker’s own language', bars: [0.6, 0.3, 0.9, 0.5, 0.7, 1, 0.4] },
  { k: 'Conversational AI', v: '“Kaam Didi”, a phone agent for workers without Telegram', bars: [0.8, 0.5, 0.6, 1, 0.4, 0.7, 0.5] },
];

const PRIVACY = [
  { icon: Mic, k: 'Consent by voice', v: 'Nothing is saved until the worker agrees, in their language.' },
  { icon: PhoneOff, k: 'Phone hidden', v: 'Numbers are shared only after both sides accept.' },
  { icon: MapPin, k: 'Locality only', v: 'Public profiles show “Kothrud”, never a street or a pin.' },
  { icon: Trash2, k: '“Delete my data”', v: 'Say it to the bot and the profile, ratings and matches are gone.' },
];

function Dial({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75;
  return (
    <svg viewBox="0 0 88 88" className="size-[112px]" role="img" aria-label={`KaamScore ${value} out of 100`}>
      <g transform="rotate(135 44 44)">
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-line)" strokeWidth="7" strokeDasharray={`${arc} ${c}`} />
        <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-hivis)" strokeWidth="7" strokeDasharray={`${(arc * value) / 100} ${c}`} className="ks-dial" />
      </g>
      <text x="44" y="48" textAnchor="middle" fontSize="24" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-display)" letterSpacing="-1">
        {value}
      </text>
      <text x="44" y="64" textAnchor="middle" fontSize="7" fill="var(--color-concrete)" fontFamily="var(--font-mono)" letterSpacing="0.8">
        KAAMSCORE
      </text>
    </svg>
  );
}

export function TechTrust() {
  return (
    <section aria-labelledby="stack-title" className="relative border-t border-ink bg-paper">
      <div className="container-x py-20 md:py-28">
        <div className="grid grid-cols-1 gap-4 border-b border-ink pb-5 md:grid-cols-12">
          <p className="label md:col-span-3">§ 05 · Stack &amp; trust</p>
          <h2 id="stack-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
            Serious plumbing, <span className="serif-i text-hivis">for plumbers.</span>
          </h2>
        </div>

        <div className="mt-10 grid grid-cols-1 border-t border-l border-ink md:grid-cols-6 lg:grid-cols-12">
          {/* AWS */}
          <SpotCard as="article" className="flex flex-col border-r border-b border-ink p-6 md:col-span-6 md:p-8 lg:col-span-7 lg:row-span-2">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="label text-concrete">Infrastructure</p>
                <h3 className="display mt-3 text-[clamp(34px,3.4vw,52px)]">
                  Built on <span className="text-hivis">AWS</span>
                </h3>
              </div>
              <span className="label border border-ink px-2 py-1">8 services</span>
            </header>
            <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2">
              {AWS.map((a, i) => (
                <li key={a.k} className="group/row flex gap-4 border-t border-line py-4 sm:[&:nth-child(odd)]:pr-6 sm:[&:nth-child(even)]:border-l sm:[&:nth-child(even)]:pl-6">
                  <span className="label pt-1 text-concrete">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block font-display text-[19px] font-semibold tracking-tight transition-colors group-hover/row:text-hivis">{a.k}</span>
                    <span className="mt-1 block text-[14px] leading-snug text-ink/70">{a.v}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-8">
              <p className="label mb-3 text-concrete">Request path · one voice note</p>
              <ol className="flex flex-wrap items-center gap-y-2 font-mono text-[12px] uppercase tracking-[0.04em]">
                {PIPE.map((p, i) => (
                  <li key={p} className="flex items-center">
                    <span className={i === 0 || i === PIPE.length - 1 ? 'bg-ink px-2 py-1.5 text-paper' : 'border border-ink px-2 py-1.5'}>{p}</span>
                    {i < PIPE.length - 1 && <span className="h-px w-3 bg-ink sm:w-5" aria-hidden />}
                  </li>
                ))}
              </ol>
              <div className="hazard mt-6 h-2" aria-hidden />
            </div>
          </SpotCard>

          {/* KaamScore card */}
          <SpotCard as="article" className="border-r border-b border-ink bg-paper-2 p-6 md:col-span-6 md:p-8 lg:col-span-5">
            <p className="label text-concrete">Trust layer · KaamScore</p>
            <div className="ks-idcard mt-5 border border-ink bg-paper">
              <div className="flex items-center justify-between bg-ink px-4 py-2 text-paper">
                <span className="label">KaamSetu · Worker ID</span>
                <span className="label text-signal">W_RAMESH</span>
              </div>
              <div className="flex items-center gap-4 p-4">
                <div className="grid size-[72px] shrink-0 place-items-center bg-hivis font-display text-[30px] font-bold text-ink" aria-hidden>
                  RP
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-[22px] leading-tight font-bold tracking-tight">Ramesh Pawar</p>
                  <p className="text-[14px] text-ink/75">
                    Plumber · <span lang="hi">प्लंबर</span> · Kothrud
                  </p>
                  <p className="label mt-2 flex items-center gap-3">
                    <span>4.8★</span>
                    <span>12 jobs</span>
                    <span className="text-concrete">Since Sep</span>
                  </p>
                </div>
                <Dial value={87} />
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
                <span className="label inline-flex items-center gap-1.5 bg-hivis px-2 py-1 text-ink">
                  <BadgeCheck className="size-3.5" aria-hidden /> Verified Plumber · 12 jobs, 4.8★
                </span>
                <span className="label inline-flex items-center gap-1.5 border border-ink px-2 py-1">
                  <EyeOff className="size-3.5" aria-hidden /> Phone hidden
                </span>
              </div>
            </div>
            <Link href="/w/w_ramesh" className="label group mt-5 inline-flex items-center gap-1.5 border-b border-ink pb-0.5 transition-colors hover:text-hivis">
              Open a sample profile
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </Link>
          </SpotCard>

          {/* ElevenLabs */}
          <SpotCard as="article" dark className="border-r border-b border-ink bg-ink p-6 text-paper md:col-span-6 md:p-8 lg:col-span-5">
            <p className="label text-concrete">Voice layer</p>
            <h3 className="display mt-3 text-[clamp(30px,2.8vw,42px)]">
              Voice by <span className="serif-i text-signal">ElevenLabs</span>
            </h3>
            <ul className="mt-6">
              {VOICE.map((v) => (
                <li key={v.k} className="flex items-start gap-4 border-t border-line-dark py-3.5">
                  <span className="mt-1 flex h-5 w-8 shrink-0 items-center gap-[2px]" aria-hidden>
                    {v.bars.map((b, i) => (
                      <span key={i} className="block h-full w-[3px] bg-hivis" style={{ transform: `scaleY(${b})` }} />
                    ))}
                  </span>
                  <span>
                    <span className="block font-display text-[18px] font-semibold tracking-tight">{v.k}</span>
                    <span className="mt-0.5 block text-[14px] leading-snug text-paper/70">{v.v}</span>
                  </span>
                </li>
              ))}
            </ul>
          </SpotCard>

          {/* Privacy */}
          <SpotCard as="article" className="border-r border-b border-ink p-6 md:col-span-6 md:p-8 lg:col-span-12">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="label text-concrete">Privacy</p>
                <h3 className="display mt-3 text-[clamp(30px,2.8vw,42px)]">
                  Workers <span className="serif-i text-hivis">own</span> their profile.
                </h3>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4">
                {PRIVACY.map((p) => (
                  <li key={p.k} className="border-t border-line py-4 sm:pr-5 lg:border-t-0 lg:border-l lg:px-5 lg:py-0">
                    <p.icon className="size-5 text-hivis" aria-hidden strokeWidth={1.75} />
                    <p className="mt-3 font-display text-[18px] font-semibold tracking-tight">{p.k}</p>
                    <p className="mt-1 text-[14px] leading-snug text-ink/70">{p.v}</p>
                  </li>
                ))}
              </ul>
            </div>
          </SpotCard>
        </div>
      </div>
    </section>
  );
}
