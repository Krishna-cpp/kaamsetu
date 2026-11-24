import { haversineKm } from './geo';
import type { Job, PublicWorker, ScoreBreakdown, Worker, WorkerStats } from './schemas';
import { SKILLS, skillAffinity, skillLabel } from './skills';

export const WEIGHTS = {
  skill: 0.35,
  proximity: 0.25,
  wage: 0.15,
  trust: 0.15,
  availability: 0.1,
} as const satisfies Record<keyof ScoreBreakdown, number>;

export const DEFAULT_RADIUS_KM = 8;
/** A wage ask this far (fraction) above the offer scores 0 on wageFit. */
export const WAGE_TOLERANCE = 0.4;

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.min(1, Math.max(0, x)) : 0);
const round = (x: number, dp = 3) => Math.round(x * 10 ** dp) / 10 ** dp;

/** 1 at 0 km, linear decay to 0 at radius. */
export function proximityScore(distanceKm: number, radiusKm: number = DEFAULT_RADIUS_KM): number {
  if (radiusKm <= 0) return 0;
  return clamp01(1 - distanceKm / radiusKm);
}

/** 1 if the worker asks ≤ the offer, decaying linearly to 0 at WAGE_TOLERANCE above it. */
export function wageFitScore(expected: number, offered: number): number {
  if (offered <= 0) return expected <= 0 ? 1 : 0;
  if (expected <= offered) return 1;
  const gap = (expected - offered) / offered;
  return clamp01(1 - gap / WAGE_TOLERANCE);
}

/**
 * Trust (0..1) — the basis of KaamScore.
 * Bayesian-smoothed rating (prior 3.5★ weighted like 3 ratings) so a single 5★ doesn't beat 40 jobs at 4.8★,
 * plus completion rate, experience on platform, and a verification bonus.
 */
export function trustScore(stats: WorkerStats, verified: boolean): number {
  const PRIOR = 3.5;
  const PRIOR_N = 3;
  const smoothed = (stats.ratingAvg * stats.ratingCount + PRIOR * PRIOR_N) / (stats.ratingCount + PRIOR_N);
  const ratingPart = clamp01((smoothed - 1) / 4);
  const completion = stats.jobsCompleted === 0 ? 0.5 : stats.completionRate;
  const volume = clamp01(stats.jobsCompleted / 25);
  return clamp01(0.55 * ratingPart + 0.2 * completion + 0.15 * volume + (verified ? 0.1 : 0));
}

/** KaamScore shown to users: 0–100 integer. */
export function kaamScore(stats: WorkerStats, verified: boolean): number {
  return Math.round(trustScore(stats, verified) * 100);
}

export function availabilityScore(
  worker: Pick<Worker, 'availability' | 'availableFrom'>,
  jobStartDate: string,
): number {
  if (worker.availability === 'busy' && !worker.availableFrom) return 0;
  if (!worker.availableFrom) return 1;
  if (worker.availableFrom <= jobStartDate) return 1;
  // available within 2 days of the start date: partial credit
  const days = (Date.parse(worker.availableFrom) - Date.parse(jobStartDate)) / 86_400_000;
  return days <= 2 ? 0.4 : 0;
}

export interface ScoredWorker {
  worker: Worker;
  score: number; // 0..100
  breakdown: ScoreBreakdown;
  distanceKm: number;
  relatedVia: string | null;
  why: string;
}

export function scoreWorker(worker: Worker, job: Pick<Job, 'skill' | 'location' | 'radiusKm' | 'wagePerDay' | 'startDate'>): ScoredWorker {
  const distanceKm = haversineKm(worker.location, job.location);
  const aff = skillAffinity(worker.skills, job.skill);
  const breakdown: ScoreBreakdown = {
    skill: round(aff.score),
    proximity: round(proximityScore(distanceKm, job.radiusKm)),
    wage: round(wageFitScore(worker.expectedWage, job.wagePerDay)),
    trust: round(trustScore(worker.stats, worker.verified)),
    availability: round(availabilityScore(worker, job.startDate)),
  };
  const total =
    WEIGHTS.skill * breakdown.skill +
    WEIGHTS.proximity * breakdown.proximity +
    WEIGHTS.wage * breakdown.wage +
    WEIGHTS.trust * breakdown.trust +
    WEIGHTS.availability * breakdown.availability;
  const relatedVia = aff.score < 1 && aff.via ? aff.via : null;
  const scored: ScoredWorker = {
    worker,
    score: Math.round(total * 1000) / 10,
    breakdown,
    distanceKm: round(distanceKm, 2),
    relatedVia,
    why: '',
  };
  scored.why = explainMatch(scored, job);
  return scored;
}

