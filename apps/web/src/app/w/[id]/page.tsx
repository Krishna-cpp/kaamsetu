import { getCtx, LANGUAGES, skillLabel, toPublicWorker, type PublicWorker, type Rating } from '@kaamsetu/core/server';
import { ArrowRight, MapPin, Star } from 'lucide-react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { cache } from 'react';
import { KaamDial, VerifiedSeal } from '@/components/profile/kaam-dial';
import { IntroPlayer, UtilityActions } from '@/components/profile/profile-actions';
import { tradeColor } from '@/components/ui/trade';
import { initials, inr } from '@/lib/format';

export const dynamic = 'force-dynamic';

const load = cache(async (id: string): Promise<{ worker: PublicWorker; ratings: Rating[] } | null> => {
  const ctx = getCtx();
  const w = await ctx.repo.getWorker(id);
  if (!w || w.status === 'deleted') return null;
  const ratings = (await ctx.repo.listRatings(id)).slice(0, 6);
  return { worker: toPublicWorker(w), ratings };
});

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return { title: 'Worker not found' };
  const w = data.worker;
  const trade = w.skills[0] ? skillLabel(w.skills[0]) : 'Worker';
  return {
    title: `${w.name} · ${trade}`,
    description: `${trade} in ${w.locality}, Pune. KaamScore ${w.kaamScore}/100 · ${w.stats.ratingAvg.toFixed(1)}★ from ${w.stats.jobsCompleted} jobs. Verified on KaamSetu.`,
  };
}

