/**
 * Opt-in Scheme Finder conversation, shared by Telegram and /chat (via bot/handler.ts) and the tests.
 * Rules: nothing here runs unless the worker asked (keyword, /benefits, the chip, or a button they tapped).
 */
import type { ButtonGrid } from '../adapters/channel';
import { escapeHtml } from '../bot/speak';
import type { Ctx } from '../context';
import { normaliseDigits, wordsToNumbers } from '../extract-rules';
import type { Language } from '../languages';
import type { Worker } from '../schemas';
import { benefitsOf, constructionDays12m, eligibilityProfile, hasAnyAnswer, saveBenefits, workRecordUrl } from '../services/benefits';
import { emit } from '../services/workflows';
import { DOCS, SCHEME_BY_ID, type SchemeId } from './catalogue';
import { evaluateAll, evaluateScheme, questionsToAsk, sortResults, type Question, type SchemeResult } from './engine';
import { mapsLink, nearestHelpCentre } from './help-centres';
import { isStopIntent, parseYesNo } from './keywords';
import { st } from './strings';

export interface BenefitsSession {
  /** the question currently waiting for an answer (null = not in the flow) */
  step: Question | null;
  skipped: Question[];
}

/** What the flow needs from a channel conversation. */
export interface FlowIO {
  say(text: string, buttons?: ButtonGrid, extra?: string): Promise<void>;
  text(text: string, buttons?: ButtonGrid): Promise<void>;
  location?(place: { lat: number; lng: number; title: string; address: string }): Promise<void>;
}

const AGE_BANDS: Record<string, { min: number; max: number }> = {
  '18-25': { min: 18, max: 25 },
  '26-40': { min: 26, max: 40 },
  '41-50': { min: 41, max: 50 },
  '51-60': { min: 51, max: 60 },
  '60+': { min: 61, max: 99 },
};

const Q_TEXT: Record<Question, Parameters<typeof st>[0]> = { age: 'qAge', bank: 'qBank', pf: 'qPf', tax: 'qTax', income: 'qIncome' };

function questionButtons(q: Question, lang: Language): ButtonGrid {
  const skip = [{ text: st('bSkip', lang), data: `ben|skip|${q}` }];
  const yn = (first: 'yes' | 'no') => {
    const yes = { text: st('bYes', lang), data: `ben|ans|${q}|yes` };
    const no = { text: st('bNo', lang), data: `ben|ans|${q}|no` };
    return first === 'yes' ? [yes, no] : [no, yes];
  };
  switch (q) {
    case 'age':
      return [
        [{ text: '18-25', data: 'ben|ans|age|18-25' }, { text: '26-40', data: 'ben|ans|age|26-40' }],
        [{ text: '41-50', data: 'ben|ans|age|41-50' }, { text: '51-60', data: 'ben|ans|age|51-60' }],
        [{ text: '60+', data: 'ben|ans|age|60+' }],
        skip,
      ];
    case 'bank':
      return [yn('yes'), skip];
    case 'pf':
      return [[...yn('yes'), { text: st('bDontKnow', lang), data: 'ben|ans|pf|dont_know' }], skip];
    case 'tax':
      return [yn('no'), skip];
    case 'income':
      return [[{ text: st('bUpto15k', lang), data: 'ben|ans|income|upto_15000' }], [{ text: st('bAbove15k', lang), data: 'ben|ans|income|above_15000' }], skip];
  }
}

/* ------------------------------ entry ------------------------------ */

/** The worker asked about benefits (keyword, /benefits, chip). Explain first and ask permission. */
export async function startBenefits(ctx: Ctx, w: Worker | null, lang: Language, sess: { benefits?: BenefitsSession }, io: FlowIO) {
  if (!w || w.status !== 'active') {
    await io.say(st('needProfile', lang));
    return;
  }
  const b = benefitsOf(w);
  if (b.optIn && hasAnyAnswer(b)) {
    // returning user: never ask again, show results with an update option
    sess.benefits = { step: null, skipped: sess.benefits?.skipped ?? [] };
    await showResults(ctx, w, lang, io);
    return;
  }
  sess.benefits = { step: null, skipped: [] };
  await io.say(st('explain', lang), [
    [
      { text: st('bStart', lang), data: 'ben|start' },
      { text: st('bNotNow', lang), data: 'ben|later' },
    ],
  ]);
}

async function askNext(ctx: Ctx, w: Worker, lang: Language, sess: { benefits?: BenefitsSession }, io: FlowIO) {
  const s = (sess.benefits ??= { step: null, skipped: [] });
  const days = await constructionDays12m(ctx, w.id);
  const next = questionsToAsk(eligibilityProfile(w, days), s.skipped)[0];
  if (!next) {
    s.step = null;
    await showResults(ctx, w, lang, io);
    return;
  }
  s.step = next;
  await io.say(st(Q_TEXT[next], lang), questionButtons(next, lang));
}

