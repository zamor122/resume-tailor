import type { AIProvider, ModelOptions, GenerateContentResult } from '@/app/types/model';
import { parseModelKey, getModelConfig } from '@/app/config/models';
import { DEFAULT_MODEL } from '@/app/config/models';
import { isRateLimitError as checkRateLimit } from './error-utils';

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
    case 'openai': {
      const { OpenAIProvider } = require('./providers/openai');
      return new OpenAIProvider(modelId, apiKey);
    }
    case 'anthropic': {
      const { AnthropicProvider } = require('./providers/anthropic');
      return new AnthropicProvider(modelId, apiKey);
    }
    case 'gemini': {
      const { GeminiProvider } = require('./providers/gemini');
      return new GeminiProvider(modelId, apiKey);
    }
    case 'cerebras': {
      const { CerebrasProvider } = require('./providers/cerebras');
      return new CerebrasProvider(modelId, apiKey);
    }
    case 'deepseek': {
      const { DeepSeekProvider } = require('./providers/deepseek');
      return new DeepSeekProvider(modelId, apiKey);
    }
    case 'groq': {
      const { GroqProvider } = require('./providers/groq');
      return new GroqProvider(modelId, apiKey);
    }
    case 'mistral': {
      const { MistralProvider } = require('./providers/mistral');
      return new MistralProvider(modelId, apiKey);
    }
    case 'huggingface': {
      const { HuggingFaceProvider } = require('./providers/huggingface');
      return new HuggingFaceProvider(modelId, apiKey);
    }
    case 'openrouter': {
      const { OpenRouterProvider } = require('./providers/openrouter');
      return new OpenRouterProvider(modelId, apiKey);
    }
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
    ...(fallbackModels || []),
  ].filter(Boolean) as string[];

  let lastError: unknown = null;

  for (const model of modelsToTry) {
    try {
      const provider = await getModelProvider(model, sessionApiKeys);
      return await provider.generateContent(prompt, options);
    } catch (err) {
      lastError = err;
      if (checkRateLimit(err)) {
        throw err;
      }
    }
  }

  throw lastError || new Error('All models failed');
}
