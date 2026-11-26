import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  DEMO_MODE: bool,
  LLM_PROVIDER: z.enum(['bedrock', 'mock']).default('mock'),
  BEDROCK_REGION: z.string().default('ap-south-1'),
  BEDROCK_MODEL_ID: z.string().default('apac.amazon.nova-pro-v1:0'),
  AWS_REGION: z.string().default('ap-south-1'),

  STORE: z.enum(['file', 'dynamo']).default('file'),
  DATA_FILE: z.string().optional(),
  DYNAMO_TABLE: z.string().default('kaamsetu'),

  STORAGE: z.enum(['local', 's3']).default('local'),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),

  GEO_PROVIDER: z.enum(['aws', 'mock']).default('mock'),

  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_STT_MODEL: z.string().default('scribe_v1'),
  ELEVENLABS_TTS_MODEL: z.string().default('eleven_multilingual_v2'),
  ELEVENLABS_ALERT_MODEL: z.string().default('eleven_flash_v2_5'),
  ELEVENLABS_VOICE_ID_HI: z.string().optional(),
  ELEVENLABS_VOICE_ID_MR: z.string().optional(),
  ELEVENLABS_VOICE_ID_EN: z.string().optional(),
  ELEVENLABS_AGENT_ID: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),

  AGENT_TOOL_SECRET: z.string().optional(),
  PUBLIC_BASE_URL: z.string().default('http://localhost:3000'),
  /** Seconds for simulated seed-worker responses in the demo. */
  SIM_SPEED: z.coerce.number().default(1),
  /** Scheme Finder ("My Benefits"), opt-in. Off unless explicitly enabled. */
  FEATURE_SCHEMES: bool,
  /** HMAC secret for private work-record links (falls back to AGENT_TOOL_SECRET) */
  WORK_RECORD_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

/** Directory containing the root package.json named "kaamsetu" (null in Lambda bundles). */
export function findRepoRoot(start = process.cwd()): string | null {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    const pkg = path.join(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        if ((JSON.parse(readFileSync(pkg, 'utf8')) as { name?: string }).name === 'kaamsetu') return dir;
      } catch {
        /* ignore */
      }
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

let loaded = false;
/** Load the repo-root .env once (no-op if absent, e.g. in Lambda). Existing env vars win. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const root = findRepoRoot();
  const file = root ? path.join(root, '.env') : null;
  if (file && existsSync(file)) {
    try {
      process.loadEnvFile(file);
    } catch {
      /* ignore malformed env file; zod defaults apply */
    }
  }
}

let cached: Env | null = null;
export function getEnv(): Env {
  if (cached) return cached;
  loadEnv();
  // treat empty strings as unset
  const raw = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''));
  cached = EnvSchema.parse(raw);
  return cached;
}

/** Which integrations are live vs mocked — surfaced as the "mock" pill in the UI. */
export function integrationStatus(env = getEnv()) {
  return {
    demoMode: env.DEMO_MODE,
    llm: env.DEMO_MODE ? 'mock' : env.LLM_PROVIDER,
    voice: !env.DEMO_MODE && env.ELEVENLABS_API_KEY ? 'elevenlabs' : 'mock',
    geo: env.DEMO_MODE ? 'mock' : env.GEO_PROVIDER,
    store: env.STORE,
    telegram: !env.DEMO_MODE && env.TELEGRAM_BOT_TOKEN ? 'telegram' : 'mock',
    agent: env.ELEVENLABS_AGENT_ID ? 'elevenlabs' : 'none',
    schemes: env.FEATURE_SCHEMES,
  } as const;
}