/** Store one answer. Returns the updated worker. "Don't know" counts as skipped (→ need_info, not an error). */
async function applyAnswer(ctx: Ctx, w: Worker, q: Question, value: string, sess: { benefits?: BenefitsSession }): Promise<Worker> {
  const s = (sess.benefits ??= { step: null, skipped: [] });
  if (value === 'dont_know') {
    if (!s.skipped.includes(q)) s.skipped.push(q);
    return w;
  }
  switch (q) {
    case 'age': {
      const band = AGE_BANDS[value];
      const n = Number(value);
      return saveBenefits(ctx, w, band ? { ageBand: band, age: null } : Number.isFinite(n) ? { age: Math.round(n), ageBand: null } : {});
    }
    case 'bank':
      return saveBenefits(ctx, w, { hasBankAccount: value === 'yes' });
    case 'pf':
      return saveBenefits(ctx, w, { pfDeducted: value === 'yes' });
    case 'tax':
      return saveBenefits(ctx, w, { paysIncomeTax: value === 'yes' });
    case 'income':
      return saveBenefits(ctx, w, { monthlyIncomeBand: value === 'above_15000' ? 'above_15000' : 'upto_15000' });
  }
}

/** Parse a typed/spoken answer for the current question. null = could not understand. */
export function parseAnswer(q: Question, text: string): string | null {
  const t = wordsToNumbers(normaliseDigits(text));
  if (q === 'age') {
    const m = t.match(/\b(\d{1,2})\b/);
    const n = m ? Number(m[1]) : NaN;
    return Number.isFinite(n) && n >= 10 && n <= 99 ? String(n) : null;
  }
  if (q === 'income') {
    const m = t.replace(/,/g, '').match(/(\d{3,6})/);
    if (m) return Number(m[1]) <= 15000 ? 'upto_15000' : 'above_15000';
    return null;
  }
  const yn = parseYesNo(text);
  return yn;
}

/** A typed or spoken message while the flow is waiting for an answer. Returns true if handled. */
export async function onBenefitsText(ctx: Ctx, w: Worker | null, lang: Language, sess: { benefits?: BenefitsSession }, text: string, io: FlowIO): Promise<boolean> {
  const s = sess.benefits;
  if (!s?.step || !w) return false;
  if (isStopIntent(text)) {
    s.step = null;
    await io.say(st('later', lang));
    return true;
  }
  const value = parseAnswer(s.step, text);
  if (value === null) {
    await io.text(st('didNotGet', lang), questionButtons(s.step, lang));
    return true;
  }
  const updated = await applyAnswer(ctx, w, s.step, value, sess);
  await askNext(ctx, updated, lang, sess, io);
  return true;
}

/** Button presses: ben|start, ben|later, ben|skip|q, ben|ans|q|v, ben|update, ben|applied|id, ben|checklist|id */
export async function onBenefitsCallback(ctx: Ctx, w: Worker | null, lang: Language, sess: { benefits?: BenefitsSession }, parts: string[], io: FlowIO) {
  const [, action, a, b] = parts;
  if (!w || w.status !== 'active') {
    await io.say(st('needProfile', lang));
    return;
  }
  const s = (sess.benefits ??= { step: null, skipped: [] });
  switch (action) {
    case 'start': {
      const updated = await saveBenefits(ctx, w, { optIn: true });
      await io.text(st('privacy', lang));
      await askNext(ctx, updated, lang, sess, io);
      return;
    }
    case 'later':
      s.step = null;
      await io.say(st('later', lang));
      return;
    case 'skip':
      if (a && !s.skipped.includes(a as Question)) s.skipped.push(a as Question);
      await askNext(ctx, w, lang, sess, io);
      return;
    case 'ans': {
      if (!a || !b) return;
      const updated = await applyAnswer(ctx, w, a as Question, b, sess);
      await askNext(ctx, updated, lang, sess, io);
      return;
    }
    case 'update': {
      const updated = await saveBenefits(ctx, w, {
        optIn: true,
        age: null,
        ageBand: null,
        hasBankAccount: null,
        pfDeducted: null,
        paysIncomeTax: null,
        monthlyIncomeBand: null,
      });
      sess.benefits = { step: null, skipped: [] };
      await io.text(st('privacy', lang));
      await askNext(ctx, updated, lang, sess, io);
      return;
    }
    case 'applied': {
      const scheme = SCHEME_BY_ID[a as SchemeId];
      if (!scheme) return;
      const cur = benefitsOf(w);
      await saveBenefits(ctx, w, { applied: { ...cur.applied, [scheme.id]: new Date().toISOString().slice(0, 10) } });
      await io.text(st('appliedSaved', lang, { scheme: scheme.name[lang] }));
      return;
    }
    case 'checklist': {
      const scheme = SCHEME_BY_ID[a as SchemeId];
      if (!scheme) return;
      const days = await constructionDays12m(ctx, w.id);
      const r = evaluateScheme(scheme, eligibilityProfile(w, days), lang);
      await io.text(card(r, lang), cardButtons(ctx, r, lang, w));
      await sendHelpCentre(w, r.scheme.helpCentreType, lang, io);
      return;
    }
  }
}

