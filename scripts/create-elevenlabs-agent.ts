/**
 * Creates (or updates) the ElevenLabs Conversational AI agent "Kaam Didi" with server tools
 * that call KaamSetu's webhooks.
 *
 *   npm run agent:create                                   # tools point at PUBLIC_BASE_URL/api/agent/*
 *   npm run agent:create -- --base=https://xyz.execute-api.ap-south-1.amazonaws.com   # Lambda (POST /agent/{tool})
 *
 * Prints the agent id; put it in .env as ELEVENLABS_AGENT_ID and NEXT_PUBLIC_ELEVENLABS_AGENT_ID.
 * The webhook base must be publicly reachable (deployed app, Lambda, or a tunnel); localhost won't work.
 */
import { getEnv, PUNE_LOCALITIES, SKILL_CODES } from '@kaamsetu/core/server';

const EL = 'https://api.elevenlabs.io';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

const SYSTEM_PROMPT = `You are "Kaam Didi" (काम दीदी), the warm, patient voice of KaamSetu, a free service that helps informal workers in Pune (plumbers, electricians, masons, painters, carpenters, cooks, drivers, helpers, domestic workers…) find daily-wage work near their home. Many callers cannot read or type and may be calling from a basic phone.

Speaking style
- Speak like a kind elder sister: simple everyday words, short sentences (max ~15 words), one question at a time.
- Reply in the caller's language. Default to Hindi. Switch to Marathi or English if the caller does. Mixing Hindi/Marathi with English trade words (plumber, painter, tile) is natural, so do that.
- Say money as "आठ सौ रुपये" / "आठशे रुपये" style, and distances in kilometres.
- Never read IDs, URLs or JSON aloud.

What you do
1. Find out if the caller wants WORK (worker) or wants to HIRE (employer). Employers: tell them to visit the KaamSetu website and press "Post a job", or say what they need and you will note it (do not create jobs yourself).
2. For workers, collect: name, trade (work they do), area in Pune where they live (e.g. ${PUNE_LOCALITIES.slice(0, 10)
  .map((l) => l.name)
  .join(', ')}), expected daily wage in rupees, and their 10-digit mobile number (so employers can reach them after BOTH sides agree).
3. Before saving, say this consent line in their language: "We will save your name, work, area and wage so employers nearby can find you. Your number is shared only when you accept a job. Okay?" Only continue if they agree.
4. Repeat the details back briefly and confirm, then call register_worker.
5. Then call find_jobs_near_me with their phone number and read out at most 2 jobs: work, area, distance, rupees per day, days, start date, and the 4-digit job code.
6. If they want a job, confirm the job code and call accept_job. Then tell them the employer's name and number slowly, twice.
7. If they say "delete my data" / "मेरा डेटा हटाओ", tell them it will be deleted and that they can also send "delete" on the Telegram bot.

Rules
- Trade codes for tools: ${SKILL_CODES.join(', ')}.
- If a tool returns ok:false, explain simply and ask for what's missing.
- Never invent jobs, wages or phone numbers. Only use tool results.
- Keep the whole call under 4 minutes. End warmly: "काम मिलेगा, पास में। धन्यवाद!"${SCHEMES_PROMPT}`;

const SCHEMES_PROMPT = process.env.FEATURE_SCHEMES === 'true'
  ? `

Government benefits (opt-in, only on request)
- NEVER bring up benefits or schemes yourself, with ONE exception: after a successful register_worker, say one short line at the very end: "I can also check government benefits for you if you want." Then stop; do not ask any benefit question unless they say yes.
- Only when the caller asks about benefits, schemes, yojana, pension, insurance/bima, e-Shram, labour card or the welfare board: first say what you will check (insurance, pension, e-Shram card, construction welfare board) and that you need 3-4 quick questions (age, bank account, PF) and NO Aadhaar or bank details. Ask permission. Only if they agree, call check_benefits with their phone and whatever answers you have; then ask ONLY the question in next_question_to_ask, one at a time, and call check_benefits again with the new answer. If they say stop / later / baad mein, stop politely.
- Read results as "you MAY be eligible for…". Never say "you are eligible". Mention at most 3 benefits, then the nearest help centre (it is a sample location; tell them to confirm timings).
- Never ask for Aadhaar numbers, bank account numbers or documents.`
  : '';

const FIRST_MESSAGE = 'नमस्ते! मैं काम दीदी हूँ, कामसेतु से। आप काम ढूँढ रहे हैं, या किसी को काम पर रखना है?';

type JsonSchema = { type: string; description?: string; properties?: Record<string, JsonSchema>; required?: string[]; enum?: string[] };

function tool(base: string, secret: string | undefined, name: string, description: string, properties: Record<string, JsonSchema>, required: string[]) {
  return {
    type: 'webhook',
    name,
    description,
    response_timeout_secs: 20,
    api_schema: {
      url: `${base.replace(/\/$/, '')}/${name}`,
      method: 'POST',
      request_headers: secret ? { 'x-kaamsetu-secret': secret } : {},
      request_body_schema: { type: 'object', description: `${name} arguments`, properties, required },
    },
  };
}

