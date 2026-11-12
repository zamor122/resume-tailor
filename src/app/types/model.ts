export interface ModelConfig {
  provider: string;
  modelId: string;
  name: string;
  freeTierLimit?: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  baseUrl?: string;
  description?: string;
}

export interface ModelPreferences {
  defaultModel: string; // Format: "provider:modelId"
  fallbackModels: string[]; // Ordered fallback list
}

export interface ModelOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  /** Gemini 2.5 reasoning budget. 0 disables thinking (see GeminiProvider). */
  thinkingBudget?: number;
}

export interface GenerateContentResult {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProvider {
  provider: string;
  generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult>;
  isAvailable(): boolean;
  getModelId(): string;
}

export interface RateLimitError {
  status: number;
  message: string;
  retryAfter?: number;
  quotaExceeded: boolean;
}





