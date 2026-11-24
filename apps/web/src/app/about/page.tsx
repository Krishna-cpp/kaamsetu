import { WEIGHTS } from '@kaamsetu/core';
import { ArrowUpRight, Github } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About',
  description: 'Team Meteora, the KaamSetu architecture on AWS and ElevenLabs, the matching formula and our privacy principles.',
};

/** Fill in names when ready; roles render on their own until then. */
const TEAM: { role: string; name?: string; focus: string }[] = [
  { name: 'Mithun G', role: 'Team lead · Voice AI', focus: 'Kaam Didi phone agent, ElevenLabs Scribe + TTS, Bedrock Nova extraction' },
  { name: 'Krishna Kumar', role: 'Full-stack', focus: 'Architecture, matching engine, employer dashboard, Telegram bot' },
  { name: 'Samvrith Singh', role: 'Cloud & data', focus: 'Lambda, API Gateway, DynamoDB, S3, Location Service, Amplify, CloudWatch' },
  { name: 'Sreesanth Narayanan', role: 'Product & design', focus: 'High-Vis Editorial design system, landing page, worker ID card' },
];

const PRINCIPLES = [
  { k: 'Consent first, by voice', v: 'The bot explains what it saves, in the worker’s language and out loud, and saves nothing until they agree.' },
  { k: 'Phone numbers are never public', v: 'Contact is exchanged only after the worker and the employer both accept the same job.' },
  { k: 'Locality, not location', v: 'Public profiles show a neighbourhood such as Kothrud. Exact coordinates stay server-side for matching.' },
  { k: '“Delete my data”', v: 'Say it to the bot in any language and the profile, ratings and match history are removed.' },
  { k: 'Explainable, not opaque', v: 'Every match carries a plain-language reason; there is no hidden boost or paid ranking.' },
];

type Box = { x: number; y: number; w?: number; title: string; sub: string; tag?: 'AWS' | 'ElevenLabs' | 'Actor' };

const BW = 196;
const BH = 78;
const COL = [24, 262, 500, 738, 976];
const ROW = [36, 226, 416];

const BOXES: Record<string, Box> = {
  worker: { x: COL[0]!, y: ROW[0]!, title: 'Worker', sub: 'Telegram voice note · phone call', tag: 'Actor' },
  employer: { x: COL[0]!, y: ROW[2]!, title: 'Employer', sub: 'Web · speaks the job', tag: 'Actor' },
  scribe: { x: COL[1]!, y: ROW[1]!, title: 'Scribe STT', sub: 'speech → text, hi/mr/en', tag: 'ElevenLabs' },
  nova: { x: COL[2]!, y: ROW[1]!, title: 'Bedrock · Nova', sub: 'extract name, trade, area, wage', tag: 'AWS' },
  location: { x: COL[3]!, y: ROW[1]!, title: 'Location Service', sub: 'geocode locality → point', tag: 'AWS' },
  dynamo: { x: COL[4]!, y: ROW[1]!, title: 'DynamoDB', sub: 'workers · jobs · matches', tag: 'AWS' },
  match: { x: COL[4]!, y: ROW[0]!, title: 'Matching engine', sub: 'rank in radius, explain', tag: 'AWS' },
  tts: { x: COL[3]!, y: ROW[0]!, title: 'Multilingual TTS', sub: 'alert in worker’s language', tag: 'ElevenLabs' },
  alert: { x: COL[2]!, y: ROW[0]!, title: 'Telegram alert', sub: 'Accept / Not interested', tag: 'Actor' },
};

function SvgBox({ b }: { b: Box }) {
  const dark = b.tag === 'Actor';
  const w = b.w ?? BW;
  return (
    <g>
      <rect x={b.x} y={b.y} width={w} height={BH} fill={dark ? 'var(--color-ink)' : 'var(--color-paper)'} stroke="var(--color-ink)" />
      {b.tag && b.tag !== 'Actor' && (
        <>
          <rect x={b.x} y={b.y} width={b.tag === 'AWS' ? 34 : 74} height={16} fill={b.tag === 'AWS' ? 'var(--color-hivis)' : 'var(--color-signal)'} />
          <text x={b.x + 6} y={b.y + 11.5} fontSize="9" fontFamily="var(--font-mono)" letterSpacing="0.6" fill="var(--color-ink)">
            {b.tag.toUpperCase()}
          </text>
        </>
      )}
      <text x={b.x + 12} y={b.y + 44} fontSize="17" fontWeight="700" fontFamily="var(--font-display)" letterSpacing="-0.4" fill={dark ? 'var(--color-paper)' : 'var(--color-ink)'}>
        {b.title}
      </text>
      <text x={b.x + 12} y={b.y + 63} fontSize="11.5" fontFamily="var(--font-sans)" fill={dark ? 'rgb(243 239 230 / 0.7)' : 'var(--color-concrete-dark)'}>
        {b.sub}
      </text>
    </g>
  );
}

