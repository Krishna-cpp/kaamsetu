import { BedrockRuntimeClient, ConverseCommand, type Message } from '@aws-sdk/client-bedrock-runtime';
import type { z } from 'zod';
import type { Env } from '../config';
import { ruleExtractJob, ruleExtractProfile, todayIST } from '../extract-rules';
import type { Language } from '../languages';
import { PUNE_LOCALITIES } from '../localities';
import { ExtractedJobSchema, ExtractedProfileSchema, type ExtractedJob, type ExtractedProfile } from '../schemas';
import { SKILL_CODES } from '../skills';

export interface LlmAdapter {
  readonly name: 'bedrock' | 'mock';
  extractProfile(text: string, hint?: Language | null): Promise<ExtractedProfile>;
  extractJob(text: string, hint?: Language | null, today?: string): Promise<ExtractedJob>;
  /** Free-form generation (e.g. rephrase an alert). Mock returns the input unchanged. */
  complete(system: string, user: string): Promise<string>;
}

/* ------------------------------ mock ------------------------------ */

export class RuleLlm implements LlmAdapter {
  readonly name = 'mock' as const;
  async extractProfile(text: string, hint?: Language | null) {
    return ruleExtractProfile(text, hint);
  }
  async extractJob(text: string, hint?: Language | null, today = todayIST()) {
    return ruleExtractJob(text, hint, today);
  }
  async complete(_system: string, user: string) {
    return user;
  }
}

/* ----------------------------- bedrock ---------------------------- */

const COMMON_RULES = `
Rules:
- Output ONLY a single JSON object. No markdown, no code fences, no commentary.
- Input may be Hindi, Marathi or English, in Devanagari or romanised script, and may be an imperfect speech transcript.
- "skills"/"skill" must use ONLY these codes: ${SKILL_CODES.join(', ')}. Map synonyms (e.g. "rajmistri"/"गवंडी" → mason, "nal ka kaam" → plumber, "majdoor"/"हमाल" → helper).
- "locality" must be one of these Pune areas when one is mentioned (use the English spelling): ${PUNE_LOCALITIES.map((l) => l.name).join(', ')}. Otherwise the place name as heard, or null.
- Convert spoken numbers to integers ("aath sau" → 800, "पाचशे" → 500, "डेढ़ हजार" → 1500). Wages are INR per day.
- "language": hi, mr or en — the language the speaker mainly used.
- Use null for anything not stated. Never invent values.`;

const PROFILE_PROMPT = `You extract a worker profile from a voice-note transcript for KaamSetu, a job platform for informal workers in India.
Return JSON with exactly these keys:
{"name": string|null, "skills": string[], "experienceYears": integer|null, "locality": string|null, "expectedWage": integer|null, "availability": "available"|"busy"|null, "availableFrom": "YYYY-MM-DD"|null, "language": "hi"|"mr"|"en"}
${COMMON_RULES}`;

const JOB_PROMPT = (today: string) => `You extract a job posting from an employer's voice transcript for KaamSetu, a hyper-local job platform in Pune, India. Today is ${today} (Asia/Kolkata).
Return JSON with exactly these keys:
{"skill": string|null, "workersNeeded": integer|null, "durationDays": integer|null, "wagePerDay": integer|null, "locality": string|null, "startDate": "YYYY-MM-DD"|null, "description": string|null, "language": "hi"|"mr"|"en"}
- Resolve relative dates ("tomorrow", "kal", "उद्या", "parso") against today.
- "description": one short English sentence summarising the work.
${COMMON_RULES}`;

export function parseJsonLoose(text: string): unknown {
  const cleaned = text.replace(/^```(?:json)?/im, '').replace(/```\s*$/m, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in model output');
  return JSON.parse(cleaned.slice(start, end + 1));
}

/** Prefer model values, fill nulls/empties from the rule-based parse. */
function mergeFallback<T extends Record<string, unknown>>(primary: T, fallback: T): T {
  const out = { ...primary };
  for (const k of Object.keys(fallback) as (keyof T)[]) {
    const v = out[k];
    if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) out[k] = fallback[k];
  }
  return out;
}

export class BedrockLlm implements LlmAdapter {
  readonly name = 'bedrock' as const;
  private client: BedrockRuntimeClient;
  constructor(private env: Env) {
    this.client = new BedrockRuntimeClient({ region: env.BEDROCK_REGION });
  }

  async complete(system: string, user: string): Promise<string> {
    return this.converse(system, [{ role: 'user', content: [{ text: user }] }]);
  }

  private async converse(system: string, messages: Message[]): Promise<string> {
    const res = await this.client.send(
      new ConverseCommand({
        modelId: this.env.BEDROCK_MODEL_ID,
        system: [{ text: system }],
        messages,
        inferenceConfig: { maxTokens: 600, temperature: 0 },
      }),
    );
    const text = res.output?.message?.content?.map((c) => ('text' in c ? c.text : '')).join('') ?? '';
    if (!text) throw new Error('empty Bedrock response');
    return text;
  }

  /** JSON + zod validation with one corrective retry. */
  private async structured<S extends z.ZodTypeAny>(system: string, input: string, schema: S): Promise<z.output<S>> {
    const messages: Message[] = [{ role: 'user', content: [{ text: `Transcript:\n"""${input}"""` }] }];
    let lastErr = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await this.converse(system, messages);
      try {
        return schema.parse(parseJsonLoose(out));
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        messages.push({ role: 'assistant', content: [{ text: out }] });
        messages.push({
          role: 'user',
          content: [{ text: `That output was invalid: ${lastErr.slice(0, 500)}. Reply with ONLY the corrected JSON object.` }],
        });
      }
    }
    throw new Error(`Bedrock returned invalid JSON twice: ${lastErr}`);
  }

  async extractProfile(text: string, hint?: Language | null): Promise<ExtractedProfile> {
    const rules = ruleExtractProfile(text, hint);
    try {
      const p = await this.structured(PROFILE_PROMPT, text, ExtractedProfileSchema);
      return mergeFallback(p, rules);
    } catch (e) {
      console.warn('[llm] bedrock profile extraction failed, using rules:', (e as Error).message);
      return rules;
    }
  }

  async extractJob(text: string, hint?: Language | null, today = todayIST()): Promise<ExtractedJob> {
    const rules = ruleExtractJob(text, hint, today);
    try {
      const j = await this.structured(JOB_PROMPT(today), text, ExtractedJobSchema);
      return mergeFallback(j, rules);
    } catch (e) {
      console.warn('[llm] bedrock job extraction failed, using rules:', (e as Error).message);
      return rules;
    }
  }
}

export function createLlm(env: Env): LlmAdapter {
  return !env.DEMO_MODE && env.LLM_PROVIDER === 'bedrock' ? new BedrockLlm(env) : new RuleLlm();
}
