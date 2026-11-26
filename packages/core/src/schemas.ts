import { z } from 'zod';
import { LANGUAGE_CODES } from './languages';
import { SKILL_CODES } from './skills';

export const LanguageSchema = z.enum(LANGUAGE_CODES);
export const SkillSchema = z.enum(SKILL_CODES);
export const LatLngSchema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD');
const isoDateTime = z.string().datetime({ offset: true });

/* ------------------------------------------------------------------ */
/* LLM extraction outputs (strict — what Bedrock must return)          */
/* ------------------------------------------------------------------ */

export const ExtractedProfileSchema = z.object({
  name: z.string().min(1).max(80).nullable(),
  skills: z.array(SkillSchema).max(5),
  experienceYears: z.number().int().min(0).max(60).nullable(),
  locality: z.string().max(80).nullable(),
  expectedWage: z.number().int().min(0).max(20000).nullable(),
  availability: z.enum(['available', 'busy']).nullable(),
  availableFrom: isoDate.nullable(),
  language: LanguageSchema,
});
export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;

export const ExtractedJobSchema = z.object({
  skill: SkillSchema.nullable(),
  workersNeeded: z.number().int().min(1).max(50).nullable(),
  durationDays: z.number().int().min(1).max(365).nullable(),
  wagePerDay: z.number().int().min(0).max(20000).nullable(),
  locality: z.string().max(80).nullable(),
  startDate: isoDate.nullable(),
  description: z.string().max(400).nullable(),
  language: LanguageSchema,
});
export type ExtractedJob = z.infer<typeof ExtractedJobSchema>;

/* ------------------------------------------------------------------ */
/* Domain entities                                                     */
/* ------------------------------------------------------------------ */

export const WorkerStatsSchema = z.object({
  jobsCompleted: z.number().int().min(0),
  ratingAvg: z.number().min(0).max(5),
  ratingCount: z.number().int().min(0),
  /** accepted jobs that were completed, 0..1 */
  completionRate: z.number().min(0).max(1),
});
export type WorkerStats = z.infer<typeof WorkerStatsSchema>;

export const ChannelKindSchema = z.enum(['telegram', 'whatsapp', 'voice_agent', 'web', 'seed']);
export type ChannelKind = z.infer<typeof ChannelKindSchema>;

/**
 * Scheme Finder answers (opt-in). PRIVACY: only age, yes/no answers and an income band are ever stored.
 * Never Aadhaar, bank account numbers or documents.
 */
export const BenefitsProfileSchema = z.object({
  optIn: z.boolean().default(false),
  /** false after the worker replies STOP BENEFITS */
  reminders: z.boolean().default(true),
  tipShown: z.boolean().default(false),
  /** exact age if the worker said a number; otherwise an inclusive band */
  age: z.number().int().min(10).max(100).nullable().default(null),
  ageBand: z.object({ min: z.number().int(), max: z.number().int() }).nullable().default(null),
  hasBankAccount: z.boolean().nullable().default(null),
  /** EPFO / ESIC deducted from pay */
  pfDeducted: z.boolean().nullable().default(null),
  paysIncomeTax: z.boolean().nullable().default(null),
  monthlyIncomeBand: z.enum(['upto_15000', 'above_15000']).nullable().default(null),
  /** schemeId → ISO date the worker said they applied/enrolled */
  applied: z.record(z.string()).default({}),
  /** schemeId → ISO date of the last renewal reminder */
  lastReminder: z.record(z.string()).default({}),
  /** set when the 90-day construction alert was sent */
  bocw90AlertAt: z.string().nullable().default(null),
  updatedAt: z.string().nullable().default(null),
});
export type BenefitsProfile = z.infer<typeof BenefitsProfileSchema>;

export const WorkerSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  /** PRIVATE — never rendered publicly; revealed only after mutual accept. */
  phone: z.string().max(20).nullable(),
  channel: ChannelKindSchema,
  /** Telegram chat id (string to be safe with big ints). null for seed/agent workers. */
  chatId: z.string().nullable(),
  language: LanguageSchema,
  skills: z.array(SkillSchema).min(1),
  experienceYears: z.number().int().min(0).max(60).nullable(),
  locality: z.string(),
  /** PRIVATE exact coordinates. Public views use locality only. */
  location: LatLngSchema,
  geohash: z.string(),
  expectedWage: z.number().int().min(0),
  availability: z.enum(['available', 'busy']),
  availableFrom: isoDate.nullable(),
  stats: WorkerStatsSchema,
  verified: z.boolean(),
  status: z.enum(['pending', 'active', 'deleted']),
  introTranscript: z.string().max(1000).nullable(),
  introAudioUrl: z.string().nullable(),
  consentAt: isoDateTime.nullable(),
  /** optional: absent on workers created before the Scheme Finder existed */
  benefits: BenefitsProfileSchema.optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});
export type Worker = z.infer<typeof WorkerSchema>;

export const EmployerSchema = z.object({
  name: z.string().min(1).max(80),
  phone: z.string().max(20).nullable(),
  business: z.string().max(80).nullable(),
});
export type Employer = z.infer<typeof EmployerSchema>;

