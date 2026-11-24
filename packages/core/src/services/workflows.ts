import type { ButtonGrid } from '../adapters/channel';
import type { Ctx } from '../context';
import { todayIST } from '../extract-rules';
import { geohashEncode, haversineKm, jitter, type LatLng } from '../geo';
import { jobAlertText, t } from '../i18n';
import { jobCode, matchId, newId, nowIso } from '../ids';
import type { Language } from '../languages';
import { MIN_DAILY_WAGE_INR, rankWorkers, scoreWorker, toPublicWorker } from '../matching';
import {
  JobDraftSchema,
  RatingInputSchema,
  type ExtractedJob,
  type ExtractedProfile,
  type FeedEvent,
  type Job,
  type JobDraftInput,
  type Match,
  type PublicWorker,
  type Worker,
} from '../schemas';
import { skillLabel } from '../skills';

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

export async function emit(ctx: Ctx, e: Omit<FeedEvent, 'id' | 'at'> & { at?: string }) {
  const ev: FeedEvent = { id: newId('ev', 8), at: e.at ?? nowIso(), ...e };
  await ctx.repo.addEvent(ev).catch((err: unknown) => console.warn('[events] failed', err));
  return ev;
}

/* ------------------------------------------------------------------ */
/* workers                                                             */
/* ------------------------------------------------------------------ */

export type ProfileField = 'name' | 'skill' | 'locality' | 'wage';

export function missingProfileFields(p: ExtractedProfile): ProfileField[] {
  const out: ProfileField[] = [];
  if (!p.name) out.push('name');
  if (!p.skills.length) out.push('skill');
  if (!p.locality) out.push('locality');
  if (!p.expectedWage) out.push('wage');
  return out;
}

