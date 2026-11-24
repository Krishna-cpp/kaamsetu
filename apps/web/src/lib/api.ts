/** Typed client for the KaamSetu web API (used by client components). */
import type { FeedEvent, Job, JobDraftInput, Language, PublicWorker, Rating, LatLng } from '@kaamsetu/core';
import type { JobView, ParsedJob } from '@kaamsetu/core/server';

export type { JobView, ParsedJob, MatchView } from '@kaamsetu/core/server';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? 'error', body.message ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export interface Transcript {
  text: string;
  language: Language | null;
  provider: 'elevenlabs' | 'mock';
}

export type PublicWorkerWithPin = PublicWorker & { approxLocation: LatLng };

export interface FeedResponse {
  events: FeedEvent[];
  stats: { workers: number; jobs: number; openJobs: number; filledJobs: number };
  now: string;
}

export const api = {
  transcribe(audio: Blob, kind: 'job' | 'worker' = 'job', lang?: Language): Promise<Transcript> {
    const fd = new FormData();
    fd.append('audio', audio, 'recording.webm');
    fd.append('kind', kind);
    if (lang) fd.append('lang', lang);
    return fetch('/api/stt', { method: 'POST', body: fd }).then((r) => json<Transcript>(r));
  },
  parseJob(transcript: string, language?: Language | null): Promise<ParsedJob> {
    return fetch('/api/jobs/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcript, language }),
    }).then((r) => json<ParsedJob>(r));
  },
  createJob(draft: JobDraftInput): Promise<{ job: Job }> {
    return fetch('/api/jobs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(draft) }).then((r) =>
      json<{ job: Job }>(r),
    );
  },
  listJobs(limit = 30): Promise<Job[]> {
    return fetch(`/api/jobs?limit=${limit}`, { cache: 'no-store' }).then((r) => json<Job[]>(r));
  },
  jobView(id: string): Promise<JobView> {
    return fetch(`/api/jobs/${id}`, { cache: 'no-store' }).then((r) => json<JobView>(r));
  },
  respond(matchId: string, action: 'accepted' | 'declined' | 'viewed') {
    return fetch(`/api/matches/${encodeURIComponent(matchId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action }),
    }).then((r) => json<{ jobStatus: string }>(r));
  },
  workers(): Promise<PublicWorkerWithPin[]> {
    return fetch('/api/workers', { cache: 'no-store' }).then((r) => json<PublicWorkerWithPin[]>(r));
  },
  worker(id: string): Promise<{ worker: PublicWorker; ratings: Rating[] }> {
    return fetch(`/api/workers/${id}`).then((r) => json<{ worker: PublicWorker; ratings: Rating[] }>(r));
  },
  rate(input: { jobId: string; workerId: string; stars: number; comment?: string | null }) {
    return fetch('/api/ratings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) }).then((r) =>
      json<{ worker: PublicWorker }>(r),
    );
  },
  feed(since?: string): Promise<FeedResponse> {
    return fetch(`/api/feed${since ? `?since=${encodeURIComponent(since)}` : ''}`, { cache: 'no-store' }).then((r) => json<FeedResponse>(r));
  },
  /** Returns an object URL for the audio, or null if voice is mocked. */
  async tts(text: string, lang: Language): Promise<string | null> {
    const r = await fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, lang }) });
    if (r.status === 204 || !r.ok) return null;
    return URL.createObjectURL(await r.blob());
  },
};
