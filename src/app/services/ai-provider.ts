import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';
import { getModelConfig, parseModelKey, DEFAULT_MODEL } from '@/app/config/models';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { CerebrasProvider } from './providers/cerebras';
import { DeepSeekProvider } from './providers/deepseek';
import { GroqProvider } from './providers/groq';
import { MistralProvider } from './providers/mistral';
import { HuggingFaceProvider } from './providers/huggingface';
import { OpenRouterProvider } from './providers/openrouter';

export class AIProviderError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryAfter?: number,
    public quotaExceeded?: boolean
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export function isRateLimitError(error: any): error is RateLimitError {
  return (
    error?.status === 429 ||
    error?.status === 402 || // Insufficient Balance / Payment Required
    error?.quotaExceeded === true ||
    (typeof error?.message === 'string' &&
      (error.message.includes('429') ||
        error.message.includes('402') ||
        error.message.includes('quota') ||
        error.message.includes('rate limit') ||
        error.message.includes('Insufficient Balance') ||
        error.message.includes('insufficient balance') ||
        error.message.includes('payment required')))
  );
}

// Check if error indicates model is unavailable (should trigger fallback)
export function isModelUnavailableError(error: any): boolean {
  const status = error?.status || error?.response?.status;
  
  // 404 = model not found, 403 = forbidden (model not available), 400 = bad request (invalid model)
  if (status === 404 || status === 403 || status === 400) {
    return true;
  }
  
  // Check error message for model availability issues
  const message = error?.message || '';
  if (
    typeof message === 'string' &&
    (message.includes('404') ||
      message.includes('not found') ||
      message.includes('model not found') ||
      message.includes('invalid model') ||
      message.includes('model unavailable'))
  ) {
    return true;
  }
  
  return false;
}

export function createProvider(
  provider: string,
  modelId: string,
  apiKey?: string
): AIProvider {
  switch (provider) {
    case 'gemini':
      return new GeminiProvider(modelId, apiKey);
    case 'openai':
      return new OpenAIProvider(modelId, apiKey);
    case 'anthropic':
      return new AnthropicProvider(modelId, apiKey);
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
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export async function getModelProvider(
  modelKey?: string,
  sessionApiKeys?: Record<string, string>
): Promise<AIProvider> {
  const model = modelKey || DEFAULT_MODEL;
  const config = getModelConfig(model);

  if (!config) {
    throw new Error(`Model not found: ${model}`);
  }

  const { provider, modelId } = parseModelKey(model);

  // Check for user-provided API key first, then environment variable
  let apiKey: string | undefined;
  if (sessionApiKeys?.[provider]) {
    apiKey = sessionApiKeys[provider];
  } else if (config.apiKeyEnvVar) {
    apiKey = process.env[config.apiKeyEnvVar];
  }

  if (config.requiresApiKey && !apiKey) {
    throw new Error(
      `API key required for ${provider}. Set ${config.apiKeyEnvVar} environment variable or provide via session.`
    );
  }

  return createProvider(provider, modelId, apiKey);
}

export async function generateContentWithFallback(
  prompt: string | string[],
  modelKey?: string,
  options?: ModelOptions,
  sessionApiKeys?: Record<string, string>,
  fallbackModels?: string[]
): Promise<GenerateContentResult> {
  // DISABLED: Automatic fallback is disabled - fail immediately with clear error
  const model = modelKey || DEFAULT_MODEL;
  
  try {
    const provider = await getModelProvider(model, sessionApiKeys);
    
    if (!provider.isAvailable()) {
      const error = new Error(`Model ${model} is not available. Please check your API key configuration.`);
      console.error(`[Model Error] ${model} is not available`);
      throw error;
    }

    console.log(`[Model Selection] Using model: ${model}`);
    const result = await provider.generateContent(prompt, options);
    console.log(`[Model Success] Successfully generated content with ${model}`);
    return result;
  } catch (error: any) {
    // Log detailed error information
    const status = error?.status || error?.response?.status;
    const errorMessage = error?.message || 'Unknown error';
    
    console.error(`[Model Error] Error with ${model}:`, {
      status,
      message: errorMessage,
      error: error
    });

    // Enhance error message with helpful suggestions
    let enhancedMessage = errorMessage;
    
    if (status === 404 || isModelUnavailableError(error)) {
      enhancedMessage = `Model "${model}" not found or unavailable. Please check:\n- The model name is correct\n- Your API key has access to this model\n- Try selecting a different model from the settings`;
    } else if (status === 401 || status === 403) {
      enhancedMessage = `Authentication failed for model "${model}". Please check:\n- Your API key is correct and valid\n- Your API key has the necessary permissions\n- The API key environment variable is set correctly`;
    } else if (isRateLimitError(error)) {
      const retryAfter = error?.retryAfter || 30;
      enhancedMessage = `Rate limit or quota exceeded for model "${model}". Please:\n- Wait ${retryAfter} seconds before trying again\n- Check your API usage limits\n- Consider upgrading your API plan or switching to a different model`;
    } else if (status === 500 || status === 502 || status === 503) {
      enhancedMessage = `Service error with model "${model}". Please:\n- Try again in a few moments\n- Check the service status\n- Consider switching to a different model`;
    } else {
      enhancedMessage = `Error with model "${model}": ${errorMessage}\n\nPlease:\n- Check your API key configuration\n- Verify the model is available\n- Try selecting a different model from the settings`;
    }

    // Create enhanced error with suggestions
    const enhancedError = new Error(enhancedMessage);
    (enhancedError as any).originalError = error;
    (enhancedError as any).model = model;
    (enhancedError as any).status = status;
    (enhancedError as any).suggestions = {
      checkApiKey: true,
      switchModel: true,
      retryAfter: isRateLimitError(error) ? (error?.retryAfter || 30) : undefined
    };
    
    throw enhancedError;
  }
}

