import { randomBytes } from 'node:crypto';

const ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';

export function newId(prefix: string, len = 10): string {
  const bytes = randomBytes(len);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${s}`;
}

export function jobCode(): string {
  return String(1000 + (randomBytes(2).readUInt16BE(0) % 9000));
}

export const matchId = (jobId: string, workerId: string) => `${jobId}~${workerId}`;
export function parseMatchId(id: string): { jobId: string; workerId: string } | null {
  const [jobId, workerId] = id.split('~');
  return jobId && workerId ? { jobId, workerId } : null;
}

export const nowIso = () => new Date().toISOString();