export function missingFieldsText(fields: ProfileField[], lang: Language): string {
  const names = fields.map((f) => t(f === 'name' ? 'fieldName' : f === 'skill' ? 'fieldSkill' : f === 'locality' ? 'fieldLocality' : 'fieldWage', lang));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} ${t('and', lang)} ${names[names.length - 1]}`;
}

export interface RegisterInput {
  transcript: string;
  languageHint?: Language | null;
  channel: Worker['channel'];
  chatId?: string | null;
  phone?: string | null;
  /** 'pending' waits for the worker to confirm (Telegram ✅). */
  status: 'pending' | 'active';
  introAudioUrl?: string | null;
  /** Structured values that override extraction (e.g. voice-agent tool args). */
  overrides?: Partial<ExtractedProfile>;
}

export interface RegisterResult {
  worker: Worker | null;
  extracted: ExtractedProfile;
  missing: ProfileField[];
}

export async function registerWorker(ctx: Ctx, input: RegisterInput): Promise<RegisterResult> {
  const fromText = input.transcript.trim() ? await ctx.llm.extractProfile(input.transcript, input.languageHint) : null;
  const extracted: ExtractedProfile = {
    name: null,
    skills: [],
    experienceYears: null,
    locality: null,
    expectedWage: null,
    availability: 'available',
    availableFrom: null,
    language: input.languageHint ?? 'hi',
    ...(fromText ?? {}),
    ...Object.fromEntries(Object.entries(input.overrides ?? {}).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length))),
  };
  // A chosen language (bot menu) beats detection for replies
  if (input.languageHint) extracted.language = input.languageHint;

  const missing = missingProfileFields(extracted);
  if (missing.length) return { worker: null, extracted, missing };

  const geo = await ctx.geo.geocode(extracted.locality!);
  const existing =
    (input.chatId ? await ctx.repo.getWorkerByChat(input.chatId) : null) ??
    (input.phone ? await ctx.repo.getWorkerByPhone(input.phone) : null);
  const now = nowIso();
  const location = existing?.location && existing.locality === geo.locality ? existing.location : jitter(geo.location, Date.now() % 997, 600);

  const worker: Worker = {
    id: existing?.id ?? newId('w'),
    name: extracted.name!,
    phone: input.phone ?? existing?.phone ?? null,
    channel: input.channel,
    chatId: input.chatId ?? existing?.chatId ?? null,
    language: extracted.language,
    skills: extracted.skills,
    experienceYears: extracted.experienceYears,
    locality: geo.locality,
    location,
    geohash: geohashEncode(location.lat, location.lng, 6),
    expectedWage: extracted.expectedWage!,
    availability: extracted.availability ?? 'available',
    availableFrom: extracted.availableFrom,
    stats: existing?.stats ?? { jobsCompleted: 0, ratingAvg: 0, ratingCount: 0, completionRate: 0 },
    verified: existing?.verified ?? false,
    status: input.status === 'active' ? 'active' : existing?.status === 'active' ? 'active' : 'pending',
    introTranscript: input.transcript.trim() ? input.transcript.trim().slice(0, 1000) : (existing?.introTranscript ?? null),
    introAudioUrl: input.introAudioUrl ?? existing?.introAudioUrl ?? null,
    consentAt: existing?.consentAt ?? (input.status === 'active' ? now : null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await ctx.repo.putWorker(worker);
  if (worker.status === 'active' && existing?.status !== 'active') await announceWorker(ctx, worker);
  return { worker, extracted, missing };
}

async function announceWorker(ctx: Ctx, w: Worker) {
  await emit(ctx, {
    type: 'worker_registered',
    title: `${w.name.split(' ')[0]} joined as ${skillLabel(w.skills[0]!)}`,
    subtitle: `${w.locality} · ₹${w.expectedWage}/day · via ${w.channel === 'voice_agent' ? 'phone agent' : w.channel}`,
    location: w.location,
    refId: w.id,
    jobId: null,
  });
}

export async function activateWorker(ctx: Ctx, id: string): Promise<Worker | null> {
  const w = await ctx.repo.getWorker(id);
  if (!w) return null;
  if (w.status === 'active') return w;
  const next: Worker = { ...w, status: 'active', consentAt: w.consentAt ?? nowIso(), updatedAt: nowIso() };
  await ctx.repo.putWorker(next);
  await announceWorker(ctx, next);
  return next;
}

export async function deleteWorkerData(ctx: Ctx, id: string) {
  await ctx.repo.deleteWorker(id);
}

/* ------------------------------------------------------------------ */
/* jobs                                                                */
/* ------------------------------------------------------------------ */

export interface ParsedJob {
  extracted: ExtractedJob;
  /** Draft with sensible defaults filled in, ready for the editable card. */
  draft: {
    skill: ExtractedJob['skill'];
    workersNeeded: number;
    durationDays: number;
    wagePerDay: number | null;
    startDate: string;
    locality: string | null;
    location: LatLng | null;
    description: string | null;
    language: Language;
  };
  warnings: string[];
}

export async function parseJob(ctx: Ctx, transcript: string, hint?: Language | null): Promise<ParsedJob> {
  const today = todayIST();
  const extracted = await ctx.llm.extractJob(transcript, hint, today);
  const geo = extracted.locality ? await ctx.geo.geocode(extracted.locality) : null;
  const warnings: string[] = [];
  if (extracted.wagePerDay !== null && extracted.wagePerDay < MIN_DAILY_WAGE_INR) {
    warnings.push(`₹${extracted.wagePerDay}/day is below the local minimum wage (≈₹${MIN_DAILY_WAGE_INR}). Fair offers get accepted faster.`);
  }
  return {
    extracted,
    draft: {
      skill: extracted.skill,
      workersNeeded: extracted.workersNeeded ?? 1,
      durationDays: extracted.durationDays ?? 1,
      wagePerDay: extracted.wagePerDay,
      startDate: extracted.startDate ?? today,
      locality: geo?.locality ?? extracted.locality,
      location: geo?.location ?? null,
      description: extracted.description,
      language: extracted.language,
    },
    warnings,
  };
}

export interface CreateJobOptions {
  /** How many top matches receive an alert */
  alertTop?: number;
  /** Simulate seed-worker responses (demo). Default true. */
  simulate?: boolean;
}

export async function createJob(ctx: Ctx, input: JobDraftInput, opts: CreateJobOptions = {}) {
  const draft = JobDraftSchema.parse(input);
  const location = draft.location ?? (await ctx.geo.geocode(draft.locality)).location;
  const flags: Job['flags'] = [];
  if (draft.wagePerDay < MIN_DAILY_WAGE_INR) flags.push('below_min_wage');

  const job: Job = {
    id: newId('j'),
    code: jobCode(),
    skill: draft.skill,
    workersNeeded: draft.workersNeeded,
    durationDays: draft.durationDays,
    wagePerDay: draft.wagePerDay,
    startDate: draft.startDate,
    locality: draft.locality,
    location,
    geohash: geohashEncode(location.lat, location.lng, 6),
    radiusKm: draft.radiusKm,
    description: draft.description,
    employer: draft.employer,
    language: draft.language,
    source: draft.source,
    transcript: draft.transcript,
    status: 'open',
    flags,
    createdAt: nowIso(),
  };
  await ctx.repo.putJob(job);
  await emit(ctx, {
    type: 'job_posted',
    title: `${job.workersNeeded} × ${skillLabel(job.skill)} needed in ${job.locality}`,
    subtitle: `JOB #${job.code} · ₹${job.wagePerDay}/day · ${job.durationDays} day${job.durationDays > 1 ? 's' : ''}`,
    location: job.location,
    refId: job.id,
    jobId: job.id,
  });
  const matches = await matchAndAlert(ctx, job, opts);
  return { job, matches };
}