const isDeva = (s: string) => /[ऀ-ॿ]/.test(s);
const idNumber = (id: string) => 'KS-' + id.replace(/^w_/, '').toUpperCase();
const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export default async function WorkerPage({ params }: Params) {
  const id = (await params).id;
  const data = await load(id);
  if (!data) notFound();
  const { worker: w, ratings } = data;

  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  const url = `${process.env.PUBLIC_BASE_URL ?? `${proto}://${host}`}/w/${w.id}`;
  const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#121210', light: '#0000' } });

  const main = w.skills[0] ?? 'helper';
  const tc = tradeColor(main);
  const lang = LANGUAGES[w.language];
  const deva = w.language === 'en' ? skillLabel(main, 'hi') : skillLabel(main, w.language);
  const first = w.name.split(' ')[0];
  const wa = `https://wa.me/?text=${encodeURIComponent(`${w.name}, ${skillLabel(main)} in ${w.locality}. KaamScore ${w.kaamScore}/100 on KaamSetu: ${url}`)}`;

  return (
    <div className="min-h-dvh pt-14">
      <div className="container-x grid max-w-[1240px] grid-cols-[minmax(0,1fr)] items-start gap-10 py-8 sm:py-12 lg:grid-cols-[minmax(0,580px)_minmax(0,1fr)] lg:gap-16 lg:py-16">
        {/* ── ID card ── */}
        <div className="relative mx-auto w-full max-w-[580px]">
          {/* lanyard */}
          <div className="no-print mx-auto flex w-24 flex-col items-center" aria-hidden>
            <span className="hazard h-10 w-11 border-x-2 border-ink" />
            <span className="-mb-2 h-5 w-14 border-2 border-ink bg-concrete-dark" />
          </div>
          <article
            className="print-flat relative border-2 border-ink bg-[#FBF8F1] mr-1.5 shadow-[6px_6px_0_0_#121210] sm:mr-0 sm:shadow-[10px_10px_0_0_#121210]"
            aria-label={`KaamSetu worker ID for ${w.name}`}
          >
            {/* strap */}
            <header className="hazard relative flex h-12 items-center justify-between border-b-2 border-ink px-3">
              <span className="label bg-ink px-2 py-1 text-paper">KaamSetu</span>
              <span className="absolute left-1/2 top-1/2 h-3 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper" aria-hidden />
              <span className="label bg-ink px-2 py-1 text-signal">Worker ID</span>
            </header>

            <div className="relative p-5 sm:p-7">
              {w.verified && (
                <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
                  <VerifiedSeal size={84} />
                </div>
              )}
              <div className="flex items-end gap-4 sm:gap-5">
                <div
                  className="grid size-24 shrink-0 place-items-center font-display text-4xl font-bold tracking-tight sm:size-28 sm:text-5xl"
                  style={{ background: tc.bg, color: tc.fg }}
                  aria-hidden
                >
                  {initials(w.name)}
                </div>
                <div className="min-w-0 pb-1">
                  <p className="label text-concrete-dark">ID · {idNumber(w.id)}</p>
                  <p className="label mt-1 inline-flex items-center gap-1.5 bg-ink px-1.5 py-0.5 text-paper">
                    <span className={`size-1.5 rounded-full ${w.availability === 'available' ? 'bg-hivis' : 'bg-concrete'}`} aria-hidden />
                    {w.availability === 'available' ? 'Available now' : 'Busy'}
                  </p>
                </div>
              </div>

              <h1 className="mt-5 font-display text-[44px] font-bold leading-[0.9] tracking-[-0.045em] sm:text-[64px]">{w.name}</h1>
              <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-display text-2xl font-semibold tracking-tight">{w.skills.map((s) => skillLabel(s)).join(' · ')}</span>
                <span className="deva text-2xl text-concrete-dark" lang={w.language === 'mr' ? 'mr' : 'hi'}>
                  {deva}
                </span>
              </p>

              <dl className="mt-6 grid grid-cols-2 border-t-2 border-ink sm:grid-cols-4">
                {[
                  { k: 'Locality', v: w.locality, icon: true },
                  { k: 'Speaks', v: lang.code === 'en' ? 'English' : `${lang.nativeName} · ${lang.name}`, deva: lang.code !== 'en' },
                  { k: 'Experience', v: w.experienceYears != null ? `${w.experienceYears} yr${w.experienceYears === 1 ? '' : 's'}` : 'New' },
                  { k: 'Asks', v: `${inr(w.expectedWage)}/day` },
                ].map((f, i) => (
                  <div key={f.k} className={`border-b border-line py-3 pr-2 ${i % 2 ? 'pl-3' : ''} sm:pl-3 sm:first:pl-0 ${i > 0 ? 'sm:border-l' : ''} ${i % 2 ? 'border-l' : ''}`}>
                    <dt className="label text-[10px] text-concrete">{f.k}</dt>
                    <dd className="mt-1 flex items-center gap-1 text-[15px] font-medium leading-tight">
                      {f.icon && <MapPin className="size-3.5 shrink-0 text-hivis-deep" aria-hidden />}
                      <span className={f.deva ? 'deva' : undefined}>{f.v}</span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 grid grid-cols-[auto_1fr] items-center gap-3 sm:gap-5">
                <div className="text-center">
                  <KaamDial value={w.kaamScore} size={116} />
                  <p className="label -mt-3 text-[10px]">KaamScore</p>
                </div>
                <dl className="grid grid-cols-2 gap-px border border-ink bg-ink">
                  <div className="bg-[#FBF8F1] p-2.5 sm:p-3">
                    <dt className="label text-[10px] text-concrete">Rating</dt>
                    <dd className="mt-1 flex items-center gap-1 font-display text-3xl font-bold tracking-tight">
                      {w.stats.ratingCount ? w.stats.ratingAvg.toFixed(1) : '—'}
                      <Star className="size-5 fill-hivis text-ink" strokeWidth={1.5} aria-label="stars" />
                    </dd>
                    <dd className="font-mono text-[11px] text-concrete-dark">{w.stats.ratingCount} review{w.stats.ratingCount === 1 ? '' : 's'}</dd>
                  </div>
                  <div className="bg-[#FBF8F1] p-2.5 sm:p-3">
                    <dt className="label text-[10px] text-concrete">Jobs done</dt>
                    <dd className="mt-1 font-display text-3xl font-bold tracking-tight">{w.stats.jobsCompleted}</dd>
                    <dd className="font-mono text-[11px] text-concrete-dark">{Math.round(w.stats.completionRate * 100)}% done</dd>
                  </div>
                </dl>
              </div>

              {w.badges.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Badges">
                  {w.badges.map((b) => (
                    <li
                      key={b.id}
                      className={`label px-2 py-1.5 text-[10.5px] ${b.tone === 'hivis' ? 'bg-hivis text-ink' : b.tone === 'signal' ? 'bg-signal text-ink' : 'bg-ink text-paper'}`}
                    >
                      {b.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* footer: QR + id */}
            <footer className="flex items-center gap-4 border-t-2 border-dashed border-ink p-5 sm:p-7">
              <div className="size-[92px] shrink-0 bg-[#FBF8F1] p-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code linking to this profile" />
              <div className="min-w-0 flex-1">
                <p className="label text-concrete">Scan to verify</p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tight">{idNumber(w.id)}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-concrete-dark">{url.replace(/^https?:\/\//, '')}</p>
                <p className="label mt-2 text-[10px] text-concrete">Member since {monthYear(w.createdAt)}</p>
              </div>
            </footer>
            <div className="hazard h-2 border-t-2 border-ink" aria-hidden />
          </article>
        </div>

        {/* ── side ── */}
        <div className="space-y-10 lg:pt-12">
          {w.introTranscript && (
            <figure>
              <figcaption className="label flex items-center gap-2 text-concrete">
                <span className="inline-block size-1.5 bg-hivis" aria-hidden /> In {first}&rsquo;s own words · {lang.name}
              </figcaption>
              <blockquote className={`mt-4 text-[26px] leading-[1.25] sm:text-[32px] ${isDeva(w.introTranscript) ? 'deva font-medium tracking-tight' : 'serif-i'}`} lang={w.language}>
                &ldquo;{w.introTranscript}&rdquo;
              </blockquote>
              {w.introAudioUrl && (
                <div className="mt-5">
                  <IntroPlayer src={w.introAudioUrl} name={first ?? w.name} />
                </div>
              )}
            </figure>
          )}

          <div className="space-y-2">
            <Link
              href="/hire"
              className="no-print group flex h-16 items-center justify-between bg-hivis px-5 text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              <span className="font-display text-xl font-bold tracking-tight">Hire {first}</span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="label no-print flex h-11 items-center justify-center gap-2 bg-ink text-paper hover:bg-ink-2"
            >
              Share on WhatsApp
            </a>
            <UtilityActions url={url} />
            <p className="pt-1 text-xs leading-relaxed text-concrete-dark">
              Phone numbers and exact addresses stay private. Contact is shared only after {first} accepts a job.
            </p>
          </div>

          <section aria-labelledby="reviews-h">
            <h2 id="reviews-h" className="label flex items-center justify-between border-b border-ink pb-2">
              Recent reviews <span className="text-concrete">{w.stats.ratingCount}</span>
            </h2>
            {ratings.length === 0 ? (
              <p className="py-4 text-sm text-concrete-dark">No reviews yet. {first} is new on KaamSetu.</p>
            ) : (
              <ul className="divide-y divide-line">
                {ratings.map((r) => (
                  <li key={r.id} className="flex gap-4 py-3.5">
                    <span className="flex shrink-0 gap-0.5 pt-1" aria-label={`${r.stars} of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`size-3 ${n <= r.stars ? 'fill-ink text-ink' : 'text-line'}`} aria-hidden />
                      ))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[15px] leading-snug ${r.comment ? '' : 'text-concrete'}`} lang={r.comment && isDeva(r.comment) ? 'hi' : undefined}>
                        {r.comment ?? 'Rated without a comment'}
                      </p>
                      <p className="label mt-1 text-[10px] text-concrete">{monthYear(r.createdAt)} · verified job</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
