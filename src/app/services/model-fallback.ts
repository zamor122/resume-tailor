import { getModelProvider, generateContentWithFallback, isRateLimitError } from './ai-provider';
import { ModelOptions, GenerateContentResult } from '@/app/types/model';
import { FALLBACK_MODELS, DEFAULT_MODEL } from '@/app/config/models';

export interface FallbackOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackModels?: string[];
}

export async function generateWithFallback(
  prompt: string | string[],
  modelKey?: string,
  options?: ModelOptions,
  sessionApiKeys?: Record<string, string>,
  fallbackOptions?: FallbackOptions
): Promise<GenerateContentResult> {
  const fallbackModels = fallbackOptions?.fallbackModels || FALLBACK_MODELS;
  
  try {
    return await generateContentWithFallback(
      prompt,
      modelKey,
      options,
      sessionApiKeys,
      fallbackModels
    );
  } catch (error: any) {
    // If all models failed, throw the error
    throw error;
  }
}

export async function checkModelAvailability(
  modelKey: string,
  sessionApiKeys?: Record<string, string>
): Promise<boolean> {
  try {
    const provider = await getModelProvider(modelKey, sessionApiKeys);
    return provider.isAvailable();
  } catch {
    return false;
  }
}

export async function getBestAvailableModel(
  preferredModel?: string,
  sessionApiKeys?: Record<string, string>
): Promise<string> {
  const modelsToCheck = [
    preferredModel,
    DEFAULT_MODEL,
    ...FALLBACK_MODELS,
  ].filter(Boolean) as string[];

  for (const model of modelsToCheck) {
    if (await checkModelAvailability(model, sessionApiKeys)) {
      return model;
    }
  }

  // If no models are available, return default anyway
  return DEFAULT_MODEL;
}

