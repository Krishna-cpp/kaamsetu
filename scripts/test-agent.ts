/**
 * End-to-end test of the "Kaam Didi" agent using ElevenLabs agent testing (simulation).
 * A simulated Hindi-speaking caller talks to the real agent; tools are NOT mocked,
 * so the agent calls our live webhooks (register_worker → find_jobs_near_me → accept_job).
 *   npm run agent:test
 */
import { getEnv } from '@kaamsetu/core/server';

const EL = 'https://api.elevenlabs.io';

async function el<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(`${EL}${path}`, {
    method,
    headers: { 'xi-api-key': getEnv().ELEVENLABS_API_KEY!, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 600)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

type Json = Record<string, unknown>;

async function main() {
  const env = getEnv();
  const agentId = env.ELEVENLABS_AGENT_ID;
  if (!env.ELEVENLABS_API_KEY || !agentId) throw new Error('ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID are required');
  const phone = `98${String(Date.now()).slice(-8)}`;

  const test = await el<{ id: string }>('/v1/convai/agent-testing/create', 'POST', {
    type: 'simulation',
    name: `KaamSetu e2e ${new Date().toISOString()}`,
    simulation_scenario:
      `You are Suresh Jadhav, a plumber who lives in Kothrud, Pune. You speak only simple Hindi, in short sentences. ` +
      `You are looking for work. Your expected wage is 750 rupees per day and your mobile number is ${phone}. ` +
      `Agree to the consent question. When jobs are read out, say you want the first one and repeat its 4-digit job code. ` +
      `After the employer's number is given, say thank you and goodbye.`,
    simulation_max_turns: 16,
    success_conditions: [
      'The agent registered the caller by calling register_worker successfully.',
      'The agent read out at least one job and the caller accepted it with accept_job.',
      'The agent told the caller the employer name or phone number.',
    ],
    tool_mock_config: { mocking_strategy: 'none' },
  });
  console.log(`test ${test.id} created; caller phone ${phone}`);

  const inv = await el<{ id: string }>(`/v1/convai/agents/${agentId}/run-tests`, 'POST', { tests: [{ test_id: test.id }] });
  console.log(`invocation ${inv.id} running…`);

  let result: Json = {};
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    result = await el<Json>(`/v1/convai/test-invocations/${inv.id}`, 'GET');
    const runs = (result.test_runs as Json[] | undefined) ?? [];
    if (runs.length && runs.every((r) => !['pending', 'running'].includes(String(r.status)))) break;
  }

  for (const run of (result.test_runs as Json[] | undefined) ?? []) {
    console.log(`\nstatus: ${String(run.status)}`);
    const resp = (run.agent_responses ?? run.conversation ?? run.simulated_conversation) as Json[] | undefined;
    for (const t of resp ?? []) {
      const who = t.role === 'agent' ? 'DIDI' : 'USER';
      if (t.message) console.log(`${who}: ${String(t.message)}`);
      for (const c of (t.tool_calls as Json[] | undefined) ?? []) console.log(`   ⚙ ${String(c.tool_name)} ${String(c.params_as_json ?? '')}`);
      for (const c of (t.tool_results as Json[] | undefined) ?? []) console.log(`   ↩ ${String(c.result_value ?? '').slice(0, 220)}`);
    }
    const cond = run.condition_result ?? run.evaluation ?? run.result;
    if (cond) console.log('\nevaluation:', JSON.stringify(cond).slice(0, 1500));
    if (!resp) console.log(JSON.stringify(run).slice(0, 3000));
  }
}

main().catch((e: unknown) => {
  console.error((e as Error).message);
  process.exit(1);
});
