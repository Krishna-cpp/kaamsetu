/**
 * AWS Lambda entry points (API Gateway HTTP API, payload v2):
 *   POST /telegram        → Telegram webhook
 *   POST /agent/{tool}    → ElevenLabs Conversational AI server tools
 */
import { getCtx, handleUpdate, runAgentTool, runBenefitReminders, type TgUpdate, type ToolName } from '@kaamsetu/core/server';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function parseBody(event: APIGatewayProxyEventV2): unknown {
  if (!event.body) return {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

const header = (e: APIGatewayProxyEventV2, name: string) => e.headers[name] ?? e.headers[name.toLowerCase()];

export async function telegram(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const ctx = getCtx();
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && header(event, 'x-telegram-bot-api-secret-token') !== secret) return json(401, { ok: false });
  await handleUpdate(ctx, parseBody(event) as TgUpdate);
  // Always 200 so Telegram doesn't retry a poisoned update forever
  return json(200, { ok: true });
}

/**
 * POST /telegram/setup (header x-kaamsetu-secret: AGENT_TOOL_SECRET)
 * Registers this API as the bot's webhook and sets the command menu, calling Telegram from AWS.
 * (Telegram can throttle a developer's local IP; the Lambda's egress IP is unaffected.)
 */
export async function telegramSetup(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const ctx = getCtx();
  if (!ctx.env.AGENT_TOOL_SECRET || header(event, 'x-kaamsetu-secret') !== ctx.env.AGENT_TOOL_SECRET) return json(401, { error: 'unauthorized' });
  const token = ctx.env.TELEGRAM_BOT_TOKEN;
  if (!token) return json(400, { error: 'TELEGRAM_BOT_TOKEN not configured' });
  const url = `https://${event.requestContext.domainName}/telegram`;
  const tg = async (method: string, body: unknown): Promise<unknown> => {
    const t0 = Date.now();
    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      return { ms: Date.now() - t0, status: r.status, body: (await r.json()) as unknown };
    } catch (e) {
      const err = e as Error & { cause?: { code?: string } };
      return { ms: Date.now() - t0, error: `${err.name}: ${err.message} ${err.cause?.code ?? ''}`.trim() };
    }
  };
  const probe = await fetch('https://api.telegram.org/', { signal: AbortSignal.timeout(5000) })
    .then((r) => `reachable ${r.status}`)
    .catch((e: Error) => `unreachable: ${e.message}`);
  const me = await tg('getMe', {});
  const webhook = await tg('setWebhook', {
    url,
    secret_token: ctx.env.TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  const commands = await tg('setMyCommands', {
    commands: [
      { command: 'start', description: 'Start / शुरू करें / सुरू करा' },
      { command: 'jobs', description: 'Work near me / पास में काम' },
      { command: 'profile', description: 'My KaamSetu ID' },
      { command: 'lang', description: 'Change language / भाषा' },
      ...(ctx.env.FEATURE_SCHEMES ? [{ command: 'benefits', description: 'My benefits / मेरी योजनाएँ' }] : []),
      { command: 'delete', description: 'Delete my data / मेरा डेटा हटाओ' },
    ],
  });
  const info = await tg('getWebhookInfo', {});
  return json(200, { url, probe, me, webhook, commands, info });
}

const TOOLS: ToolName[] = ['register_worker', 'find_jobs_near_me', 'accept_job', 'check_benefits'];

export async function agentTool(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const ctx = getCtx();
  const secret = ctx.env.AGENT_TOOL_SECRET;
  if (secret && header(event, 'x-kaamsetu-secret') !== secret) return json(401, { error: 'unauthorized' });
  const tool = event.pathParameters?.tool as ToolName | undefined;
  if (!tool || !TOOLS.includes(tool)) return json(404, { error: 'unknown_tool' });
  try {
    return json(200, await runAgentTool(ctx, tool, parseBody(event)));
  } catch (e) {
    console.error('[agent-tool]', tool, e);
    return json(200, { ok: false, message: 'Something went wrong. Please try again.' });
  }
}

/** EventBridge Scheduler (daily): renewal reminders for workers who opted in to the Scheme Finder. */
export async function benefitsReminders(): Promise<{ checked: number; sent: number }> {
  const res = await runBenefitReminders(getCtx());
  console.log('[benefits-reminders]', JSON.stringify(res));
  return res;
}
