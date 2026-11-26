/**
 * Scheme Finder services: construction work days, the private work record, job completion (+ the opt-in
 * 90-day BOCW alert) and renewal reminders. Shared by the web app, the bot and the Lambdas.
 */
import { createHmac } from 'node:crypto';
import { speakCachedOrText, speakTo } from '../bot/speak';
import type { Ctx } from '../context';
import { nowIso } from '../ids';
import { stateOfLocality } from '../localities';
import { toPublicWorker } from '../matching';
import { BenefitsProfileSchema, type BenefitsProfile, type Job, type Match, type PublicWorker, type Worker } from '../schemas';
import { CONSTRUCTION_TRADES } from '../schemes/catalogue';
import type { EligibilityProfile } from '../schemes/engine';
import { st } from '../schemes/strings';
import { skillLabel, type Skill } from '../skills';
import { emit, MatchError } from './workflows';

const DAY = 86_400_000;

/* ------------------------------ links ------------------------------ */

/** Private-link token: only someone the bot sent the link to (the worker) can open the work record / own view. */
export function ownerToken(ctx: Ctx, workerId: string): string {
  const secret = ctx.env.WORK_RECORD_SECRET ?? ctx.env.AGENT_TOOL_SECRET ?? 'kaamsetu-dev';
  return createHmac('sha256', secret).update(`owner:${workerId}`).digest('base64url').slice(0, 22);
}
export const isOwner = (ctx: Ctx, workerId: string, token: string | null | undefined) => !!token && token === ownerToken(ctx, workerId);
export const ownProfileUrl = (ctx: Ctx, workerId: string) => `${ctx.env.PUBLIC_BASE_URL}/w/${workerId}?k=${ownerToken(ctx, workerId)}`;
export const workRecordUrl = (ctx: Ctx, workerId: string) => `${ctx.env.PUBLIC_BASE_URL}/w/${workerId}/work-record?k=${ownerToken(ctx, workerId)}`;

/* ---------------------------- answers ------------------------------ */

export function benefitsOf(w: Worker): BenefitsProfile {
  return BenefitsProfileSchema.parse(w.benefits ?? {});
}

export async function saveBenefits(ctx: Ctx, w: Worker, patch: Partial<BenefitsProfile>): Promise<Worker> {
  const fresh = (await ctx.repo.getWorker(w.id)) ?? w;
  const next: Worker = { ...fresh, benefits: { ...benefitsOf(fresh), ...patch, updatedAt: nowIso() }, updatedAt: nowIso() };
  await ctx.repo.putWorker(next);
  return next;
}

export function hasAnyAnswer(b: BenefitsProfile): boolean {
  return b.age !== null || b.ageBand !== null || b.hasBankAccount !== null || b.pfDeducted !== null || b.paysIncomeTax !== null || b.monthlyIncomeBand !== null;
}

export function eligibilityProfile(w: Worker, constructionDays12m: number): EligibilityProfile {
  const b = benefitsOf(w);
  return {
    age: b.age,
    ageBand: b.ageBand,
    trades: w.skills,
    state: stateOfLocality(w.locality),
    hasBankAccount: b.hasBankAccount,
    pfDeducted: b.pfDeducted,
    paysIncomeTax: b.paysIncomeTax,
    monthlyIncomeBand: b.monthlyIncomeBand,
    constructionDays12m,
  };
}

/* ----------------------- work days / record ------------------------ */

export interface WorkRecordRow {
  matchId: string;
  jobCode: string;
  date: string;
  days: number;
  trade: Skill;
  tradeLabel: string;
  locality: string;
  employer: string;
  confirmed: boolean;
  construction: boolean;
  completedAt: string;
}