function Arrow({ d, dashed = false, hot = false }: { d: string; dashed?: boolean; hot?: boolean }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={hot ? 'var(--color-hivis)' : 'var(--color-ink)'}
      strokeWidth={hot ? 2 : 1.25}
      strokeDasharray={dashed ? '5 4' : undefined}
      markerEnd={hot ? 'url(#arrow-hot)' : 'url(#arrow)'}
    />
  );
}

function ArchitectureSvg() {
  const b = BOXES;
  const midY = ROW[1]! + BH / 2;
  const topY = ROW[0]! + BH / 2;
  return (
    <svg viewBox="0 0 1196 660" className="h-auto w-full" role="img" aria-labelledby="arch-svg-title arch-svg-desc">
      <title id="arch-svg-title">KaamSetu architecture</title>
      <desc id="arch-svg-desc">
        Worker voice notes and employer job posts go through ElevenLabs Scribe, Amazon Bedrock Nova extraction and Amazon Location geocoding into DynamoDB. The matching engine ranks
        workers, ElevenLabs text-to-speech voices the alert and Telegram delivers it. Lambda and API Gateway handle webhooks, S3 stores audio, Amplify hosts the web app and CloudWatch
        monitors everything.
      </desc>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-ink)" />
        </marker>
        <marker id="arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--color-hivis)" />
        </marker>
        <pattern id="arch-dots" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="1.2" height="1.2" fill="var(--color-line)" />
        </pattern>
      </defs>
      <rect width="1196" height="520" fill="url(#arch-dots)" />

      {/* inputs into the shared pipeline */}
      <Arrow d={`M${b.worker!.x + BW / 2} ${b.worker!.y + BH} V ${midY - 14} H ${b.scribe!.x - 4}`} />
      <Arrow d={`M${b.employer!.x + BW / 2} ${b.employer!.y} V ${midY + 14} H ${b.scribe!.x - 4}`} />
      <text x={b.worker!.x + BW / 2 + 8} y={midY - 22} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-concrete-dark)">
        VOICE · OGG
      </text>
      <text x={b.worker!.x + BW / 2 + 8} y={midY + 32} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-concrete-dark)">
        VOICE · WEB
      </text>

      {/* pipeline */}
      <Arrow d={`M${b.scribe!.x + BW} ${midY} H ${b.nova!.x - 4}`} hot />
      <Arrow d={`M${b.nova!.x + BW} ${midY} H ${b.location!.x - 4}`} hot />
      <Arrow d={`M${b.location!.x + BW} ${midY} H ${b.dynamo!.x - 4}`} hot />
      <Arrow d={`M${b.dynamo!.x + BW / 2} ${b.dynamo!.y} V ${b.match!.y + BH + 4}`} hot />
      <Arrow d={`M${b.match!.x} ${topY} H ${b.tts!.x + BW + 4}`} hot />
      <Arrow d={`M${b.tts!.x} ${topY} H ${b.alert!.x + BW + 4}`} hot />
      <Arrow d={`M${b.alert!.x} ${topY} H ${b.worker!.x + BW + 4}`} dashed />
      <text x={b.worker!.x + BW + 12} y={topY - 8} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-concrete-dark)">
        SPOKEN ALERT
      </text>
      {/* employer sees ranked workers */}
      <Arrow d={`M${b.match!.x + BW} ${topY} H 1186 V ${ROW[2]! + BH / 2} H ${b.employer!.x + BW + 4}`} dashed />
      <text x={b.employer!.x + BW + 12} y={ROW[2]! + BH / 2 - 8} fontSize="10" fontFamily="var(--font-mono)" fill="var(--color-concrete-dark)">
        RANKED SHORTLIST + WHY · CONTACT AFTER MUTUAL ACCEPT
      </text>

      {Object.entries(b).map(([k, box]) => (
        <SvgBox key={k} b={box} />
      ))}

      {/* platform band */}
      <g>
        <rect x="24" y="548" width="1148" height="92" fill="var(--color-ink)" />
        <text x="40" y="572" fontSize="10" fontFamily="var(--font-mono)" letterSpacing="0.8" fill="var(--color-signal)">
          RUNS ON AWS
        </text>
        {[
          ['Lambda + API Gateway', 'bot & agent webhooks'],
          ['S3', 'voice notes · alert audio'],
          ['Amplify', 'hosts web + employer app'],
          ['CloudWatch', 'latency · errors · funnels'],
        ].map(([t, s], i) => (
          <g key={t}>
            {i > 0 && <line x1={40 + i * 283} y1="584" x2={40 + i * 283} y2="626" stroke="var(--color-line-dark)" />}
            <text x={52 + i * 283} y="604" fontSize="16" fontWeight="700" fontFamily="var(--font-display)" fill="var(--color-paper)">
              {t}
            </text>
            <text x={52 + i * 283} y="622" fontSize="11" fontFamily="var(--font-sans)" fill="rgb(243 239 230 / 0.65)">
              {s}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

const MOBILE_FLOW = [
  ['Worker / Employer', 'Telegram voice note, phone call, or web'],
  ['ElevenLabs Scribe', 'Speech to text in Hindi, Marathi, English'],
  ['Bedrock · Amazon Nova', 'Extracts name, trade, locality, wage'],
  ['Amazon Location Service', 'Geocodes the locality to a point'],
  ['DynamoDB', 'Stores workers, jobs and matches'],
  ['Matching engine', 'Ranks workers in the radius, with reasons'],
  ['ElevenLabs TTS', 'Voices the alert in the worker’s language'],
  ['Telegram', 'Spoken alert with Accept / Not interested'],
] as const;

export default function AboutPage() {
  const weights = Object.entries(WEIGHTS) as [string, number][];
  return (
    <div className="pt-14">
      {/* header */}
      <section className="container-x pt-14 pb-12 md:pt-20 md:pb-16" aria-labelledby="about-title">
        <p className="label">About · Devnovate Ideathon 2026 · Track 4</p>
        <h1 id="about-title" className="display mt-6 text-[clamp(56px,10vw,160px)]">
          Team <span className="serif-i text-hivis">Meteora.</span>
        </h1>
        <div className="mt-8 grid grid-cols-1 gap-6 border-t border-ink pt-6 md:grid-cols-12">
          <p className="max-w-[52ch] text-[18px] leading-relaxed md:col-span-7 md:text-[20px]">
            We built KaamSetu, a bridge to work, because the people who build our cities still find work by standing on a street corner at dawn. If you can speak, you should be able to find a job.
          </p>
          <div className="flex flex-col gap-3 md:col-span-5 md:items-end">
            <a href="https://github.com/Krishna-cpp/kaamsetu" target="_blank" rel="noreferrer" className="label inline-flex items-center gap-2 border border-ink px-3 py-2 transition-colors hover:bg-ink hover:text-paper">
              <Github className="size-3.5" aria-hidden /> Source on GitHub · MIT
            </a>
            <Link href="/" className="label inline-flex items-center gap-1.5 border-b border-ink pb-0.5 transition-colors hover:text-hivis">
              Back to the story <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
        <ul className="mt-12 grid grid-cols-1 border-t border-l border-ink sm:grid-cols-2 lg:grid-cols-4">
          {TEAM.map((m, i) => (
            <li key={m.role} className="border-r border-b border-ink p-5 md:p-6">
              <p className="label text-concrete">0{i + 1}</p>
              <p className="mt-6 font-display text-[22px] font-bold tracking-tight">{m.name ?? m.role}</p>
              {m.name && <p className="label mt-1 text-hivis-deep">{m.role}</p>}
              <p className="mt-2 text-[14px] leading-snug text-ink/70">{m.focus}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* architecture */}
      <section className="border-t border-ink bg-paper-2" aria-labelledby="arch-title">
        <div className="container-x py-16 md:py-24">
          <div className="grid grid-cols-1 gap-4 border-b border-ink pb-5 md:grid-cols-12">
            <p className="label md:col-span-3">§ Architecture</p>
            <h2 id="arch-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
              One pipeline, <span className="serif-i text-hivis">two doors.</span>
            </h2>
          </div>
          <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-ink/80 md:ml-[25%]">
            Workers and employers enter differently but share the same voice pipeline. Everything is serverless: Telegram and the phone agent hit API Gateway, Lambda does the work, and a job
            alert is usually spoken back within seconds of a job being posted.
          </p>
          <div className="mt-10 hidden border border-ink bg-paper p-4 md:block lg:p-6">
            <ArchitectureSvg />
          </div>
          <ol className="mt-8 md:hidden">
            {MOBILE_FLOW.map(([t, s], i) => (
              <li key={t} className="relative border-l border-ink pb-6 pl-6 last:pb-0">
                <span className={`absolute -left-[7px] top-1 block size-[13px] border border-ink ${i === 0 || i === MOBILE_FLOW.length - 1 ? 'bg-ink' : 'bg-hivis'}`} aria-hidden />
                <p className="font-display text-[19px] font-bold tracking-tight">{t}</p>
                <p className="text-[14px] text-ink/70">{s}</p>
              </li>
            ))}
            <li className="label mt-6 bg-ink p-4 leading-relaxed text-paper">Runs on Lambda + API Gateway · S3 · Amplify · CloudWatch</li>
          </ol>
        </div>
      </section>

      {/* formula */}
      <section className="border-t border-ink" aria-labelledby="formula-title">
        <div className="container-x py-16 md:py-24">
          <div className="grid grid-cols-1 gap-4 border-b border-ink pb-5 md:grid-cols-12">
            <p className="label md:col-span-3">§ Matching</p>
            <h2 id="formula-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
              A score you can <span className="serif-i text-hivis">read aloud.</span>
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-7">
              <p className="overflow-x-auto font-mono text-[15px] leading-loose md:text-[18px]">
                <span className="text-hivis">score</span> ={' '}
                {weights.map(([k, w], i) => (
                  <span key={k} className="whitespace-nowrap">
                    {w.toFixed(2)}·<span className="font-semibold">{k}</span>
                    {i < weights.length - 1 ? ' + ' : ''}
                  </span>
                ))}
              </p>
              <div className="mt-6 flex h-10 w-full border border-ink" aria-hidden>
                {weights.map(([k, w], i) => (
                  <div
                    key={k}
                    className={`label flex items-end p-1.5 ${['bg-ink text-paper', 'bg-hivis', 'bg-signal', 'bg-concrete text-paper', 'bg-line'][i] ?? ''}`}
                    style={{ width: `${w * 100}%` }}
                  >
                    {w >= 0.15 ? k : ''}
                  </div>
                ))}
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 md:col-span-5">
              {[
                ['skill', 'Exact trade = 1; related trades count partly (a mason can do helper work).'],
                ['proximity', 'Falls off with distance inside the job’s radius (default 8 km).'],
                ['wage', 'How well the offered wage meets the worker’s ask.'],
                ['trust', 'Ratings, completed jobs and verification: the KaamScore.'],
                ['availability', 'Free on the start date, and recently active.'],
              ].map(([k, v]) => (
                <div key={k} className="border-t border-line py-3">
                  <dt className="label">{k}</dt>
                  <dd className="mt-1 text-[14px] leading-snug text-ink/75">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* privacy */}
      <section className="border-t border-ink bg-ink text-paper" aria-labelledby="privacy-title">
        <div className="hazard h-2" aria-hidden />
        <div className="container-x py-16 md:py-24">
          <div className="grid grid-cols-1 gap-4 border-b border-line-dark pb-5 md:grid-cols-12">
            <p className="label text-concrete md:col-span-3">§ Privacy</p>
            <h2 id="privacy-title" className="display text-[clamp(36px,4.6vw,72px)] md:col-span-9">
              The worker <span className="serif-i text-hivis">owns</span> the profile.
            </h2>
          </div>
          <ol className="mt-4">
            {PRINCIPLES.map((p, i) => (
              <li key={p.k} className="grid grid-cols-1 gap-2 border-b border-line-dark py-6 md:grid-cols-12 md:gap-6">
                <span className="label text-concrete md:col-span-1">0{i + 1}</span>
                <p className="font-display text-[22px] font-bold tracking-tight md:col-span-4 md:text-[26px]">{p.k}</p>
                <p className="max-w-[56ch] text-[16px] leading-relaxed text-paper/75 md:col-span-7">{p.v}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