/** Deterministic pseudo-random in [0,1) from a string. */
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export async function matchAndAlert(ctx: Ctx, job: Job, opts: CreateJobOptions = {}): Promise<Match[]> {
  const alertTop = opts.alertTop ?? Math.max(5, job.workersNeeded * 3);
  const simulate = opts.simulate ?? true;
  const candidates = await ctx.repo.listWorkers({ lat: job.location.lat, lng: job.location.lng, radiusKm: job.radiusKm });
  const ranked = rankWorkers(candidates, job, { limit: 12 });
  const now = Date.now();
  const speed = Math.max(0.1, ctx.env.SIM_SPEED);
  let simAccepts = 0;

  const matches: Match[] = ranked.map((s, i) => {
    const alerted = i < alertTop;
    const isSeed = !s.worker.chatId;
    let sim: Match['sim'] = null;
    if (alerted && isSeed && simulate) {
      const r = hash01(job.id + s.worker.id);
      const viewAt = now + ((2.5 + i * 1.6 + r * 3) * 1000) / speed;
      // Higher-ranked, well-paid matches are more likely to accept. Rank #1 always does (keeps the demo alive).
      const pAccept = i === 0 ? 1 : Math.min(0.9, s.score / 100 - 0.05 + s.breakdown.wage * 0.15);
      const accepts = simAccepts < job.workersNeeded && r < pAccept;
      if (accepts) simAccepts++;
      const responds = accepts || r > 0.55;
      sim = {
        viewAt: new Date(viewAt).toISOString(),
        respondAt: responds ? new Date(viewAt + ((3 + r * 7) * 1000) / speed).toISOString() : null,
        outcome: responds ? (accepts ? 'accepted' : 'declined') : null,
      };
    }
    return {
      id: matchId(job.id, s.worker.id),
      jobId: job.id,
      workerId: s.worker.id,
      rank: i + 1,
      score: s.score,
      breakdown: s.breakdown,
      distanceKm: s.distanceKm,
      why: s.why,
      status: alerted ? 'alerted' : 'suggested',
      alertedAt: alerted ? new Date(now).toISOString() : null,
      viewedAt: null,
      respondedAt: null,
      sim,
      createdAt: new Date(now).toISOString(),
    };
  });
  await ctx.repo.putMatches(matches);

  const alerted = matches.filter((m) => m.status === 'alerted');
  if (alerted.length) {
    await emit(ctx, {
      type: 'match_alerted',
      title: `Voice alerts sent to ${alerted.length} workers`,
      subtitle: `JOB #${job.code} · best match ${ranked[0]?.worker.name ?? ''} (${ranked[0]?.score.toFixed(0) ?? 0}/100)`,
      location: job.location,
      refId: job.id,
      jobId: job.id,
    });
  }

  // Real voice alerts for workers who are actually on Telegram
  const real = ranked.filter((s, i) => i < alertTop && s.worker.chatId);
  await Promise.allSettled(real.map((s) => sendJobAlert(ctx, s.worker, job, matches.find((m) => m.workerId === s.worker.id)!)));
  return matches;
}

