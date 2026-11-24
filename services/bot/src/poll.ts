/**
 * Local Telegram bot runner (long-polling). Same handler as the Lambda webhook.
 *   npm run bot
 */
import { getCtx, handleUpdate, integrationStatus, TelegramChannel, type TgUpdate } from '@kaamsetu/core/server';

const ctx = getCtx();
const token = ctx.env.TELEGRAM_BOT_TOKEN;

if (!token || ctx.env.DEMO_MODE) {
  console.error('TELEGRAM_BOT_TOKEN is not set (or DEMO_MODE=true). Add it to .env at the repo root, then run `npm run bot` again.');
  process.exit(1);
}

const tg = new TelegramChannel(token);
let offset = 0;
let running = true;

process.on('SIGINT', () => {
  running = false;
  console.log('\nStopping…');
  setTimeout(() => process.exit(0), 300);
});

/** Retry Telegram calls that hit 429 (respects "retry after N"). */
async function withRetry<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e) {
      const m = /retry after (\d+)/i.exec((e as Error).message);
      if (!m || i >= tries) throw e;
      const wait = Number(m[1]) + 1;
      console.log(`Telegram rate limit, waiting ${wait}s…`);
      await new Promise((r) => setTimeout(r, wait * 1000));
    }
  }
}

async function main() {
  const me = await withRetry(() => tg.call<{ username: string }>('getMe', {}), Infinity);
  // Long-polling and webhooks are mutually exclusive; drop any webhook while developing locally.
  await withRetry(() => tg.call('deleteWebhook', { drop_pending_updates: false }));
  await withRetry(() => tg.call('setMyCommands', {
    commands: [
      { command: 'start', description: 'Start / शुरू करें / सुरू करा' },
      { command: 'jobs', description: 'Work near me / पास में काम' },
      { command: 'profile', description: 'My KaamSetu ID' },
      { command: 'lang', description: 'Change language / भाषा' },
      { command: 'delete', description: 'Delete my data / मेरा डेटा हटाओ' },
    ],
  }));
  console.log(`KaamSetu bot @${me.username} polling…`, integrationStatus());

  while (running) {
    try {
      const updates = await tg.call<TgUpdate[]>('getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });
      for (const u of updates) {
        offset = u.update_id + 1;
        const who = u.message?.from?.first_name ?? u.callback_query?.from.first_name ?? '?';
        const what = u.message?.voice ? 'voice' : u.message?.text ? `"${u.message.text.slice(0, 40)}"` : (u.callback_query?.data ?? 'update');
        console.log(`← ${who}: ${what}`);
        // don't block polling on one slow conversation
        void handleUpdate(ctx, u).catch((e: unknown) => console.error('handler error', e));
      }
    } catch (e) {
      console.error('poll error:', (e as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