/** Completed jobs (accepted + marked done by the employer), newest first. */
export async function workHistory(ctx: Ctx, workerId: string): Promise<WorkRecordRow[]> {
  const matches = (await ctx.repo.listMatchesForWorker(workerId)).filter((m) => m.status === 'accepted' && m.completedAt);
  const rows: WorkRecordRow[] = [];
  for (const m of matches) {
    const job = await ctx.repo.getJob(m.jobId);
    if (!job) continue;
    rows.push({
      matchId: m.id,
      jobCode: job.code,
      date: job.startDate,
      days: job.durationDays,
      trade: job.skill,
      tradeLabel: skillLabel(job.skill),
      locality: job.locality,
      employer: job.employer.business ?? job.employer.name,
      confirmed: !!m.employerConfirmed,
      construction: CONSTRUCTION_TRADES.includes(job.skill),
      completedAt: m.completedAt!,
    });
  }
  return rows.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

/** Construction days in the last 365 days (job.durationDays of completed construction jobs). */
export function countConstructionDays(rows: WorkRecordRow[], now = Date.now()): number {
  return rows.filter((r) => r.construction && now - Date.parse(r.completedAt) <= 365 * DAY).reduce((s, r) => s + r.days, 0);
}

export async function constructionDays12m(ctx: Ctx, workerId: string, now = Date.now()): Promise<number> {
  return countConstructionDays(await workHistory(ctx, workerId), now);
}

export interface WorkRecord {
  worker: PublicWorker;
  rows: WorkRecordRow[];
  constructionDays12m: number;
  generatedAt: string;
}

export async function getWorkRecord(ctx: Ctx, workerId: string): Promise<WorkRecord | null> {
  const w = await ctx.repo.getWorker(workerId);
  if (!w || w.status === 'deleted') return null;
  const rows = await workHistory(ctx, workerId);
  return { worker: toPublicWorker(w), rows, constructionDays12m: countConstructionDays(rows), generatedAt: nowIso() };
}

/* ------------------- completion + the 90-day alert ------------------ */

export interface CompletionResult {
  match: Match;
  job: Job;
  worker: Worker;
  daysBefore: number;
  daysAfter: number;
  alerted: boolean;
}

/** Employer marks an accepted job as done (and confirms the worker did it). Fires the opt-in 90-day alert. */
export async function completeMatch(ctx: Ctx, matchId: string, opts: { confirm?: boolean } = {}): Promise<CompletionResult> {
  const m = await ctx.repo.getMatch(matchId);
  if (!m) throw new MatchError('not_found', 'Match not found');
  if (m.status !== 'accepted') throw new MatchError('already_responded', 'Only accepted jobs can be marked done');
  const job = await ctx.repo.getJob(m.jobId);
  const worker = await ctx.repo.getWorker(m.workerId);
  if (!job || !worker) throw new MatchError('not_found', 'Job or worker missing');

  const daysBefore = await constructionDays12m(ctx, worker.id);
  const match = m.completedAt
    ? ((await ctx.repo.updateMatch(m.id, { employerConfirmed: opts.confirm ?? true })) ?? m)
    : ((await ctx.repo.updateMatch(m.id, { completedAt: nowIso(), employerConfirmed: opts.confirm ?? true })) ?? m);
  const daysAfter = await constructionDays12m(ctx, worker.id);

  if (!m.completedAt) {
    await emit(ctx, {
      type: 'job_completed',
      title: `${worker.name.split(' ')[0]} finished JOB #${job.code}`,
      subtitle: `${skillLabel(job.skill)} · ${job.durationDays} day${job.durationDays > 1 ? 's' : ''} · employer confirmed`,
      location: worker.location,
      refId: match.id,
      jobId: job.id,
    });
  }

  let alerted = false;
  const b = benefitsOf(worker);
  // OPT-IN ONLY: workers who never asked about benefits get no message (their profile just shows the progress bar)
  if (ctx.env.FEATURE_SCHEMES && b.optIn && daysBefore < 90 && daysAfter >= 90 && worker.chatId) {
    const scheme = stateOfLocality(worker.locality) === 'KA' ? 'bocw_ka' : 'bocw_mh';
    await speakTo(ctx, worker.chatId, worker.language, st('bocw90', worker.language), [
      [{ text: st('bChecklist', worker.language), data: `ben|checklist|${scheme}` }],
      [{ text: st('workRecord', worker.language), url: workRecordUrl(ctx, worker.id) }],
    ]);
    await saveBenefits(ctx, worker, { bocw90AlertAt: nowIso() });
    alerted = true;
  }
  return { match, job, worker, daysBefore, daysAfter, alerted };
}

/* ----------------------------- reminders ---------------------------- */

const ymd = (t: number) => new Date(t).toISOString().slice(0, 10);

/**
 * Daily job (EventBridge Scheduler → Lambda): renewal reminders for opted-in workers only.
 * PMJJBY/PMSBY renew on 1 June; BOCW one year after the worker said they registered. Sent once per cycle.
 */
export async function runBenefitReminders(ctx: Ctx, now = Date.now()): Promise<{ checked: number; sent: number }> {
  let checked = 0;
  let sent = 0;
  if (!ctx.env.FEATURE_SCHEMES) return { checked, sent };
  const year = new Date(now).getUTCFullYear();
  for (const w of await ctx.repo.listWorkers()) {
    const b = benefitsOf(w);
    if (!b.optIn || b.reminders === false || !w.chatId || w.status !== 'active') continue;
    checked++;
    const lang = w.language;

    // PMJJBY / PMSBY: cover renews 1 June → remind in the 30 days before
    const june1 = Date.UTC(now > Date.UTC(year, 5, 1) ? year + 1 : year, 5, 1);
    const enrolledInsurance = !!(b.applied.pmjjby || b.applied.pmsby);
    if (enrolledInsurance && june1 - now <= 30 * DAY && june1 - now >= 0 && b.lastReminder.pmjjby !== ymd(june1)) {
      await speakCachedOrText(ctx, w.chatId, lang, st('reminderPmjjby', lang));
      await saveBenefits(ctx, w, { lastReminder: { ...b.lastReminder, pmjjby: ymd(june1) } });
      sent++;
    }

    // BOCW: one year after the registration date the worker gave us
    for (const id of ['bocw_mh', 'bocw_ka'] as const) {
      const appliedOn = b.applied[id];
      if (!appliedOn) continue;
      const due = Date.parse(appliedOn) + 365 * DAY;
      if (due - now <= 30 * DAY && due - now >= -7 * DAY && b.lastReminder[id] !== ymd(due)) {
        const fresh = benefitsOf((await ctx.repo.getWorker(w.id)) ?? w);
        await speakCachedOrText(ctx, w.chatId, lang, st('reminderBocw', lang, { date: ymd(due) }));
        await saveBenefits(ctx, w, { lastReminder: { ...fresh.lastReminder, [id]: ymd(due) } });
        sent++;
      }
    }
  }
  return { checked, sent };
}
