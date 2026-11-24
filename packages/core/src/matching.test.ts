import { describe, expect, it } from 'vitest';
import { geohashEncode, geohashWithNeighbours, haversineKm } from './geo';
import {
  availabilityScore,
  kaamScore,
  proximityScore,
  rankWorkers,
  scoreWorker,
  trustScore,
  wageFitScore,
  WEIGHTS,
} from './matching';
import type { Job, Worker } from './schemas';
import { skillAffinity } from './skills';

const BANER = { lat: 18.559, lng: 73.7868 };
const AUNDH = { lat: 18.5602, lng: 73.8079 }; // ~2.2 km from Baner
const HADAPSAR = { lat: 18.5089, lng: 73.926 }; // ~16 km from Baner

function worker(over: Partial<Worker> = {}): Worker {
  return {
    id: 'w_test',
    name: 'Ramesh Pawar',
    phone: null,
    channel: 'seed',
    chatId: null,
    language: 'hi',
    skills: ['painter'],
    experienceYears: 5,
    locality: 'Aundh',
    location: AUNDH,
    geohash: geohashEncode(AUNDH.lat, AUNDH.lng),
    expectedWage: 800,
    availability: 'available',
    availableFrom: null,
    stats: { jobsCompleted: 10, ratingAvg: 4.6, ratingCount: 9, completionRate: 0.9 },
    verified: true,
    status: 'active',
    introTranscript: null,
    introAudioUrl: null,
    consentAt: null,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  };
}

const job: Pick<Job, 'skill' | 'location' | 'radiusKm' | 'wagePerDay' | 'startDate'> = {
  skill: 'painter',
  location: BANER,
  radiusKm: 8,
  wagePerDay: 900,
  startDate: '2026-11-25',
};

describe('weights', () => {
  it('sum to 1', () => {
    expect(Object.values(WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
  });
});

describe('component scores', () => {
  it('proximity decays linearly and clamps', () => {
    expect(proximityScore(0, 8)).toBe(1);
    expect(proximityScore(4, 8)).toBeCloseTo(0.5);
    expect(proximityScore(8, 8)).toBe(0);
    expect(proximityScore(20, 8)).toBe(0);
    expect(proximityScore(1, 0)).toBe(0);
  });

  it('wage fit is 1 at or below the offer and decays above it', () => {
    expect(wageFitScore(700, 900)).toBe(1);
    expect(wageFitScore(900, 900)).toBe(1);
    expect(wageFitScore(1080, 900)).toBeCloseTo(0.5); // 20% over → half
    expect(wageFitScore(2000, 900)).toBe(0);
    expect(wageFitScore(500, 0)).toBe(0);
  });

  it('skill graph gives exact=1, related=partial, unrelated=0', () => {
    expect(skillAffinity(['painter'], 'painter').score).toBe(1);
    expect(skillAffinity(['mason'], 'painter').score).toBe(0.6);
    expect(skillAffinity(['driver'], 'painter').score).toBe(0);
    expect(skillAffinity(['driver', 'mason'], 'painter')).toEqual({ score: 0.6, via: 'mason' });
  });

  it('trust rewards volume over a single lucky rating', () => {
    const lucky = trustScore({ jobsCompleted: 1, ratingAvg: 5, ratingCount: 1, completionRate: 1 }, false);
    const proven = trustScore({ jobsCompleted: 40, ratingAvg: 4.8, ratingCount: 38, completionRate: 0.97 }, true);
    expect(proven).toBeGreaterThan(lucky);
    expect(kaamScore({ jobsCompleted: 0, ratingAvg: 0, ratingCount: 0, completionRate: 0 }, false)).toBeGreaterThan(0);
  });

  it('availability handles busy and future dates', () => {
    expect(availabilityScore({ availability: 'available', availableFrom: null }, '2026-11-25')).toBe(1);
    expect(availabilityScore({ availability: 'busy', availableFrom: null }, '2026-11-25')).toBe(0);
    expect(availabilityScore({ availability: 'busy', availableFrom: '2026-11-26' }, '2026-11-25')).toBe(0.4);
    expect(availabilityScore({ availability: 'busy', availableFrom: '2026-12-25' }, '2026-11-25')).toBe(0);
    expect(availabilityScore({ availability: 'available', availableFrom: '2026-11-20' }, '2026-11-25')).toBe(1);
  });
});

describe('scoreWorker', () => {
  it('produces a 0–100 score and a readable why', () => {
    const s = scoreWorker(worker(), job);
    expect(s.score).toBeGreaterThan(70);
    expect(s.score).toBeLessThanOrEqual(100);
    expect(s.why).toMatch(/^Painter · 2\.\d km away · asks ₹800 \(you offer ₹900\) · 4\.6★ from 10 jobs$/);
  });

  it('explains related skills and wage gaps', () => {
    const s = scoreWorker(worker({ skills: ['mason'], expectedWage: 1000, stats: { jobsCompleted: 0, ratingAvg: 0, ratingCount: 0, completionRate: 0 } }), job);
    expect(s.why).toContain('Mason (related to painter)');
    expect(s.why).toContain('₹100 above your offer');
    expect(s.why).toContain('new on KaamSetu');
  });

  it('a perfect worker on the spot scores 100', () => {
    const s = scoreWorker(
      worker({ location: BANER, expectedWage: 500, stats: { jobsCompleted: 200, ratingAvg: 5, ratingCount: 2000, completionRate: 1 } }),
      job,
    );
    expect(s.score).toBeGreaterThan(99);
  });
});

describe('rankWorkers', () => {
  const pool: Worker[] = [
    worker({ id: 'near-exact' }),
    worker({ id: 'far', location: HADAPSAR }),
    worker({ id: 'related', skills: ['mason'] }),
    worker({ id: 'unrelated', skills: ['driver'] }),
    worker({ id: 'pending', status: 'pending' }),
    worker({ id: 'expensive', expectedWage: 1400 }),
  ];

  it('excludes unrelated skills, inactive workers and workers too far away', () => {
    const ids = rankWorkers(pool, job).map((s) => s.worker.id);
    expect(ids).not.toContain('unrelated');
    expect(ids).not.toContain('pending');
    expect(ids).not.toContain('far');
  });

  it('orders exact > expensive-exact > related', () => {
    const ids = rankWorkers(pool, job).map((s) => s.worker.id);
    expect(ids[0]).toBe('near-exact');
    expect(ids.indexOf('related')).toBeGreaterThan(ids.indexOf('near-exact'));
  });

  it('respects limit and handles empty input', () => {
    expect(rankWorkers(pool, job, { limit: 1 })).toHaveLength(1);
    expect(rankWorkers([], job)).toEqual([]);
  });

  it('is deterministic for ties', () => {
    const a = worker({ id: 'a' });
    const b = worker({ id: 'b' });
    expect(rankWorkers([b, a], job).map((s) => s.worker.id)).toEqual(['a', 'b']);
  });
});

describe('geo', () => {
  it('haversine is sane', () => {
    expect(haversineKm(BANER, BANER)).toBe(0);
    expect(haversineKm(BANER, AUNDH)).toBeGreaterThan(2);
    expect(haversineKm(BANER, AUNDH)).toBeLessThan(2.6);
  });
  it('geohash neighbours returns 9 distinct cells around Pune', () => {
    const cells = geohashWithNeighbours(geohashEncode(BANER.lat, BANER.lng, 4));
    expect(cells).toHaveLength(9);
    expect(cells).toContain(geohashEncode(BANER.lat, BANER.lng, 4));
  });
});