export const JobFlagSchema = z.enum(['below_min_wage', 'rate_limited']);

export const JobSchema = z.object({
  id: z.string(),
  /** Short human code, e.g. "0421" */
  code: z.string(),
  skill: SkillSchema,
  workersNeeded: z.number().int().min(1).max(50),
  durationDays: z.number().int().min(1).max(365),
  wagePerDay: z.number().int().min(0),
  startDate: isoDate,
  locality: z.string(),
  location: LatLngSchema,
  geohash: z.string(),
  radiusKm: z.number().min(1).max(50),
  description: z.string().max(400).nullable(),
  employer: EmployerSchema,
  language: LanguageSchema,
  source: z.enum(['voice', 'form', 'agent', 'seed']),
  transcript: z.string().max(2000).nullable(),
  status: z.enum(['open', 'filled', 'closed']),
  flags: z.array(JobFlagSchema),
  createdAt: isoDateTime,
});
export type Job = z.infer<typeof JobSchema>;

export const ScoreBreakdownSchema = z.object({
  skill: z.number().min(0).max(1),
  proximity: z.number().min(0).max(1),
  wage: z.number().min(0).max(1),
  trust: z.number().min(0).max(1),
  availability: z.number().min(0).max(1),
});
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const MatchStatusSchema = z.enum(['suggested', 'alerted', 'viewed', 'accepted', 'declined']);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const MatchSchema = z.object({
  /** `${jobId}~${workerId}` */
  id: z.string(),
  jobId: z.string(),
  workerId: z.string(),
  rank: z.number().int().min(1),
  score: z.number().min(0).max(100),
  breakdown: ScoreBreakdownSchema,
  distanceKm: z.number().min(0),
  why: z.string(),
  status: MatchStatusSchema,
  alertedAt: isoDateTime.nullable(),
  viewedAt: isoDateTime.nullable(),
  respondedAt: isoDateTime.nullable(),
  /** Demo simulation for seed workers who have no real chat: statuses advance lazily on read. */
  /** employer marked the job done (counts towards construction work days) */
  completedAt: isoDateTime.nullable().optional(),
  /** employer confirmed this worker did the job (work record tick) */
  employerConfirmed: z.boolean().optional(),
  sim: z
    .object({
      viewAt: isoDateTime,
      respondAt: isoDateTime.nullable(),
      outcome: z.enum(['accepted', 'declined']).nullable(),
    })
    .nullable(),
  createdAt: isoDateTime,
});
export type Match = z.infer<typeof MatchSchema>;

export const RatingSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  workerId: z.string(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullable(),
  audioUrl: z.string().nullable(),
  createdAt: isoDateTime,
});
export type Rating = z.infer<typeof RatingSchema>;

export const EventTypeSchema = z.enum([
  'worker_registered',
  'job_posted',
  'match_alerted',
  'match_viewed',
  'match_accepted',
  'match_declined',
  'rating_added',
  'job_completed',
  'benefits_checked',
]);
export type EventType = z.infer<typeof EventTypeSchema>;

export const FeedEventSchema = z.object({
  id: z.string(),
  type: EventTypeSchema,
  at: isoDateTime,
  title: z.string(),
  subtitle: z.string().nullable(),
  location: LatLngSchema.nullable(),
  /** e.g. job id or worker id */
  refId: z.string(),
  jobId: z.string().nullable(),
});
export type FeedEvent = z.infer<typeof FeedEventSchema>;

/* ------------------------------------------------------------------ */
/* API inputs                                                          */
/* ------------------------------------------------------------------ */

export const JobDraftSchema = z.object({
  skill: SkillSchema,
  workersNeeded: z.number().int().min(1).max(50).default(1),
  durationDays: z.number().int().min(1).max(365).default(1),
  wagePerDay: z.number().int().min(100).max(20000),
  startDate: isoDate,
  locality: z.string().min(2).max(80),
  location: LatLngSchema.optional(),
  radiusKm: z.number().min(1).max(50).default(8),
  description: z.string().max(400).nullable().default(null),
  employer: EmployerSchema,
  language: LanguageSchema.default('en'),
  source: z.enum(['voice', 'form', 'agent', 'seed']).default('form'),
  transcript: z.string().max(2000).nullable().default(null),
});
export type JobDraftInput = z.input<typeof JobDraftSchema>;
export type JobDraft = z.output<typeof JobDraftSchema>;

export const RatingInputSchema = z.object({
  jobId: z.string(),
  workerId: z.string(),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullable().default(null),
});

/** Public-safe projection of a worker: no phone, no exact coords, no chat id. */
export const PublicWorkerSchema = WorkerSchema.pick({
  id: true,
  name: true,
  language: true,
  skills: true,
  experienceYears: true,
  locality: true,
  expectedWage: true,
  availability: true,
  stats: true,
  verified: true,
  introTranscript: true,
  introAudioUrl: true,
  createdAt: true,
}).extend({
  kaamScore: z.number(),
  badges: z.array(z.object({ id: z.string(), label: z.string(), tone: z.enum(['hivis', 'signal', 'ink']) })),
});
export type PublicWorker = z.infer<typeof PublicWorkerSchema>;
