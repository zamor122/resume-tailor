import type { AIProvider, ModelOptions, GenerateContentResult } from '@/app/types/model';
import { parseModelKey, getModelConfig, DEFAULT_MODEL, FALLBACK_MODELS } from '@/app/config/models';
import { checkPayGate } from '@/app/runtime/cost-guard';
import type { CostPolicy } from '@/app/runtime/types';
import { isRateLimitError as checkRateLimit } from './error-utils';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { CerebrasProvider } from './providers/cerebras';
import { DeepSeekProvider } from './providers/deepseek';
import { GroqProvider } from './providers/groq';
import { MistralProvider } from './providers/mistral';
import { HuggingFaceProvider } from './providers/huggingface';
import { OpenRouterProvider } from './providers/openrouter';
import { ClineProvider } from './providers/cline';
import { stripModelThinking } from '@/app/utils/stripModelThinking';

export { isRateLimitError, isModelUnavailableError } from './error-utils';

export class AIProviderError extends Error {
  status?: number;
  retryAfter?: number;
  quotaExceeded?: boolean;

  constructor(
    message: string,
    status?: number,
    retryAfter?: number,
    quotaExceeded?: boolean
  ) {
    super(message);
    this.name = 'AIProviderError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.quotaExceeded = quotaExceeded;
  }
}

export function createProvider(
  provider: string,
  modelId: string,
  apiKey?: string
): AIProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(modelId, apiKey);
    case 'anthropic':
      return new AnthropicProvider(modelId, apiKey);
    case 'gemini':
      return new GeminiProvider(modelId, apiKey);
    case 'cerebras':
      return new CerebrasProvider(modelId, apiKey);
    case 'deepseek':
      return new DeepSeekProvider(modelId, apiKey);
    case 'groq':
      return new GroqProvider(modelId, apiKey);
    case 'mistral':
      return new MistralProvider(modelId, apiKey);
    case 'huggingface':
      return new HuggingFaceProvider(modelId, apiKey);
    case 'openrouter':
      return new OpenRouterProvider(modelId, apiKey);
    case 'cline':
      return new ClineProvider(modelId, apiKey);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function getModelProvider(
  modelKey?: string,
  sessionApiKeys?: Record<string, string>
): Promise<AIProvider> {
  const key = modelKey || DEFAULT_MODEL;
  const config = getModelConfig(key);
  if (!config) {
    throw new Error(`Unknown model: ${key}`);
  }
  const { provider, modelId } = parseModelKey(key);
  const apiKey =
    sessionApiKeys?.[config.apiKeyEnvVar || ''] ||
    (config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : undefined);
  return createProvider(provider, modelId, apiKey as string | undefined);
}

export async function generateContentWithFallback(
  prompt: string | string[],
  modelKey?: string,
  options?: ModelOptions,
  sessionApiKeys?: Record<string, string>,
  fallbackModels?: string[]
): Promise<GenerateContentResult> {
  const modelsToTry = [
    modelKey,
    DEFAULT_MODEL,
    ...(fallbackModels || FALLBACK_MODELS),
    'gemini:gemini-2.5-flash',
    'gemini:gemini-1.5-flash',
    'groq:llama-3.3-70b-versatile',
    'groq:openai/gpt-oss-120b',
    // NOTE: deliberately no paid provider in this default tail — the cost guard
    // below is what decides whether a paid model may ever be attempted.
  ].filter(Boolean) as string[];

  // Deduplicate while preserving priority order, then enforce the cost policy.
  //
  // Cost guard (AUDIT.md F10): applied at this single choke point, so it covers
  // the agent path and every API route — not just the runtime executor. A caller
  // that supplies its own API keys has opted in to paid models; otherwise the
  // policy is zero-cost, so a stray OPENAI_API_KEY (or similar) in the
  // environment can never silently buy inference. Free and penny models always
  // pass; penny models additionally require their server-side key.
  const costPolicy: CostPolicy =
    sessionApiKeys && Object.keys(sessionApiKeys).length > 0 ? 'paid' : 'free';

  const uniqueModels = Array.from(new Set(modelsToTry)).filter(
    (model) => checkPayGate(model, costPolicy, sessionApiKeys).allowed
  );

  let lastError: unknown = null;

  for (const model of uniqueModels) {
    try {
      const config = getModelConfig(model);
      if (!config) continue;

      // Skip models requiring an API key when neither session nor environment has the key
      if (config.requiresApiKey && config.apiKeyEnvVar) {
        const hasKey = !!(sessionApiKeys?.[config.apiKeyEnvVar] || process.env[config.apiKeyEnvVar]);
        if (!hasKey) {
          continue;
        }
      }

      const provider = await getModelProvider(model, sessionApiKeys);
      if (!provider.isAvailable()) {
        continue;
      }
      const result = await provider.generateContent(prompt, options);
      return {
        ...result,
        text: stripModelThinking(result.text),
      };
    } catch (err) {
      console.warn(`[AIProvider] Model ${model} failed, falling back to next provider:`, err instanceof Error ? err.message : err);
      lastError = err;
      // Continue loop to attempt next provider
    }
  }

  throw lastError || new Error('All configured AI models failed to respond.');
}
