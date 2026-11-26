/**
 * Scheme Finder tests: eligibility engine boundaries + the opt-in conversation rules.
 * MOCKS ONLY: MockTts / MockStt / MockChannel / RuleLlm / MockGeo and a temp-file repo. No ElevenLabs calls.
 */
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { MockChannel } from '../adapters/channel';
import { MockGeo } from '../adapters/geocode';
import { RuleLlm } from '../adapters/llm';
import { LocalStorage } from '../adapters/storage';
import { MockStt, MockTts } from '../adapters/voice';
import { handleUpdate, type TgUpdate } from '../bot/handler';
import { getEnv } from '../config';
import type { Ctx } from '../context';
import { matchId } from '../ids';
import type { Job, Match, Worker } from '../schemas';
import { benefitsOf, completeMatch, runBenefitReminders, saveBenefits } from '../services/benefits';
import { FileRepo } from '../store/file-repo';
import { SCHEME_BY_ID } from './catalogue';
import { evaluateScheme, questionsToAsk, type EligibilityProfile } from './engine';
import { isBenefitsIntent, isStopIntent, parseYesNo } from './keywords';
import { SCHEME_STRINGS } from './strings';

/* ------------------------------------------------------------------ */
/* engine                                                              */
/* ------------------------------------------------------------------ */

const base: EligibilityProfile = {
  age: 30,
  ageBand: null,
  trades: ['plumber'],
  state: 'MH',
  hasBankAccount: true,
  pfDeducted: false,
  paysIncomeTax: false,
  monthlyIncomeBand: 'upto_15000',
  constructionDays12m: 0,
};
const status = (id: keyof typeof SCHEME_BY_ID, p: Partial<EligibilityProfile>) => evaluateScheme(SCHEME_BY_ID[id], { ...base, ...p }).status;

describe('eligibility engine: age boundaries', () => {
  it.each([
    ['eshram', 15, 'not_eligible'],
    ['eshram', 16, 'likely'],
    ['eshram', 59, 'likely'],
    ['eshram', 60, 'not_eligible'],
    ['pmsym', 17, 'not_eligible'],
    ['pmsym', 18, 'likely'],
    ['pmsym', 40, 'likely'],
    ['pmsym', 41, 'not_eligible'],
    ['apy', 40, 'likely'],
    ['apy', 41, 'not_eligible'],
    ['pmjjby', 50, 'likely'],
    ['pmjjby', 51, 'not_eligible'],
    ['pmsby', 70, 'likely'],
    ['pmsby', 71, 'not_eligible'],
  ] as const)('%s at age %i → %s', (id, age, expected) => {
    expect(status(id, { age })).toBe(expected);
  });

  it('BOCW: 59/60 in, 61 out (with 90+ days)', () => {
    expect(status('bocw_mh', { age: 59, constructionDays12m: 95 })).toBe('likely');
    expect(status('bocw_mh', { age: 60, constructionDays12m: 95 })).toBe('likely');
    expect(status('bocw_mh', { age: 61, constructionDays12m: 95 })).toBe('not_eligible');
  });

  it('an age band partly inside the range is "maybe", fully inside is "likely"', () => {
    expect(status('pmsym', { age: null, ageBand: { min: 26, max: 40 } })).toBe('likely');
    expect(status('pmjjby', { age: null, ageBand: { min: 41, max: 50 } })).toBe('likely');
    expect(status('eshram', { age: null, ageBand: { min: 51, max: 60 } })).toBe('maybe');
  });
});

