import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';
import path from 'node:path';

export interface KaamSetuProps extends cdk.StackProps {
  /** Values from the repo-root .env, passed to Lambdas / Amplify */
  config: Record<string, string>;
  githubRepo?: string;
  githubToken?: string;
}

const ROOT = path.resolve(__dirname, '../..');

export class KaamSetuStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KaamSetuProps) {
    super(scope, id, props);
    const c = props.config;

    /* ── DynamoDB: single table + 3 GSIs (geo cell, chat/worker lookups, type/time listings) ── */
    const table = new dynamodb.Table(this, 'Table', {
      tableName: c.DYNAMO_TABLE || 'kaamsetu',
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    for (const n of ['GSI1', 'GSI2', 'GSI3']) {
      table.addGlobalSecondaryIndex({
        indexName: n,
        partitionKey: { name: `${n}PK`, type: dynamodb.AttributeType.STRING },
        sortKey: { name: `${n}SK`, type: dynamodb.AttributeType.STRING },
      });
    }

    /* ── S3: voice notes, cached TTS, demo audio. tts/ and audio/ are publicly readable for playback ── */
    const bucket = new s3.Bucket(this, 'Media', {
      blockPublicAccess: new s3.BlockPublicAccess({ blockPublicAcls: true, ignorePublicAcls: true, blockPublicPolicy: false, restrictPublicBuckets: false }),
      cors: [{ allowedMethods: [s3.HttpMethods.GET], allowedOrigins: ['*'], allowedHeaders: ['*'] }],
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        principals: [new iam.AnyPrincipal()],
        resources: [bucket.arnForObjects('tts/*'), bucket.arnForObjects('audio/*')],
      }),
    );
    // voice/ (raw worker voice notes) stays private

    const runtimeEnv: Record<string, string> = {
      NODE_OPTIONS: '--enable-source-maps',
      STORE: 'dynamo',
      DYNAMO_TABLE: table.tableName,
      STORAGE: 's3',
      S3_BUCKET: bucket.bucketName,
      S3_PUBLIC_BASE_URL: `https://${bucket.bucketRegionalDomainName}`,
      GEO_PROVIDER: c.GEO_PROVIDER || 'aws',
      LLM_PROVIDER: c.LLM_PROVIDER || 'bedrock',
      BEDROCK_REGION: c.BEDROCK_REGION || this.region,
      BEDROCK_MODEL_ID: c.BEDROCK_MODEL_ID || 'apac.amazon.nova-pro-v1:0',
      PUBLIC_BASE_URL: c.PUBLIC_BASE_URL || '',
      ...pick(c, [
        'ELEVENLABS_API_KEY',
        'ELEVENLABS_STT_MODEL',
        'ELEVENLABS_TTS_MODEL',
        'ELEVENLABS_ALERT_MODEL',
        'ELEVENLABS_VOICE_ID_HI',
        'ELEVENLABS_VOICE_ID_MR',
        'ELEVENLABS_VOICE_ID_EN',
        'TELEGRAM_BOT_TOKEN',
        'TELEGRAM_WEBHOOK_SECRET',
        'AGENT_TOOL_SECRET',
      ]),
    };

    /* ── IAM permissions shared by Lambdas and the Amplify SSR compute role ── */
    const appPolicy = [
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream', 'bedrock:Converse', 'bedrock:ConverseStream'],
        resources: ['arn:aws:bedrock:*::foundation-model/*', `arn:aws:bedrock:*:${this.account}:inference-profile/*`],
      }),
      new iam.PolicyStatement({ actions: ['geo-places:Geocode', 'geo-places:SearchText', 'geo-places:Autocomplete'], resources: ['*'] }),
    ];

    /* ── Lambda: Telegram webhook + ElevenLabs agent tools (same core code as the web app) ── */
    const common: nodejs.NodejsFunctionProps = {
      entry: path.join(ROOT, 'services/bot/src/lambda.ts'),
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(60),
      environment: runtimeEnv,
      logRetention: logs.RetentionDays.ONE_WEEK,
      tracing: lambda.Tracing.ACTIVE,
      projectRoot: ROOT,
      depsLockFilePath: path.join(ROOT, 'package-lock.json'),
      bundling: { format: nodejs.OutputFormat.ESM, target: 'node22', minify: true, sourceMap: true, mainFields: ['module', 'main'],
        banner: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
    };
    const telegramFn = new nodejs.NodejsFunction(this, 'TelegramWebhook', { ...common, handler: 'telegram', description: 'KaamSetu Telegram webhook' });
    const agentFn = new nodejs.NodejsFunction(this, 'AgentTools', { ...common, handler: 'agentTool', description: 'KaamSetu ElevenLabs agent server tools', timeout: cdk.Duration.seconds(25) });
    for (const fn of [telegramFn, agentFn]) {
      table.grantReadWriteData(fn);
      bucket.grantReadWrite(fn);
      appPolicy.forEach((p) => fn.addToRolePolicy(p));
    }

    /* ── API Gateway (HTTP API) ── */
    const api = new apigw.HttpApi(this, 'Api', {
      apiName: 'kaamsetu',
      corsPreflight: { allowOrigins: ['*'], allowMethods: [apigw.CorsHttpMethod.POST], allowHeaders: ['content-type', 'x-kaamsetu-secret'] },
    });
    api.addRoutes({ path: '/telegram', methods: [apigw.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('Tg', telegramFn) });
    api.addRoutes({ path: '/agent/{tool}', methods: [apigw.HttpMethod.POST], integration: new integrations.HttpLambdaIntegration('Agent', agentFn) });

    /* ── Amplify Hosting (Next.js SSR, monorepo app root apps/web) ── */
    let amplifyUrl: string | undefined;
    if (props.githubRepo && props.githubToken) {
      const computeRole = new iam.Role(this, 'AmplifyComputeRole', { assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com') });
      table.grantReadWriteData(computeRole);
      bucket.grantReadWrite(computeRole);
      appPolicy.forEach((p) => computeRole.addToPolicy(p));

      const webEnv: Record<string, string> = {
        ...runtimeEnv,
        AMPLIFY_MONOREPO_APP_ROOT: 'apps/web',
        ...pick(c, ['NEXT_PUBLIC_ELEVENLABS_AGENT_ID', 'NEXT_PUBLIC_AWS_LOCATION_API_KEY', 'NEXT_PUBLIC_AWS_LOCATION_REGION', 'NEXT_PUBLIC_TELEGRAM_BOT_URL', 'ELEVENLABS_AGENT_ID']),
      };
      delete webEnv.NODE_OPTIONS;
      delete webEnv.PUBLIC_BASE_URL; // set on the branch from Amplify's own domain (below)
      webEnv.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = '1';
      const envKeys = [...Object.keys(webEnv).filter((k) => !k.startsWith('AMPLIFY_') && !k.startsWith('PLAYWRIGHT_')), 'PUBLIC_BASE_URL'];
      const buildSpec = {
        version: 1,
        applications: [
          {
            appRoot: 'apps/web',
            frontend: {
              phases: {
                preBuild: { commands: ['nvm install 20 && nvm use 20', 'node -v', 'cd ../.. && npm ci && cd apps/web'] },
                build: {
                  commands: [
                    // Amplify only exposes env vars at build time; persist the ones SSR needs.
                    `env | grep -E '^(${envKeys.join('|')})=' >> .env.production || true`,
                    'npm run build',
                  ],
                },
              },
              artifacts: { baseDirectory: '.next', files: ['**/*'] },
              cache: { paths: ['.next/cache/**/*', '../../node_modules/**/*'] },
            },
          },
        ],
      };
      const app = new amplify.CfnApp(this, 'Web', {
        name: 'kaamsetu',
        platform: 'WEB_COMPUTE',
        repository: `https://github.com/${props.githubRepo}`,
        accessToken: props.githubToken,
        computeRoleArn: computeRole.roleArn,
        buildSpec: JSON.stringify(buildSpec),
        environmentVariables: Object.entries(webEnv).map(([name, value]) => ({ name, value })),
      });
      amplifyUrl = `https://main.${app.attrDefaultDomain}`;
      new amplify.CfnBranch(this, 'Main', {
        appId: app.attrAppId,
        branchName: 'main',
        enableAutoBuild: true,
        framework: 'Next.js - SSR',
        stage: 'PRODUCTION',
        environmentVariables: [{ name: 'PUBLIC_BASE_URL', value: amplifyUrl }],
      });
      // Bot + agent links (profile URLs) point at the hosted site
      telegramFn.addEnvironment('PUBLIC_BASE_URL', amplifyUrl);
      agentFn.addEnvironment('PUBLIC_BASE_URL', amplifyUrl);
      new cdk.CfnOutput(this, 'AmplifyUrl', { value: amplifyUrl });
      new cdk.CfnOutput(this, 'AmplifyAppId', { value: app.attrAppId });
    }

    /* ── CloudWatch dashboard: what the pitch shows ── */
    const dash = new cloudwatch.Dashboard(this, 'Dashboard', { dashboardName: 'KaamSetu' });
    dash.addWidgets(
      new cloudwatch.GraphWidget({ title: 'Telegram webhook: invocations / errors', left: [telegramFn.metricInvocations(), telegramFn.metricErrors()], width: 12 }),
      new cloudwatch.GraphWidget({ title: 'Agent tools: invocations / errors', left: [agentFn.metricInvocations(), agentFn.metricErrors()], width: 12 }),
      new cloudwatch.GraphWidget({ title: 'Latency p90 (ms)', left: [telegramFn.metricDuration({ statistic: 'p90' }), agentFn.metricDuration({ statistic: 'p90' })], width: 12 }),
      new cloudwatch.GraphWidget({ title: 'DynamoDB consumed capacity', left: [table.metricConsumedReadCapacityUnits(), table.metricConsumedWriteCapacityUnits()], width: 12 }),
    );
    new cloudwatch.Alarm(this, 'TelegramErrors', {
      metric: telegramFn.metricErrors({ period: cdk.Duration.minutes(5) }),
      threshold: 3,
      evaluationPeriods: 1,
      alarmDescription: 'Telegram webhook is failing',
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'TelegramWebhookUrl', { value: `${api.apiEndpoint}/telegram` });
    new cdk.CfnOutput(this, 'AgentToolsBase', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
  }
}

function pick(src: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(keys.filter((k) => src[k]).map((k) => [k, src[k]!]));
}
