import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Env } from '../config';
import { findRepoRoot } from '../config';

/** Blob storage for audio (TTS cache, voice notes) and photos. */
export interface StorageAdapter {
  readonly name: 'local' | 's3';
  put(key: string, data: Uint8Array, contentType: string): Promise<string>;
  get(key: string): Promise<Uint8Array | null>;
  publicUrl(key: string): string;
}

/** Writes into apps/web/public/media so Next serves the files at /media/<key>. */
export class LocalStorage implements StorageAdapter {
  readonly name = 'local' as const;
  private dir: string;
  constructor(root = findRepoRoot() ?? process.cwd()) {
    this.dir = path.join(root, 'apps', 'web', 'public', 'media');
  }
  private file(key: string) {
    const safe = key.replace(/\.\./g, '').replace(/^\/+/, '');
    return path.join(this.dir, safe);
  }
  async put(key: string, data: Uint8Array): Promise<string> {
    const f = this.file(key);
    mkdirSync(path.dirname(f), { recursive: true });
    await writeFile(f, data);
    return this.publicUrl(key);
  }
  async get(key: string): Promise<Uint8Array | null> {
    const f = this.file(key);
    return existsSync(f) ? new Uint8Array(await readFile(f)) : null;
  }
  publicUrl(key: string) {
    return `/media/${key}`;
  }
}

export class S3Storage implements StorageAdapter {
  readonly name = 's3' as const;
  private s3: S3Client;
  constructor(
    private bucket: string,
    region: string,
    private publicBase: string,
  ) {
    this.s3 = new S3Client({ region });
  }
  async put(key: string, data: Uint8Array, contentType: string): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: contentType, CacheControl: 'public, max-age=31536000, immutable' }),
    );
    return this.publicUrl(key);
  }
  async get(key: string): Promise<Uint8Array | null> {
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      return res.Body ? await res.Body.transformToByteArray() : null;
    } catch {
      return null;
    }
  }
  publicUrl(key: string) {
    return `${this.publicBase.replace(/\/$/, '')}/${key}`;
  }
}

export function createStorage(env: Env): StorageAdapter {
  if (env.STORAGE === 's3' && env.S3_BUCKET) {
    return new S3Storage(env.S3_BUCKET, env.AWS_REGION, env.S3_PUBLIC_BASE_URL ?? `https://${env.S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`);
  }
  return new LocalStorage();
}