describe('eligibility engine: rules', () => {
  it('89 vs 90 construction days', () => {
    expect(status('bocw_mh', { constructionDays12m: 89 })).toBe('not_eligible');
    expect(status('bocw_mh', { constructionDays12m: 90 })).toBe('likely');
  });

  it('BOCW needs a construction trade and the right state', () => {
    expect(status('bocw_mh', { trades: ['cook'], constructionDays12m: 120 })).toBe('not_eligible');
    expect(status('bocw_ka', { state: 'MH', constructionDays12m: 120 })).toBe('not_eligible');
    expect(status('bocw_ka', { state: 'KA', constructionDays12m: 120 })).toBe('likely');
  });

  it('a PF/ESI-deducted worker is excluded from PM-SYM and e-Shram', () => {
    expect(status('pmsym', { pfDeducted: true })).toBe('not_eligible');
    expect(status('eshram', { pfDeducted: true })).toBe('not_eligible');
    expect(status('pmsby', { pfDeducted: true })).toBe('likely'); // insurance does not care about PF
  });

  it('PM Vishwakarma: trade covered or not', () => {
    expect(status('pmvishwakarma', { trades: ['carpenter'] })).toBe('likely');
    expect(status('pmvishwakarma', { trades: ['mason'] })).toBe('likely');
    expect(status('pmvishwakarma', { trades: ['plumber'] })).toBe('not_eligible');
  });

  it('missing info returns need_info (not an error) with the question to ask', () => {
    const r = evaluateScheme(SCHEME_BY_ID.pmsym, { ...base, age: null, pfDeducted: null });
    expect(r.status).toBe('need_info');
    expect(r.missingInfo).toEqual(expect.arrayContaining(['age', 'pf']));
  });

  it('asks income only when PM-SYM still depends on it', () => {
    expect(questionsToAsk({ ...base, monthlyIncomeBand: null })).toContain('income');
    expect(questionsToAsk({ ...base, monthlyIncomeBand: null, age: 45 })).not.toContain('income'); // PM-SYM already out on age
  });

  it('reasons are plain language and results never claim certainty', () => {
    const r = evaluateScheme(SCHEME_BY_ID.pmsym, { ...base, age: 34 });
    expect(r.reasons[0]).toBe('You are 34, within 18-40');
    for (const l of ['en', 'hi', 'mr', 'kn'] as const) expect(SCHEME_STRINGS.maybeEligible[l]).toBeTruthy();
    expect(SCHEME_STRINGS.maybeEligible.en).toMatch(/may be eligible/i);
  });

  it('every scheme has an official https link', () => {
    for (const s of Object.values(SCHEME_BY_ID)) expect(s.officialUrl).toMatch(/^https:\/\//);
  });
});

describe('keywords', () => {
  it.each(['benefits', '/benefits', 'pension ke baare mein batao', 'sarkari yojana', 'मुझे बीमा चाहिए', 'योजना माहिती द्या', 'ಯೋಜನೆ ಬಗ್ಗೆ ಹೇಳಿ', 'e-shram card'])(
    '"%s" starts the flow',
    (t) => expect(isBenefitsIntent(t)).toBe(true),
  );
  it.each(['Mera naam Ramesh hai, main plumber hoon', 'Need 2 painters in Baner'])('"%s" does not', (t) => expect(isBenefitsIntent(t)).toBe(false));
  it('stop words and yes/no', () => {
    expect(isStopIntent('baad mein')).toBe(true);
    expect(isStopIntent('nantar')).toBe(true);
    expect(parseYesNo('haan')).toBe('yes');
    expect(parseYesNo('nahi hai')).toBe('no');
    expect(parseYesNo('पता नहीं')).toBe('dont_know');
  });
});

/* ------------------------------------------------------------------ */
/* opt-in conversation (bot handler, mocks)                            */
/* ------------------------------------------------------------------ */

let ctx: Ctx;
let channel: MockChannel;
let upd = 1;
const CHAT = '424242';

function makeCtx(feature = true): Ctx {
  const dir = mkdtempSync(path.join(tmpdir(), 'ks-schemes-'));
  channel = new MockChannel();
  const env = { ...getEnv(), FEATURE_SCHEMES: feature, DEMO_MODE: true, PUBLIC_BASE_URL: 'http://test' };
  return {
    env,
    repo: new FileRepo(path.join(dir, 'db.json')),
    llm: new RuleLlm(),
    stt: () => new MockStt('worker'),
    tts: new MockTts(),
    geo: new MockGeo(),
    channel,
    storage: new LocalStorage(dir),
  };
}

const text = (t: string): TgUpdate => ({ update_id: upd++, message: { message_id: upd, chat: { id: CHAT }, from: { id: 1, language_code: 'hi' }, text: t } });
const tap = (data: string): TgUpdate => ({ update_id: upd++, callback_query: { id: `cb${upd}`, from: { id: 1 }, message: { message_id: 1, chat: { id: CHAT } }, data } });
const sentTexts = () => channel.sent.map((m) => m.text);
const lastButtons = () => channel.sent[channel.sent.length - 1]?.buttons?.flat().map((b) => b.data ?? b.url) ?? [];

async function signUp(): Promise<Worker> {
  await handleUpdate(ctx, text('/start'));
  await handleUpdate(ctx, tap('lang|hi'));
  await handleUpdate(ctx, tap('consent|yes'));
  await handleUpdate(ctx, text('Mera naam Suresh Jadhav hai, main plumber hoon, Kothrud mein rehta hoon, 800 rupaye roz chahiye'));
  const w = (await ctx.repo.getWorkerByChat(CHAT))!;
  await handleUpdate(ctx, tap(`prof|ok|${w.id}`));
  return (await ctx.repo.getWorker(w.id))!;
}

const QUESTION_TEXTS = Object.values(SCHEME_STRINGS.qAge).concat(Object.values(SCHEME_STRINGS.explain));

describe('opt-in: signup', () => {
  beforeEach(() => {
    ctx = makeCtx(true);
  });

  it('a new signup gets the tip exactly once, and no benefit question', async () => {
    const w = await signUp();
    const tipCount = () => sentTexts().filter((t) => t.includes(SCHEME_STRINGS.tip.hi)).length;
    expect(tipCount()).toBe(1);
    expect(benefitsOf(w).tipShown).toBe(true);
    expect(sentTexts().some((t) => QUESTION_TEXTS.some((q) => t.includes(q)))).toBe(false);
    // confirming again (e.g. after a profile fix) does not repeat the tip
    await handleUpdate(ctx, tap(`prof|ok|${w.id}`));
    expect(tipCount()).toBe(1);
  });

  it('with FEATURE_SCHEMES off there is no tip and keywords do nothing special', async () => {
    ctx = makeCtx(false);
    await signUp();
    expect(sentTexts().some((t) => t.includes(SCHEME_STRINGS.tip.hi))).toBe(false);
    await handleUpdate(ctx, text('benefits'));
    expect(sentTexts().some((t) => t.includes(SCHEME_STRINGS.explain.hi))).toBe(false);
  });
});

describe('opt-in: asking', () => {
  beforeEach(async () => {
    ctx = makeCtx(true);
    await signUp();
  });

  it('a keyword explains first and asks permission (Start / Not now)', async () => {
    await handleUpdate(ctx, text('pension ke baare mein batao'));
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.explain.hi);
    expect(lastButtons()).toEqual(['ben|start', 'ben|later']);
  });

  it('"Not now" exits politely and asks nothing', async () => {
    await handleUpdate(ctx, text('/benefits'));
    await handleUpdate(ctx, tap('ben|later'));
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.later.hi);
    expect(sentTexts().some((t) => t.includes(SCHEME_STRINGS.qAge.hi))).toBe(false);
  });

  it('Start → privacy line → one question at a time; Skip and stop work; answers are kept', async () => {
    await handleUpdate(ctx, text('/benefits'));
    await handleUpdate(ctx, tap('ben|start'));
    expect(sentTexts()).toContain(SCHEME_STRINGS.privacy.hi);
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.qAge.hi);
    await handleUpdate(ctx, text('34')); // typed/spoken answer
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.qBank.hi);
    await handleUpdate(ctx, tap('ben|skip|bank'));
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.qPf.hi);
    await handleUpdate(ctx, text('baad mein'));
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.later.hi);
    const w = (await ctx.repo.getWorkerByChat(CHAT))!;
    expect(benefitsOf(w)).toMatchObject({ optIn: true, age: 34, hasBankAccount: null });
  });

  it('full answers → results with "may be eligible" cards and official links; next time results come directly', async () => {
    await handleUpdate(ctx, text('/benefits'));
    await handleUpdate(ctx, tap('ben|start'));
    await handleUpdate(ctx, tap('ben|ans|age|26-40'));
    await handleUpdate(ctx, tap('ben|ans|bank|yes'));
    await handleUpdate(ctx, tap('ben|ans|pf|no'));
    await handleUpdate(ctx, tap('ben|ans|tax|no'));
    await handleUpdate(ctx, tap('ben|ans|income|upto_15000'));
    const all = sentTexts().join('\n');
    expect(all).toContain(SCHEME_STRINGS.maybeEligible.hi);
    expect(all).toContain('https://maandhan.in/');
    expect(all).not.toMatch(/you are eligible|आप पात्र हैं/i);
    const before = channel.sent.length;
    await handleUpdate(ctx, text('/benefits'));
    const after = channel.sent.slice(before).map((m) => m.text).join('\n');
    expect(after).not.toContain(SCHEME_STRINGS.explain.hi); // no repeated questions
    expect(after).toContain(SCHEME_STRINGS.maybeEligible.hi);
  });

  it('"delete my data" also removes the scheme answers', async () => {
    await handleUpdate(ctx, text('/benefits'));
    await handleUpdate(ctx, tap('ben|start'));
    await handleUpdate(ctx, text('34'));
    await handleUpdate(ctx, text('delete my data'));
    expect(await ctx.repo.getWorkerByChat(CHAT)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* 90-day alert + reminders                                            */
/* ------------------------------------------------------------------ */

async function giveWork(w: Worker, days: number, opts: { completed: boolean; code: string }): Promise<Match> {
  const job: Job = {
    id: `j_${opts.code}`,
    code: opts.code,
    skill: 'plumber',
    workersNeeded: 1,
    durationDays: days,
    wagePerDay: 800,
    startDate: '2026-11-01',
    locality: 'Kothrud',
    location: w.location,
    geohash: w.geohash,
    radiusKm: 8,
    description: null,
    employer: { name: 'Test Builder', phone: null, business: null },
    language: 'en',
    source: 'form',
    transcript: null,
    status: 'filled',
    flags: [],
    createdAt: new Date().toISOString(),
  };
  await ctx.repo.putJob(job);
  const now = new Date().toISOString();
  const m: Match = {
    id: matchId(job.id, w.id),
    jobId: job.id,
    workerId: w.id,
    rank: 1,
    score: 90,
    breakdown: { skill: 1, proximity: 1, wage: 1, trust: 1, availability: 1 },
    distanceKm: 1,
    why: '',
    status: 'accepted',
    alertedAt: now,
    viewedAt: now,
    respondedAt: now,
    completedAt: opts.completed ? now : null,
    employerConfirmed: opts.completed,
    sim: null,
    createdAt: now,
  };
  await ctx.repo.putMatches([m]);
  return m;
}

describe('90-day alert (opt-in only)', () => {
  beforeEach(() => {
    ctx = makeCtx(true);
  });

  it('is NOT sent when the worker has not opted in', async () => {
    const w = await signUp();
    await giveWork(w, 88, { completed: true, code: '9001' });
    const pending = await giveWork(w, 3, { completed: false, code: '9002' });
    const r = await completeMatch(ctx, pending.id);
    expect(r.daysBefore).toBe(88);
    expect(r.daysAfter).toBe(91);
    expect(r.alerted).toBe(false);
    expect(sentTexts().some((t) => t.includes(SCHEME_STRINGS.bocw90.hi))).toBe(false);
  });

  it('is sent once the worker opted in and crosses 90 days', async () => {
    let w = await signUp();
    w = await saveBenefits(ctx, w, { optIn: true });
    await giveWork(w, 88, { completed: true, code: '9101' });
    const pending = await giveWork(w, 3, { completed: false, code: '9102' });
    const r = await completeMatch(ctx, pending.id);
    expect(r.alerted).toBe(true);
    expect(sentTexts().at(-1)).toContain(SCHEME_STRINGS.bocw90.hi);
  });
});

describe('reminders', () => {
  beforeEach(() => {
    ctx = makeCtx(true);
  });

  it('PMJJBY renewal reminder in May, and STOP BENEFITS turns reminders off', async () => {
    let w = await signUp();
    w = await saveBenefits(ctx, w, { optIn: true, applied: { pmjjby: '2026-01-10' } });
    const may15 = Date.UTC(2027, 4, 15);
    expect((await runBenefitReminders(ctx, may15)).sent).toBe(1);
    expect(sentTexts().at(-1)).toContain('STOP BENEFITS');
    expect((await runBenefitReminders(ctx, may15)).sent).toBe(0); // once per cycle

    await handleUpdate(ctx, text('STOP BENEFITS'));
    expect(benefitsOf((await ctx.repo.getWorker(w.id))!).reminders).toBe(false);
    await saveBenefits(ctx, (await ctx.repo.getWorker(w.id))!, { lastReminder: {} });
    expect((await runBenefitReminders(ctx, may15)).sent).toBe(0);
  });

  it('workers who never opted in get no reminders', async () => {
    const w = await signUp();
    await saveBenefits(ctx, w, { applied: { pmjjby: '2026-01-10' } });
    expect((await runBenefitReminders(ctx, Date.UTC(2027, 4, 15))).sent).toBe(0);
  });
});