/* ----------------------------- results ----------------------------- */

function statusLabel(r: SchemeResult, lang: Language) {
  return r.status === 'likely' ? st('maybeEligible', lang) : r.status === 'maybe' ? st('checkFirst', lang) : r.status === 'need_info' ? st('needMore', lang) : st('notNow', lang);
}

export function card(r: SchemeResult, lang: Language): string {
  const s = r.scheme;
  const lines = [
    `<b>${escapeHtml(s.name[lang])}</b> · ${statusLabel(r, lang)}`,
    escapeHtml(s.oneLineBenefit[lang]),
    r.reasons.length ? `<i>${st('why', lang)}: ${escapeHtml(r.reasons.join('; '))}</i>` : '',
    `📄 ${st('carry', lang)}: ${s.documents.map((d) => DOCS[d][lang]).join(', ')}`,
    s.renewal ? `🔁 ${escapeHtml(s.renewal[lang])}` : '',
    `🔗 ${s.officialUrl}`,
  ];
  return lines.filter(Boolean).join('\n');
}

function cardButtons(ctx: Ctx, r: SchemeResult, lang: Language, w: Worker): ButtonGrid {
  const rows: ButtonGrid = [[{ text: st('bOfficial', lang), url: r.scheme.officialUrl }]];
  if (r.scheme.id !== 'pmjay') rows.push([{ text: st('bApplied', lang), data: `ben|applied|${r.scheme.id}` }]);
  if (r.scheme.id === 'bocw_mh' || r.scheme.id === 'bocw_ka') rows.push([{ text: st('workRecord', lang), url: workRecordUrl(ctx, w.id) }]);
  return rows;
}

async function sendHelpCentre(w: Worker, type: SchemeResult['scheme']['helpCentreType'], lang: Language, io: FlowIO) {
  const near = nearestHelpCentre(w.location, type) ?? nearestHelpCentre(w.location);
  if (!near) return;
  const { centre, distanceKm } = near;
  const line = st('nearest', lang, { name: centre.name, area: centre.area, km: distanceKm });
  if (io.location) {
    await io.location({ lat: centre.location.lat, lng: centre.location.lng, title: centre.name, address: `${centre.area}, ${centre.city} · ${distanceKm} km` });
    await io.text(line);
  } else {
    await io.text(`${line}\n${mapsLink(centre.location)}`);
  }
}

/** Spoken summary + one card per "may be eligible" scheme + nearest help centre. */
export async function showResults(ctx: Ctx, w: Worker, lang: Language, io: FlowIO) {
  const days = await constructionDays12m(ctx, w.id);
  const profile = eligibilityProfile(w, days);
  const results = sortResults(evaluateAll(profile, lang));
  const good = results.filter((r) => r.status === 'likely' || r.status === 'maybe');
  const need = results.filter((r) => r.status === 'need_info');
  const notNow = results.filter((r) => r.status === 'not_eligible');
  const first = w.name.split(' ')[0] ?? w.name;

  if (profile.hasBankAccount === false) await io.text(st('janDhan', lang));

  const top = good
    .filter((r) => r.status === 'likely')
    .slice(0, 3)
    .map((r) => r.scheme.spoken[lang])
    .join(', ');
  const likelyCount = good.filter((r) => r.status === 'likely').length;
  await io.say(likelyCount ? st('summary', lang, { name: first, n: likelyCount, top }) : st('summaryNone', lang, { name: first }));

  for (const r of good) await io.text(card(r, lang), cardButtons(ctx, r, lang, w));

  const rest: string[] = [];
  if (need.length) rest.push(`⏳ ${st('needMore', lang)}: ${need.map((r) => r.scheme.name[lang]).join(', ')}`);
  if (notNow.length) rest.push(`▫️ ${st('notNow', lang)}: ${notNow.map((r) => `${r.scheme.name[lang]} (${r.reasons[0] ?? ''})`).join('; ')}`);
  rest.push(`<i>${st('disclaimer', lang)}</i>`);
  await io.text(escapeHtmlKeepItalics(rest.join('\n')), [
    [{ text: st('bUpdate', lang), data: 'ben|update' }],
    [{ text: st('workRecord', lang), url: workRecordUrl(ctx, w.id) }],
  ]);

  const primary = good.find((r) => r.status === 'likely')?.scheme.helpCentreType ?? 'csc';
  await sendHelpCentre(w, primary, lang, io);

  await emit(ctx, {
    type: 'benefits_checked',
    title: `${first} checked benefits`,
    subtitle: `${likelyCount} may be eligible · ${w.locality}`,
    location: null,
    refId: w.id,
    jobId: null,
  });
}

function escapeHtmlKeepItalics(s: string) {
  return escapeHtml(s).replace(/&lt;i&gt;/g, '<i>').replace(/&lt;\/i&gt;/g, '</i>');
}

export { evaluateAll };
