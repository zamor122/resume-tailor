/**
 * LIVE model-chain liveness probe.
 *
 * Probes every configured FREE / penny model against the real provider APIs and
 * reports OK / FAIL + latency, plus a warning when a model key's declared
 * `MODEL_CONFIGS[key].modelId` differs from the id actually sent to the provider
 * (the provider derives the id from the key string via parseModelKey, so any
 * config-level alias is dead code).
 *
 * Money safety: only free/penny providers are probed. Paid providers
 * (openai / anthropic / mistral / deepseek) and the OpenRouter aggregator are
 * never contacted here.
 *
 * Run explicitly:
 *   bash scripts/run-live-verify.sh model-probe
 */
import { describe, it } from 'vitest';
import { MODEL_CONFIGS, parseModelKey, FALLBACK_MODELS } from '@/app/config/models';
import { getModelProvider } from '@/app/services/ai-provider';

// Free / operator-funded providers only. NEVER add a paid provider here.
const FREE_PROVIDERS = new Set(['gemini', 'groq', 'cerebras', 'huggingface', 'cline']);

function pad(s: string, n = 40): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

describe('model-chain liveness probe (free/penny only)', () => {
  it('probes every configured free/penny model key', async () => {
    const inChain = new Set(FALLBACK_MODELS);
    const keys = Object.keys(MODEL_CONFIGS).filter((k) => FREE_PROVIDERS.has(k.split(':')[0]));
    const rows: string[] = [];

    for (const key of keys) {
      const cfg = MODEL_CONFIGS[key];
      const envName = cfg.apiKeyEnvVar;
      const hasKey = !!(envName && process.env[envName]);
      const parsed = parseModelKey(key);
      const alias = cfg.modelId !== parsed.modelId ? `  [ALIAS DEAD: config=${cfg.modelId} sent=${parsed.modelId}]` : '';
      const chainTag = inChain.has(key) ? ' [in FALLBACK_MODELS]' : '';

      if (cfg.requiresApiKey && !hasKey) {
        rows.push(`${pad(key)} SKIP   no ${envName}${chainTag}${alias}`);
        continue;
      }

      const t0 = Date.now();
      try {
        const provider = await getModelProvider(key);
        const res = await provider.generateContent('Reply with exactly: OK');
        const ms = Date.now() - t0;
        rows.push(`${pad(key)} OK     ${String(ms).padStart(6)}ms  -> ${JSON.stringify(String(res.text ?? '').slice(0, 40))}${chainTag}${alias}`);
      } catch (e: unknown) {
        const ms = Date.now() - t0;
        const msg = e instanceof Error ? e.message : String(e);
        rows.push(`${pad(key)} FAIL   ${String(ms).padStart(6)}ms  -> ${msg.slice(0, 160)}${chainTag}${alias}`);
      }
    }

    console.log('\n===== MODEL PROBE =====\n' + rows.join('\n') + '\n===== END PROBE =====\n');
  }, 300_000);
});
