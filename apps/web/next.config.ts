import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

// Single source of truth: the repo-root .env
const root = path.resolve(__dirname, '../..');
loadEnvConfig(root);

// Next loads (and caches) apps/web/.env* before this file runs, so the call above is a no-op for client
// NEXT_PUBLIC_* inlining. Read the Scheme Finder client flag from the root .env explicitly so the browser
// bundle matches the server render.
function rootEnv(name: string): string | undefined {
  if (process.env[name] !== undefined) return process.env[name];
  try {
    return parseEnv(readFileSync(path.join(root, '.env'), 'utf8'))[name];
  } catch {
    return undefined;
  }
}

const config: NextConfig = {
  env: { NEXT_PUBLIC_FEATURE_SCHEMES: rootEnv('NEXT_PUBLIC_FEATURE_SCHEMES') === 'true' ? 'true' : 'false' },
  reactStrictMode: true,
  transpilePackages: ['@kaamsetu/core'],
  outputFileTracingRoot: root,
  serverExternalPackages: [
    '@aws-sdk/client-bedrock-runtime',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-geo-places',
  ],
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
  poweredByHeader: false,
  // lets a production build (e.g. for Lighthouse) live next to a running dev server
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default config;
