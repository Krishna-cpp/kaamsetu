import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { haversineKm } from '../geo';
import type { FeedEvent, Job, Match, Rating, Worker } from '../schemas';
import type { NearbyQuery, Repo } from './repo';

export interface DbShape {
  version: 1;
  workers: Record<string, Worker>;
  jobs: Record<string, Job>;
  matches: Record<string, Match>;
  ratings: Rating[];
  events: FeedEvent[];
  sessions: Record<string, Record<string, unknown>>;
}

export const emptyDb = (): DbShape => ({ version: 1, workers: {}, jobs: {}, matches: {}, ratings: [], events: [], sessions: {} });

const MAX_EVENTS = 400;

/**
 * JSON-file repository. Safe for a couple of local processes (web + bot):
 * re-reads when the file's mtime changes, writes atomically (tmp + rename).
 */
export class FileRepo implements Repo {
  readonly name = 'file' as const;
  private db: DbShape = emptyDb();
  private mtime = 0;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file: string) {
    mkdirSync(path.dirname(file), { recursive: true });
  }

  private load(): DbShape {
    if (!existsSync(this.file)) return this.db;
    const m = statSync(this.file).mtimeMs;
    if (m !== this.mtime) {
      try {
        this.db = { ...emptyDb(), ...(JSON.parse(readFileSync(this.file, 'utf8')) as Partial<DbShape>) };
        this.mtime = m;
      } catch {
        /* partially-written file from another process: keep the previous snapshot */
      }
    }
    return this.db;
  }

  private persist() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.db));
    for (let i = 0; i < 5; i++) {
      try {
        renameSync(tmp, this.file);
        break;
      } catch (e) {
        if (i === 4) throw e;
        // Windows: target briefly locked by a reader — spin a little
        const until = Date.now() + 20;
        while (Date.now() < until) {
          /* spin */
        }
      }
    }
    this.mtime = statSync(this.file).mtimeMs;
  }

  /** Serialised read-modify-write. */
  private mutate<T>(fn: (db: DbShape) => T): Promise<T> {
    const run = this.queue.then(() => {
      const db = this.load();
      const out = fn(db);
      this.persist();
      return out;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Replace the whole DB (seeding). */
  async replaceAll(db: DbShape) {
    await this.mutate((cur) => Object.assign(cur, db));
  }

  async getWorker(id: string) {
    return this.load().workers[id] ?? null;
  }
  async getWorkerByChat(chatId: string) {
    return Object.values(this.load().workers).find((w) => w.chatId === chatId && w.status !== 'deleted') ?? null;
  }
  async getWorkerByPhone(phone: string) {
    const p = phone.replace(/\D/g, '').slice(-10);
    return Object.values(this.load().workers).find((w) => w.phone?.replace(/\D/g, '').slice(-10) === p && w.status !== 'deleted') ?? null;
  }
  async putWorker(w: Worker) {
    await this.mutate((db) => void (db.workers[w.id] = w));
  }
  async deleteWorker(id: string) {
    await this.mutate((db) => {
      delete db.workers[id];
      db.ratings = db.ratings.filter((r) => r.workerId !== id);
      for (const [k, m] of Object.entries(db.matches)) if (m.workerId === id) delete db.matches[k];
    });
  }
  async listWorkers(near?: NearbyQuery) {
    const all = Object.values(this.load().workers).filter((w) => w.status !== 'deleted');
    if (!near) return all;
    return all.filter((w) => haversineKm(w.location, near) <= near.radiusKm * 1.5);
  }

  async getJob(id: string) {
    return this.load().jobs[id] ?? null;
  }
  async putJob(j: Job) {
    await this.mutate((db) => void (db.jobs[j.id] = j));
  }
  async listJobs(opts: { limit?: number; near?: NearbyQuery } = {}) {
    let jobs = Object.values(this.load().jobs).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const near = opts.near;
    if (near) jobs = jobs.filter((j) => haversineKm(j.location, near) <= near.radiusKm);
    return jobs.slice(0, opts.limit ?? 100);
  }

  async putMatches(ms: Match[]) {
    await this.mutate((db) => ms.forEach((m) => (db.matches[m.id] = m)));
  }
  async getMatch(id: string) {
    return this.load().matches[id] ?? null;
  }
  async updateMatch(id: string, patch: Partial<Match>) {
    return this.mutate((db) => {
      const cur = db.matches[id];
      if (!cur) return null;
      const next = { ...cur, ...patch, id: cur.id };
      db.matches[id] = next;
      return next;
    });
  }
  async listMatchesForJob(jobId: string) {
    return Object.values(this.load().matches)
      .filter((m) => m.jobId === jobId)
      .sort((a, b) => a.rank - b.rank);
  }
  async listMatchesForWorker(workerId: string) {
    return Object.values(this.load().matches)
      .filter((m) => m.workerId === workerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addRating(r: Rating) {
    await this.mutate((db) => void db.ratings.push(r));
  }
  async listRatings(workerId: string) {
    return this.load()
      .ratings.filter((r) => r.workerId === workerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addEvent(e: FeedEvent) {
    await this.mutate((db) => {
      db.events.push(e);
      if (db.events.length > MAX_EVENTS) db.events = db.events.slice(-MAX_EVENTS);
    });
  }
  async listEvents(opts: { since?: string; limit?: number } = {}) {
    let ev = [...this.load().events].sort((a, b) => b.at.localeCompare(a.at));
    const since = opts.since;
    if (since) ev = ev.filter((e) => e.at > since);
    return ev.slice(0, opts.limit ?? 50);
  }

  async getSession(chatId: string) {
    return this.load().sessions[chatId] ?? null;
  }
  async putSession(chatId: string, data: Record<string, unknown>) {
    await this.mutate((db) => void (db.sessions[chatId] = data));
  }
}