export function alertButtons(lang: Language, mId: string): ButtonGrid {
  return [
    [
      { text: t('btnAccept', lang), data: `acc|${mId}` },
      { text: t('btnDecline', lang), data: `dec|${mId}` },
    ],
    [{ text: t('btnCall', lang), data: `call|${mId}` }],
  ];
}

export async function sendJobAlert(ctx: Ctx, worker: Worker, job: Job, match: Match) {
  if (!worker.chatId) return;
  const lang = worker.language;
  const spoken = jobAlertText(lang, {
    workerName: worker.name,
    skill: job.skill,
    locality: job.locality,
    distanceKm: match.distanceKm,
    wage: job.wagePerDay,
    days: job.durationDays,
    startDate: job.startDate,
    today: todayIST(),
  });
  const card =
    `<b>JOB #${job.code}</b> · ${skillLabel(job.skill, lang)}\n` +
    `📍 ${job.locality} · ${match.distanceKm.toFixed(1)} km\n` +
    `₹${job.wagePerDay}/day × ${job.durationDays} · ${job.workersNeeded} needed\n` +
    `<i>${match.why}</i>`;
  const buttons = alertButtons(lang, match.id);
  try {
    const speech = await ctx.tts.speak(spoken, lang, { fast: true });
    if (speech) await ctx.channel.sendVoice(worker.chatId, speech.audio, { caption: card, buttons });
    else await ctx.channel.sendText(worker.chatId, `${spoken}\n\n${card}`, buttons);
  } catch (e) {
    console.warn('[alert] voice alert failed, sending text', e);
    await ctx.channel.sendText(worker.chatId, `${spoken}\n\n${card}`, buttons).catch(() => undefined);
  }
}

/* ------------------------------------------------------------------ */
/* match lifecycle                                                     */
/* ------------------------------------------------------------------ */

/** Advance simulated seed-worker responses whose time has come. Idempotent. */
export async function advanceSimulations(ctx: Ctx, job: Job, matches: Match[]): Promise<Match[]> {
  const now = nowIso();
  const out: Match[] = [];
  for (const m of matches) {
    let cur = m;
    if (m.sim) {
      const patch: Partial<Match> = {};
      if (m.status === 'alerted' && m.sim.viewAt <= now) {
        patch.status = 'viewed';
        patch.viewedAt = m.sim.viewAt;
      }
      const viewedNow = (patch.status ?? m.status) === 'viewed';
      if (viewedNow && m.sim.respondAt && m.sim.outcome && m.sim.respondAt <= now) {
        patch.status = m.sim.outcome;
        patch.respondedAt = m.sim.respondAt;
      }
      if (patch.status) {
        cur = (await ctx.repo.updateMatch(m.id, patch)) ?? { ...m, ...patch };
        const w = await ctx.repo.getWorker(m.workerId);
        const first = w?.name.split(' ')[0] ?? 'Worker';
        if (patch.status === 'accepted' || patch.status === 'declined') {
          await emit(ctx, {
            type: patch.status === 'accepted' ? 'match_accepted' : 'match_declined',
            at: patch.respondedAt ?? now,
            title: patch.status === 'accepted' ? `${first} accepted JOB #${job.code}` : `${first} passed on JOB #${job.code}`,
            subtitle: `${skillLabel(job.skill)} · ${job.locality} · ${m.distanceKm.toFixed(1)} km`,
            location: w?.location ?? null,
            refId: m.id,
            jobId: job.id,
          });
        } else {
          await emit(ctx, {
            type: 'match_viewed',
            at: patch.viewedAt ?? now,
            title: `${first} listened to the alert`,
            subtitle: `JOB #${job.code}`,
            location: w?.location ?? null,
            refId: m.id,
            jobId: job.id,
          });
        }
      }
    }
    out.push(cur);
  }
  await maybeFill(ctx, job, out);
  return out;
}

