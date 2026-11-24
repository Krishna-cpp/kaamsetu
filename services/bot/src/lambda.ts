/**
 * AWS Lambda entry points (API Gateway HTTP API, payload v2):
 *   POST /telegram        → Telegram webhook
 *   POST /agent/{tool}    → ElevenLabs Conversational AI server tools
 */
import { getCtx, handleUpdate, runAgentTool, type TgUpdate, type ToolName } from '@kaamsetu/core/server';
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

const TOOLS: ToolName[] = ['register_worker', 'find_jobs_near_me', 'accept_job'];

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
