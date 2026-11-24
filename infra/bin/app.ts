#!/usr/bin/env node
/**
 * KaamSetu AWS infrastructure (CDK).
 *   cd infra
 *   npx cdk bootstrap --profile meteora
 *   npx cdk deploy --profile meteora                 # API + Lambdas + DynamoDB + S3 + CloudWatch
 *   (PowerShell) $env:GITHUB_TOKEN = gh auth token; npx cdk deploy --profile meteora   # + Amplify Hosting
 * Reads configuration from the repo-root .env.
 */
import * as cdk from 'aws-cdk-lib';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { KaamSetuStack } from '../lib/kaamsetu-stack';

const envFile = path.resolve(__dirname, '../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const config = Object.fromEntries(Object.entries(process.env).filter((e): e is [string, string] => typeof e[1] === 'string' && e[1] !== ''));

const app = new cdk.App();
new KaamSetuStack(app, 'KaamSetu', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.AWS_REGION || 'ap-south-1' },
  config,
  githubRepo: process.env.GITHUB_REPO || 'Krishna-cpp/kaamsetu',
  githubToken: process.env.GITHUB_TOKEN,
  description: 'KaamSetu: voice-first hyper-local job matching (Devnovate 2026, Team Meteora)',
  tags: { project: 'kaamsetu', team: 'meteora' },
});
