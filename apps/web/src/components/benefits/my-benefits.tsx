/**
 * Owner-only "My benefits" block for /w/[id]. SERVER ONLY: the answers behind it imply age and income,
 * so this never renders on the public view (the page checks the private-link token first).
 */
import {
  benefitsOf,
  evaluateAll,
  eligibilityProfile,
  nearestHelpCentre,
  SCHEME_BY_ID,
  sortResults,
  type Scheme,
  type SchemeId,
  type Worker,
} from '@kaamsetu/core/server';
import clsx from 'clsx';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { mapsHref, MiniMap } from './mini-map';

const DAY = 86_400_000;

type Tag = 'likely' | 'maybe' | 'applied' | 'renew';
interface Chip {
  scheme: Scheme;
  tag: Tag;
  /** YYYY-MM-DD */
  renewsOn: string | null;
}

const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);
const nice = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Next renewal date for an applied scheme, or null when it does not renew. */
export function renewalDate(s: Scheme, appliedOn: string, now = Date.now()): string | null {
  if (s.renewalKind === 'yearly_june') {
    const y = new Date(now).getUTCFullYear();
    const june = Date.UTC(y, 5, 1);
    return ymd(now > june + DAY - 1 ? Date.UTC(y + 1, 5, 1) : june);
  }
  if (s.renewalKind === 'yearly_from_registration') {
    const d = new Date(appliedOn + 'T00:00:00Z');
    if (Number.isNaN(d.getTime())) return null;
    let due = Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate());
    // registered more than a year ago: the next anniversary
    while (due < now - 30 * DAY) due = Date.UTC(new Date(due).getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate());
    return ymd(due);
  }
  return null;
}

export function benefitChips(w: Worker, days: number, now = Date.now()): Chip[] {
  const b = benefitsOf(w);
  const results = sortResults(evaluateAll(eligibilityProfile(w, days), 'en'));
  const out: Chip[] = [];
  const seen = new Set<string>();
  // applied first (the worker already acted on them), renewals at the very top
  for (const [id, on] of Object.entries(b.applied)) {
    const s = SCHEME_BY_ID[id as SchemeId];
    if (!s) continue;
    const renewsOn = renewalDate(s, on, now);
    const soon = !!renewsOn && Date.parse(renewsOn) - now <= 30 * DAY;
    out.push({ scheme: s, tag: soon ? 'renew' : 'applied', renewsOn });
    seen.add(id);
  }
  out.sort((a, c) => (a.tag === 'renew' ? -1 : 0) - (c.tag === 'renew' ? -1 : 0));
  for (const r of results) {
    if (seen.has(r.scheme.id) || (r.status !== 'likely' && r.status !== 'maybe')) continue;
    out.push({ scheme: r.scheme, tag: r.status, renewsOn: null });
  }
  return out;
}

const TAG: Record<Tag, { text: string; cls: string }> = {
  renew: { text: 'Renew soon', cls: 'bg-hivis text-ink' },
  applied: { text: 'Applied', cls: 'bg-ink text-paper' },
  likely: { text: 'Likely', cls: 'bg-signal text-ink' },
  maybe: { text: 'Worth checking', cls: 'border border-ink text-ink' },
};

export function MyBenefits({ worker, days }: { worker: Worker; days: number }) {
  const chips = benefitChips(worker, days);
  const near = nearestHelpCentre(worker.location);
  const shown = chips.map((c) => c.scheme);
  const verified = shown
    .filter((s) => s.verification === 'verified' && s.lastVerified)
    .map((s) => s.lastVerified!)
    .sort();
  const unverified = shown.filter((s) => s.verification !== 'verified' || !s.lastVerified).length;
  const checked = verified.length ? nice(verified[0]!.slice(0, 10)) : 'unverified';

  return (
    <section aria-labelledby="benefits-h">
      <h2 id="benefits-h" className="label flex items-center justify-between border-b border-ink pb-2">
        My benefits <span className="text-concrete">Private · only you see this</span>
      </h2>
      <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-ink/80">
        From your answers to the bot. These are schemes you <span className="serif-i text-[17px]">may be eligible</span> for. The official
        site decides.
      </p>

      {chips.length === 0 ? (
        <p className="mt-4 border border-dashed border-concrete p-4 text-sm text-concrete-dark">
          No matches yet. Ask the bot &ldquo;benefits&rdquo; to answer a few more questions.
        </p>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {chips.map((c) => (
            <li key={c.scheme.id}>
              <a
                href={c.scheme.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col border border-line bg-[#FBF8F1] p-3 transition-colors hover:border-ink"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className={clsx('label px-1.5 py-0.5 text-[10px]', TAG[c.tag].cls)}>{TAG[c.tag].text}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-concrete transition-colors group-hover:text-ink" aria-hidden />
                </span>
                <span className="mt-2 font-display text-[17px] font-semibold leading-tight tracking-tight">{c.scheme.name.en}</span>
                <span className="mt-1 text-[13px] leading-snug text-concrete-dark">{c.scheme.oneLineBenefit.en}</span>
                <span className="label mt-auto pt-2.5 text-[10px] text-concrete">
                  {c.tag === 'applied' || c.tag === 'renew'
                    ? c.renewsOn
                      ? `Renews ${nice(c.renewsOn)}`
                      : 'Applied'
                    : 'May be eligible · official site'}
                  <span className="sr-only"> (opens the official site)</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {near && (
        <div className="mt-4 grid grid-cols-[112px_minmax(0,1fr)] border border-line sm:grid-cols-[148px_minmax(0,1fr)]">
          <MiniMap
            lat={near.centre.location.lat}
            lng={near.centre.location.lng}
            label={`${near.centre.name} in ${near.centre.area}`}
            caption={near.centre.area}
            className="h-full min-h-[112px] border-0 border-r border-r-line"
          />
          <div className="min-w-0 p-3">
            <p className="label text-[10px] text-concrete">Nearest help centre · sample</p>
            <p className="mt-1 font-display text-[16px] font-semibold leading-tight tracking-tight">{near.centre.name}</p>
            <p className="mt-1 flex items-center gap-1 text-[13px] text-concrete-dark">
              <MapPin className="size-3.5 shrink-0 text-hivis-deep" aria-hidden />
              {near.centre.area}, {near.centre.city} · <span className="font-mono">{near.distanceKm.toFixed(1)} km</span>
            </p>
            <a
              href={mapsHref(near.centre.location.lat, near.centre.location.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="label mt-2.5 inline-flex h-9 items-center gap-1.5 bg-ink px-3 text-paper hover:bg-hivis hover:text-ink"
            >
              Open in Maps <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      )}

      <p className="label mt-3 text-[10px] text-concrete">
        Scheme info checked: {checked}
        {verified.length > 0 && unverified > 0 ? ` · ${unverified} unverified` : ''} · confirm timings before you visit
      </p>
    </section>
  );
}
