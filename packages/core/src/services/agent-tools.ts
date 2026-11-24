/**
 * Server tools for the ElevenLabs Conversational AI agent "Kaam Didi".
 * The agent calls these over HTTPS (Next.js route /api/agent/[tool] or the Lambda).
 * Responses are short, speakable JSON — the agent turns them into speech.
 */
import { z } from 'zod';
import type { Ctx } from '../context';
import { getLocality } from '../localities';
import { LanguageSchema, SkillSchema } from '../schemas';
import { SKILLS, skillLabel } from '../skills';
import { ensureMatch, jobsForWorker, MatchError, registerWorker, respondToMatch } from './workflows';

const skillLoose = z
  .string()
  .transform((s) => s.toLowerCase().trim().replace(/\s+/g, '_'))
  .pipe(z.string())
  .transform((s) => {
    const direct = SkillSchema.safeParse(s);
    if (direct.success) return direct.data;
    const hit = Object.values(SKILLS).find((k) => k.keywords.some((kw) => s.includes(kw.replace(/\s+/g, '_'))));
    return hit?.code ?? null;
  });

const phone = z
  .string()
  .transform((s) => s.replace(/[^\d+]/g, ''))
  .refine((s) => s.replace(/\D/g, '').length >= 10, 'phone needs 10 digits');

export const RegisterWorkerArgs = z.object({
  name: z.string().min(1).max(80),
  skill: skillLoose,
  locality: z.string().min(2).max(80),
  expected_wage: z.coerce.number().int().min(100).max(20000),
  phone: phone.optional(),
  language: LanguageSchema.catch('hi'),
  experience_years: z.coerce.number().int().min(0).max(60).optional(),
});

export const FindJobsArgs = z.object({
  phone: phone.optional(),
  locality: z.string().min(2).max(80).optional(),
  skill: skillLoose.optional(),
});

export const AcceptJobArgs = z.object({
  job_code: z.string().regex(/\d{4}/).transform((s) => s.match(/\d{4}/)![0]),
  phone: phone,
});

export type ToolName = 'register_worker' | 'find_jobs_near_me' | 'accept_job';

export async function runAgentTool(ctx: Ctx, tool: ToolName, rawArgs: unknown): Promise<Record<string, unknown>> {
  switch (tool) {
    case 'register_worker': {
      const a = RegisterWorkerArgs.parse(rawArgs);
      if (!a.skill) return { ok: false, message: 'I could not understand the trade. Ask the worker what work they do.' };
      const res = await registerWorker(ctx, {
        transcript: '',
        languageHint: a.language,
        channel: 'voice_agent',
        phone: a.phone ?? null,
        status: 'active',
        overrides: {
          name: a.name,
          skills: [a.skill],
          locality: a.locality,
          expectedWage: a.expected_wage,
          experienceYears: a.experience_years ?? null,
          language: a.language,
          availability: 'available',
        },
      });
      if (!res.worker) return { ok: false, missing: res.missing };
      const nearby = await jobsForWorker(ctx, res.worker, 3);
      return {
        ok: true,
        worker_id: res.worker.id,
        profile_url: `${ctx.env.PUBLIC_BASE_URL}/w/${res.worker.id}`,
        summary: `${res.worker.name}, ${skillLabel(a.skill)} in ${res.worker.locality}, ₹${res.worker.expectedWage} per day`,
        jobs_nearby_now: nearby.length,
      };
    }
    case 'find_jobs_near_me': {
      const a = FindJobsArgs.parse(rawArgs);
      let worker = a.phone ? await ctx.repo.getWorkerByPhone(a.phone) : null;
      if (!worker) {
        const loc = a.locality ? getLocality(a.locality) : null;
        if (!loc || !a.skill) return { ok: false, message: 'Ask for the caller’s area and trade, or register them first.' };
        // anonymous search: synthesise a transient worker profile
        worker = {
          id: 'anon',
          name: 'Caller',
          phone: null,
          channel: 'voice_agent',
          chatId: null,
          language: 'hi',
          skills: [a.skill],
          experienceYears: null,
          locality: loc.name,
          location: { lat: loc.lat, lng: loc.lng },
          geohash: '',
          expectedWage: 0,
          availability: 'available',
          availableFrom: null,
          stats: { jobsCompleted: 0, ratingAvg: 0, ratingCount: 0, completionRate: 0 },
          verified: false,
          status: 'active',
          introTranscript: null,
          introAudioUrl: null,
          consentAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const jobs = await jobsForWorker(ctx, worker, 3);
      if (!jobs.length) return { ok: true, jobs: [], message: 'No matching open jobs nearby right now.' };
      return {
        ok: true,
        jobs: jobs.map(({ job, distanceKm }) => ({
          job_code: job.code,
          work: skillLabel(job.skill),
          area: job.locality,
          distance_km: Math.round(distanceKm * 10) / 10,
          wage_per_day_inr: job.wagePerDay,
          days: job.durationDays,
          starts: job.startDate,
          workers_needed: job.workersNeeded,
        })),
      };
    }
    case 'accept_job': {
      const a = AcceptJobArgs.parse(rawArgs);
      const worker = await ctx.repo.getWorkerByPhone(a.phone);
      if (!worker) return { ok: false, message: 'This phone number is not registered yet. Register the caller first.' };
      const job = (await ctx.repo.listJobs({ limit: 500 })).find((j) => j.code === a.job_code);
      if (!job) return { ok: false, message: `No job with code ${a.job_code}.` };
      const m = await ensureMatch(ctx, worker, job);
      try {
        await respondToMatch(ctx, m.id, 'accepted');
      } catch (e) {
        if (e instanceof MatchError && e.code === 'filled') return { ok: false, message: 'Sorry, this job is already filled.' };
        throw e;
      }
      return {
        ok: true,
        message: `Accepted. The employer ${job.employer.name} has been notified.`,
        employer_name: job.employer.name,
        employer_phone: job.employer.phone ?? 'shared by SMS',
        start_date: job.startDate,
        area: job.locality,
      };
    }
  }
}