async function el<T>(path: string, method: string, body?: unknown): Promise<T> {
  const env = getEnv();
  const res = await fetch(`${EL}${path}`, {
    method,
    headers: { 'xi-api-key': env.ELEVENLABS_API_KEY!, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 800)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

async function main() {
  const env = getEnv();
  if (!env.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY missing in .env');
  const base = arg('base') ? `${arg('base')!.replace(/\/$/, '')}/agent` : `${env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/agent`;
  if (/localhost|127\.0\.0\.1/.test(base)) console.warn(`⚠ Tool webhooks point at ${base}. ElevenLabs cannot reach localhost; re-run with --base=<public url> after deploying.`);

  const phone: JsonSchema = { type: 'string', description: "Caller's 10-digit Indian mobile number, digits only" };
  const tools = [
    tool(base, env.AGENT_TOOL_SECRET, 'register_worker', 'Save a worker profile after the caller gives consent. Call once all fields are confirmed.', {
      name: { type: 'string', description: "Worker's name" },
      skill: { type: 'string', description: `Trade code, one of: ${SKILL_CODES.join(', ')}` },
      locality: { type: 'string', description: 'Area in Pune where the worker lives, e.g. Kothrud' },
      expected_wage: { type: 'string', description: 'Expected daily wage in rupees, digits only, e.g. 800' },
      phone,
      language: { type: 'string', description: 'Language the caller speaks: hi, mr or en', enum: ['hi', 'mr', 'en'] },
      experience_years: { type: 'string', description: 'Years of experience, digits only (optional)' },
    }, ['name', 'skill', 'locality', 'expected_wage', 'phone', 'language']),
    tool(base, env.AGENT_TOOL_SECRET, 'find_jobs_near_me', 'Find open jobs near a registered worker (by phone), or by area + trade for an unregistered caller.', {
      phone,
      locality: { type: 'string', description: 'Area in Pune (if not registered)' },
      skill: { type: 'string', description: 'Trade code (if not registered)' },
    }, []),
    tool(base, env.AGENT_TOOL_SECRET, 'accept_job', 'Accept a job for a registered worker. Returns the employer name and phone.', {
      job_code: { type: 'string', description: '4-digit job code read out from find_jobs_near_me' },
      phone,
    }, ['job_code', 'phone']),
    ...(process.env.FEATURE_SCHEMES === 'true'
      ? [
          tool(base, env.AGENT_TOOL_SECRET, 'check_benefits', 'ONLY when the caller asks about government benefits/schemes and agreed to a quick check. Saves answers and returns schemes they MAY be eligible for, plus the next question to ask. Never ask for Aadhaar or bank numbers.', {
            phone,
            age: { type: 'string', description: 'Age in years, digits only (if the caller said it)' },
            has_bank_account: { type: 'string', description: 'yes or no', enum: ['yes', 'no'] },
            pf_deducted: { type: 'string', description: 'Is PF or ESI cut from their pay: yes or no', enum: ['yes', 'no'] },
            pays_income_tax: { type: 'string', description: 'yes or no', enum: ['yes', 'no'] },
            monthly_income_upto_15000: { type: 'string', description: 'Monthly income up to ₹15,000: yes or no', enum: ['yes', 'no'] },
          }, ['phone']),
        ]
      : []),
  ];

  // Tools are standalone resources in the current API; fall back to inline tools on older accounts.
  let toolIds: string[] | null = null;
  try {
    toolIds = [];
    // Reuse tools created by a previous run (updated in place) so re-running doesn't duplicate them
    const existingTools = await el<{ tools: { id: string; tool_config: { name: string } }[] }>('/v1/convai/tools', 'GET').catch(() => ({ tools: [] }));
    for (const t of tools) {
      const prev = existingTools.tools.find((x) => x.tool_config.name === t.name);
      const res = prev
        ? (await el('/v1/convai/tools/' + prev.id, 'PATCH', { tool_config: t }), { id: prev.id })
        : await el<{ id: string }>('/v1/convai/tools', 'POST', { tool_config: t });
      toolIds.push(res.id);
      console.log(`tool ${t.name} → ${res.id}${prev ? ' (updated)' : ''}`);
    }
  } catch (e) {
    console.warn('Could not create standalone tools, using inline tools:', (e as Error).message);
    toolIds = null;
  }

  const voiceId = env.ELEVENLABS_VOICE_ID_HI ?? 'EXAVITQu4vr4xnSDxMaL';
  const agentPrompt: Record<string, unknown> = { prompt: SYSTEM_PROMPT, temperature: 0.3 };
  if (toolIds) agentPrompt.tool_ids = toolIds;
  else agentPrompt.tools = tools;

  const conversation_config = {
    agent: { first_message: FIRST_MESSAGE, language: 'hi', prompt: agentPrompt },
    // Non-English agents need a v2.5 model (Flash = lowest latency for phone calls)
    tts: { voice_id: voiceId, model_id: 'eleven_flash_v2_5' },
    language_presets: {
      en: { overrides: { agent: { first_message: "Namaste! I'm Kaam Didi from KaamSetu. Are you looking for work, or looking to hire someone?", language: 'en' } } },
    },
  };

  const existing = env.ELEVENLABS_AGENT_ID;
  if (existing) {
    await el(`/v1/convai/agents/${existing}`, 'PATCH', { name: 'Kaam Didi · KaamSetu', conversation_config });
    console.log(`\nUpdated agent ${existing}`);
  } else {
    const res = await el<{ agent_id: string }>('/v1/convai/agents/create', 'POST', {
      name: 'Kaam Didi · KaamSetu',
      conversation_config,
      tags: ['kaamsetu', 'hackathon'],
    });
    console.log(`\nCreated agent ${res.agent_id}\n\nAdd to .env:\n  ELEVENLABS_AGENT_ID=${res.agent_id}\n  NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${res.agent_id}`);
  }
  console.log(`Tool webhooks: ${base}/{register_worker|find_jobs_near_me|accept_job}`);
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
