import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';
import path from 'node:path';

// Single source of truth: the repo-root .env
const root = path.resolve(__dirname, '../..');
loadEnvConfig(root);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@kaamsetu/core'],
  outputFileTracingRoot: root,
  serverExternalPackages: ['@aws-sdk/client-bedrock-runtime', '@aws-sdk/client-dynamodb', '@aws-sdk/lib-dynamodb', '@aws-sdk/client-s3', '@aws-sdk/client-geo-places'],
  experimental: { optimizePackageImports: ['lucide-react', 'framer-motion'] },
  poweredByHeader: false,
  // lets a production build (e.g. for Lighthouse) live next to a running dev server
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default config;