async function maybeFill(ctx: Ctx, job: Job, matches: Match[]) {
  const accepted = matches.filter((m) => m.status === 'accepted').length;
  if (job.status === 'open' && accepted >= job.workersNeeded) {
    await ctx.repo.putJob({ ...job, status: 'filled' });
    job.status = 'filled';
  }
}

export class MatchError extends Error {
  constructor(
    public code: 'not_found' | 'filled' | 'already_responded',
    message: string,
  ) {
    super(message);
  }
}

export async function respondToMatch(ctx: Ctx, id: string, outcome: 'accepted' | 'declined' | 'viewed') {
  const m = await ctx.repo.getMatch(id);
  if (!m) throw new MatchError('not_found', 'Match not found');
  const job = await ctx.repo.getJob(m.jobId);
  const worker = await ctx.repo.getWorker(m.workerId);
  if (!job || !worker) throw new MatchError('not_found', 'Job or worker missing');
  if (outcome === 'viewed') {
    if (m.status === 'alerted') {
      const upd = await ctx.repo.updateMatch(id, { status: 'viewed', viewedAt: nowIso() });
      return { match: upd ?? m, job, worker };
    }
    return { match: m, job, worker };
  }
  if (m.status === 'accepted' || m.status === 'declined') {
    if (m.status === outcome) return { match: m, job, worker };
    throw new MatchError('already_responded', 'Already responded');
  }
  if (outcome === 'accepted' && job.status !== 'open') throw new MatchError('filled', 'Job already filled');
  const now = nowIso();
  const match = (await ctx.repo.updateMatch(id, { status: outcome, respondedAt: now, viewedAt: m.viewedAt ?? now, sim: null }))!;
  await emit(ctx, {
    type: outcome === 'accepted' ? 'match_accepted' : 'match_declined',
    title: `${worker.name.split(' ')[0]} ${outcome === 'accepted' ? 'accepted' : 'passed on'} JOB #${job.code}`,
    subtitle: `${skillLabel(job.skill)} · ${job.locality} · ${m.distanceKm.toFixed(1)} km`,
    location: worker.location,
    refId: id,
    jobId: job.id,
  });
  const all = await ctx.repo.listMatchesForJob(job.id);
  await maybeFill(ctx, job, all);
  return { match, job, worker };
}

/* ------------------------------------------------------------------ */
/* views                                                               */
/* ------------------------------------------------------------------ */

export interface MatchView extends Match {
  worker: PublicWorker;
  /** approximate pin (≈300 m jitter) — exact coordinates stay private */
  approxLocation: LatLng;
  /** revealed only after the worker accepted */
  contactPhone: string | null;
}

export interface JobView {
  job: Job;
  matches: MatchView[];
  counts: Record<Match['status'], number>;
}

export async function getJobView(ctx: Ctx, jobId: string): Promise<JobView | null> {
  const job = await ctx.repo.getJob(jobId);
  if (!job) return null;
  const matches = await advanceSimulations(ctx, job, await ctx.repo.listMatchesForJob(jobId));
  const views: MatchView[] = [];
  for (const m of matches) {
    const w = await ctx.repo.getWorker(m.workerId);
    if (!w) continue;
    views.push({
      ...m,
      worker: toPublicWorker(w),
      approxLocation: jitter(w.location, hash01(w.id) * 1000, 300),
      contactPhone: m.status === 'accepted' ? (w.phone ?? null) : null,
    });
  }
  const counts = { suggested: 0, alerted: 0, viewed: 0, accepted: 0, declined: 0 } satisfies Record<Match['status'], number>;
  for (const m of views) counts[m.status]++;
  return { job, matches: views, counts };
}

