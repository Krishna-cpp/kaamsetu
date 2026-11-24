import path from 'node:path';
import { createChannel, type ChatChannel } from './adapters/channel';
import { RoutingChannel, WebChannel } from './adapters/web-channel';
import { createGeo, type GeoAdapter } from './adapters/geocode';
import { createLlm, type LlmAdapter } from './adapters/llm';
import { createStorage, type StorageAdapter } from './adapters/storage';
import { createStt, createTts, type SttAdapter, type TtsAdapter } from './adapters/voice';
import { findRepoRoot, getEnv, type Env } from './config';
import { DynamoRepo } from './store/dynamo-repo';
import { FileRepo } from './store/file-repo';
import type { Repo } from './store/repo';

export interface Ctx {
  env: Env;
  repo: Repo;
  llm: LlmAdapter;
  /** STT; the mock variant returns a worker- or job-shaped transcript */
  stt: (kind?: 'worker' | 'job') => SttAdapter;
  tts: TtsAdapter;
  geo: GeoAdapter;
  channel: ChatChannel;
  storage: StorageAdapter;
}

export function defaultDataFile(env: Env): string {
  if (env.DATA_FILE) return path.resolve(env.DATA_FILE);
  const root = findRepoRoot();
  return path.join(root ?? process.cwd(), 'data', 'db.json');
}

export function createRepo(env: Env): Repo {
  return env.STORE === 'dynamo' ? new DynamoRepo(env.DYNAMO_TABLE, env.AWS_REGION) : new FileRepo(defaultDataFile(env));
}

const g = globalThis as unknown as { __kaamsetuCtx?: Ctx };

/** Process-wide singleton (survives Next.js dev hot reloads). */
export function getCtx(): Ctx {
  if (g.__kaamsetuCtx) return g.__kaamsetuCtx;
  const env = getEnv();
  const storage = createStorage(env);
  const repo = createRepo(env);
  const ctx: Ctx = {
    env,
    repo,
    llm: createLlm(env),
    stt: (kind = 'job') => createStt(env, kind),
    tts: createTts(env, storage),
    geo: createGeo(env),
    // Telegram (or mock) for normal chats; web_… chat ids go to the /chat web channel
    channel: new RoutingChannel(createChannel(env), new WebChannel(repo, storage)),
    storage,
  };
  g.__kaamsetuCtx = ctx;
  return ctx;
}

/** For tests: inject a custom context. */
export function setCtx(ctx: Ctx | null) {
  g.__kaamsetuCtx = ctx ?? undefined;
}
