import type { FeedEvent, Job, Match, Rating, Worker } from '../schemas';

export interface NearbyQuery {
  lat: number;
  lng: number;
  radiusKm: number;
}

/** Persistence contract. Implemented by FileRepo (local/dev/demo) and DynamoRepo (AWS). */
export interface Repo {
  readonly name: 'file' | 'dynamo' | 'memory';

  getWorker(id: string): Promise<Worker | null>;
  getWorkerByChat(chatId: string): Promise<Worker | null>;
  getWorkerByPhone(phone: string): Promise<Worker | null>;
  putWorker(w: Worker): Promise<void>;
  /** Hard-delete the worker + their ratings + matches (privacy: "delete my data"). */
  deleteWorker(id: string): Promise<void>;
  /** Candidate workers near a point (implementations may over-fetch; callers filter by exact distance). */
  listWorkers(near?: NearbyQuery): Promise<Worker[]>;

  getJob(id: string): Promise<Job | null>;
  putJob(j: Job): Promise<void>;
  listJobs(opts?: { limit?: number; near?: NearbyQuery }): Promise<Job[]>;

  putMatches(ms: Match[]): Promise<void>;
  getMatch(id: string): Promise<Match | null>;
  updateMatch(id: string, patch: Partial<Match>): Promise<Match | null>;
  listMatchesForJob(jobId: string): Promise<Match[]>;
  listMatchesForWorker(workerId: string): Promise<Match[]>;

  addRating(r: Rating): Promise<void>;
  listRatings(workerId: string): Promise<Rating[]>;

  addEvent(e: FeedEvent): Promise<void>;
  listEvents(opts?: { since?: string; limit?: number }): Promise<FeedEvent[]>;

  /** Telegram per-chat conversation state (pending profile, chosen language…). */
  getSession(chatId: string): Promise<Record<string, unknown> | null>;
  putSession(chatId: string, data: Record<string, unknown>): Promise<void>;
}