/** Advance simulations for all recently-active jobs (used by the /live feed). */
export async function tickRecentJobs(ctx: Ctx, limit = 8) {
  const jobs = (await ctx.repo.listJobs({ limit })).filter((j) => j.status === 'open' && Date.now() - Date.parse(j.createdAt) < 30 * 60_000);
  for (const j of jobs) await advanceSimulations(ctx, j, await ctx.repo.listMatchesForJob(j.id));
}

/* ------------------------------------------------------------------ */
/* ratings + jobs for a worker                                         */
/* ------------------------------------------------------------------ */

export async function addRating(ctx: Ctx, input: unknown) {
  const r = RatingInputSchema.parse(input);
  const w = await ctx.repo.getWorker(r.workerId);
  if (!w) throw new MatchError('not_found', 'Worker not found');
  const rating = { id: newId('r'), ...r, audioUrl: null, createdAt: nowIso() };
  await ctx.repo.addRating(rating);
  const count = w.stats.ratingCount + 1;
  const avg = (w.stats.ratingAvg * w.stats.ratingCount + r.stars) / count;
  const jobs = w.stats.jobsCompleted + 1;
  const completionRate = Math.min(1, (w.stats.completionRate * w.stats.jobsCompleted + 1) / jobs);
  const updated: Worker = {
    ...w,
    stats: { jobsCompleted: jobs, ratingAvg: Math.round(avg * 100) / 100, ratingCount: count, completionRate: Math.round(completionRate * 100) / 100 },
    verified: w.verified || jobs >= 3,
    updatedAt: nowIso(),
  };
  await ctx.repo.putWorker(updated);
  await emit(ctx, {
    type: 'rating_added',
    title: `${w.name.split(' ')[0]} got ${'★'.repeat(r.stars)}`,
    subtitle: r.comment ?? `KaamScore now ${toPublicWorker(updated).kaamScore}`,
    location: w.location,
    refId: w.id,
    jobId: r.jobId,
  });
  return { rating, worker: toPublicWorker(updated) };
}

export async function jobsForWorker(ctx: Ctx, worker: Worker, limit = 3) {
  const jobs = (await ctx.repo.listJobs({ limit: 200, near: { lat: worker.location.lat, lng: worker.location.lng, radiusKm: 15 } })).filter(
    (j) => j.status === 'open',
  );
  return jobs
    .map((job) => ({ job, scored: scoreWorker(worker, { ...job, radiusKm: Math.max(job.radiusKm, 15) }) }))
    .filter((x) => x.scored.breakdown.skill > 0)
    .sort((a, b) => b.scored.score - a.scored.score)
    .slice(0, limit)
    .map(({ job, scored }) => ({ job, distanceKm: haversineKm(worker.location, job.location), score: scored.score }));
}

/** Ensure a match exists between a worker and a job (e.g. worker accepts via the phone agent without an alert). */
export async function ensureMatch(ctx: Ctx, worker: Worker, job: Job): Promise<Match> {
  const id = matchId(job.id, worker.id);
  const existing = await ctx.repo.getMatch(id);
  if (existing) return existing;
  const s = scoreWorker(worker, job);
  const m: Match = {
    id,
    jobId: job.id,
    workerId: worker.id,
    rank: 99,
    score: s.score,
    breakdown: s.breakdown,
    distanceKm: s.distanceKm,
    why: s.why,
    status: 'viewed',
    alertedAt: null,
    viewedAt: nowIso(),
    respondedAt: null,
    sim: null,
    createdAt: nowIso(),
  };
  await ctx.repo.putMatches([m]);
  return m;
}