const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

/** Deterministic, human-readable explanation built from the score components. */
export function explainMatch(s: Omit<ScoredWorker, 'why'>, job: Pick<Job, 'skill' | 'wagePerDay'>): string {
  const w = s.worker;
  const parts: string[] = [];
  parts.push(
    s.relatedVia
      ? `${skillLabel(s.relatedVia as keyof typeof SKILLS)} (related to ${skillLabel(job.skill).toLowerCase()})`
      : skillLabel(job.skill),
  );
  parts.push(s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m away` : `${s.distanceKm.toFixed(1)} km away`);
  if (w.expectedWage <= job.wagePerDay) parts.push(`asks ${inr(w.expectedWage)} (you offer ${inr(job.wagePerDay)})`);
  else parts.push(`asks ${inr(w.expectedWage)}, ${inr(w.expectedWage - job.wagePerDay)} above your offer`);
  if (w.stats.ratingCount > 0) parts.push(`${w.stats.ratingAvg.toFixed(1)}★ from ${w.stats.jobsCompleted} jobs`);
  else parts.push('new on KaamSetu');
  if (s.breakdown.availability < 1) parts.push(s.breakdown.availability > 0 ? 'free soon after start' : 'currently busy');
  return parts.join(' · ');
}

export interface RankOptions {
  limit?: number;
  /** Drop workers beyond radius × this factor (proximity is already 0 at radius). */
  maxDistanceFactor?: number;
  minScore?: number;
}

/** Rank candidate workers for a job. Workers without any relevant skill are excluded. */
export function rankWorkers(
  workers: readonly Worker[],
  job: Pick<Job, 'skill' | 'location' | 'radiusKm' | 'wagePerDay' | 'startDate'>,
  opts: RankOptions = {},
): ScoredWorker[] {
  const { limit = 10, maxDistanceFactor = 1.5, minScore = 0 } = opts;
  return workers
    .filter((w) => w.status === 'active')
    .map((w) => scoreWorker(w, job))
    .filter((s) => s.breakdown.skill > 0 && s.distanceKm <= job.radiusKm * maxDistanceFactor && s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a.worker.id.localeCompare(b.worker.id))
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* Badges + public projection                                          */
/* ------------------------------------------------------------------ */

export function badgesFor(w: Worker): PublicWorker['badges'] {
  const out: PublicWorker['badges'] = [];
  const primary = w.skills[0];
  if (w.verified && primary) {
    out.push({
      id: `verified-${primary}`,
      label: `Verified ${skillLabel(primary)} · ${w.stats.jobsCompleted} jobs${w.stats.ratingCount ? `, ${w.stats.ratingAvg.toFixed(1)}★` : ''}`,
      tone: 'hivis',
    });
  }
  if (w.stats.ratingCount >= 5 && w.stats.ratingAvg >= 4.7) out.push({ id: 'top-rated', label: 'Top rated', tone: 'signal' });
  if (w.stats.jobsCompleted >= 25) out.push({ id: 'veteran', label: '25+ jobs', tone: 'ink' });
  if (w.stats.jobsCompleted >= 5 && w.stats.completionRate >= 0.95) out.push({ id: 'reliable', label: 'Always shows up', tone: 'signal' });
  if (w.stats.jobsCompleted === 0) out.push({ id: 'new', label: 'New on KaamSetu', tone: 'ink' });
  return out;
}

export function toPublicWorker(w: Worker): PublicWorker {
  return {
    id: w.id,
    name: w.name,
    language: w.language,
    skills: w.skills,
    experienceYears: w.experienceYears,
    locality: w.locality,
    expectedWage: w.expectedWage,
    availability: w.availability,
    stats: w.stats,
    verified: w.verified,
    introTranscript: w.introTranscript,
    introAudioUrl: w.introAudioUrl,
    createdAt: w.createdAt,
    kaamScore: kaamScore(w.stats, w.verified),
    badges: badgesFor(w),
  };
}

/** Maharashtra unskilled daily minimum (approx., for the gentle below-min-wage warning). */
export const MIN_DAILY_WAGE_INR = 500;
