import { ModelConfig } from '@/app/types/model';

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Gemini Models
  'gemini:gemini-2.5-flash-lite': {
    provider: 'gemini',
    modelId: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    freeTierLimit: '1,000 requests/day',
    requiresApiKey: true,
    apiKeyEnvVar: 'GEMINI_API_KEY',
    description: 'Fast and efficient model for high-volume tasks',
  },
  'gemini:gemini-2.5-flash': {
    provider: 'gemini',
    modelId: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    freeTierLimit: '50 requests/day',
    requiresApiKey: true,
    apiKeyEnvVar: 'GEMINI_API_KEY',
    description: 'Balanced performance model',
  },
  'gemini:gemini-1.5-pro': {
    provider: 'gemini',
    modelId: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    freeTierLimit: 'Limited',
    requiresApiKey: true,
    apiKeyEnvVar: 'GEMINI_API_KEY',
    description: 'Advanced reasoning capabilities',
  },

  // OpenAI Models (No free tier - must bring own API key)
  'openai:gpt-4o-mini': {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    description: 'Cost-effective GPT-4 variant',
  },
  'openai:gpt-4o': {
    provider: 'openai',
    modelId: 'gpt-4o',
    name: 'GPT-4o',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    description: 'Most capable GPT-4 model',
  },
  'openai:gpt-3.5-turbo': {
    provider: 'openai',
    modelId: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    description: 'Fast and affordable option',
  },

  // Anthropic Claude Models (No free tier - must bring own API key)
  'anthropic:claude-3-5-haiku-20241022': {
    provider: 'anthropic',
    modelId: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    description: 'Fast and efficient Claude model',
  },
  'anthropic:claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    description: 'Balanced performance and capability',
  },
  'anthropic:claude-3-opus-20240229': {
    provider: 'anthropic',
    modelId: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'ANTHROPIC_API_KEY',
    description: 'Most capable Claude model',
  },

  // Cerebras Models (OpenAI-compatible) - Free tier available
  // Note: Model names may need to be verified with Cerebras API
  'cerebras:llama-3.3-70b': {
    provider: 'cerebras',
    modelId: 'llama-3.1-70b-instruct', // Using known working model name
    name: 'Llama 3.1 70B Instruct (Cerebras)',
    freeTierLimit: '1M tokens/day (High speed)',
    requiresApiKey: true,
    apiKeyEnvVar: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'High-performance Llama 3.1 model (65K context)',
  },
  'cerebras:llama3.1-8b': {
    provider: 'cerebras',
    modelId: 'llama-3.1-8b-instruct', // Using instruct variant
    name: 'Llama 3.1 8B Instruct (Cerebras)',
    freeTierLimit: '1M tokens/day (High speed)',
    requiresApiKey: true,
    apiKeyEnvVar: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'Fast Llama 3.1 model (8K context)',
  },
  'cerebras:gpt-oss-120b': {
    provider: 'cerebras',
    modelId: 'gpt-oss-120b',
    name: 'GPT-OSS 120B (Cerebras)',
    freeTierLimit: '1M tokens/day (High speed)',
    requiresApiKey: true,
    apiKeyEnvVar: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'Large GPT-OSS model (65K context)',
  },
  'cerebras:qwen-3-32b': {
    provider: 'cerebras',
    modelId: 'qwen-3-32b',
    name: 'Qwen 3 32B (Cerebras)',
    freeTierLimit: '1M tokens/day (High speed)',
    requiresApiKey: true,
    apiKeyEnvVar: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'Qwen 3 32B model (65K context)',
  },
  'cerebras:qwen-3-235b-a22b-instruct-2507': {
    provider: 'cerebras',
    modelId: 'qwen-3-235b-a22b-instruct-2507',
    name: 'Qwen 3 235B Instruct (Cerebras)',
    freeTierLimit: '1M tokens/day (High speed, Preview)',
    requiresApiKey: true,
    apiKeyEnvVar: 'CEREBRAS_API_KEY',
    baseUrl: 'https://api.cerebras.ai/v1',
    description: 'Large Qwen 3 instruct model (65K context, Preview)',
  },

  // DeepSeek Models (No free tier - must bring own API key)
  'deepseek:deepseek-chat': {
    provider: 'deepseek',
    modelId: 'deepseek-chat',
    name: 'DeepSeek Chat',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'Cost-effective chat model',
  },
  'deepseek:deepseek-coder': {
    provider: 'deepseek',
    modelId: 'deepseek-coder',
    name: 'DeepSeek Coder',
    // No freeTierLimit - no free tier available
    requiresApiKey: true,
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
    description: 'Specialized for code generation',
  },

  // Groq Models - Free tier available
  'groq:llama-3.1-70b-versatile': {
    provider: 'groq',
    modelId: 'llama-3.1-70b-versatile',
    name: 'Llama 3.1 70B (Groq) [DEPRECATED]',
    freeTierLimit: '~14.4k requests/day (Small models)',
    requiresApiKey: true,
    apiKeyEnvVar: 'GROQ_API_KEY',
    description: 'DEPRECATED - Use llama-3.3-70b-versatile instead',
    // deprecated: true, // Removed deprecated property as it's not in ModelConfig interface
  },
  'groq:llama-3.3-70b-versatile': {
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B (Groq)',
    freeTierLimit: '~14.4k requests/day (Small models)',
    requiresApiKey: true,
    apiKeyEnvVar: 'GROQ_API_KEY',
    description: 'Ultra-fast inference - Current Llama 3.3 model',
  },
  'groq:mixtral-8x7b-32768': {
    provider: 'groq',
    modelId: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (Groq)',
    freeTierLimit: '~14.4k requests/day (Small models)',
    requiresApiKey: true,
    apiKeyEnvVar: 'GROQ_API_KEY',
    description: 'Fast Mixtral model',
  },

  // Mistral Models (Evaluation - Strict limits or trial only)
  'mistral:mistral-small-latest': {
    provider: 'mistral',
    modelId: 'mistral-small-latest',
    name: 'Mistral Small',
    freeTierLimit: 'Evaluation: 1 req/sec or trial only',
    requiresApiKey: true,
    apiKeyEnvVar: 'MISTRAL_API_KEY',
    description: 'Efficient and fast',
  },
  'mistral:mistral-medium-latest': {
    provider: 'mistral',
    modelId: 'mistral-medium-latest',
    name: 'Mistral Medium',
    freeTierLimit: 'Evaluation: 1 req/sec or trial only',
    requiresApiKey: true,
    apiKeyEnvVar: 'MISTRAL_API_KEY',
    description: 'Balanced performance',
  },
  'mistral:mistral-large-latest': {
    provider: 'mistral',
    modelId: 'mistral-large-latest',
    name: 'Mistral Large',
    freeTierLimit: 'Evaluation: 1 req/sec or trial only',
    requiresApiKey: true,
    apiKeyEnvVar: 'MISTRAL_API_KEY',
    description: 'Most capable Mistral model',
  },

  // Hugging Face Models - Free tier available
  'huggingface:meta-llama/Llama-3.1-8B-Instruct': {
    provider: 'huggingface',
    modelId: 'meta-llama/Llama-3.1-8B-Instruct',
    name: 'Llama 3.1 8B (Hugging Face)',
    freeTierLimit: '~1k requests/5 min (Serverless)',
    requiresApiKey: true,
    apiKeyEnvVar: 'HUGGINGFACE_API_KEY',
    description: 'Open-source Llama model',
  },
  'huggingface:mistralai/Mistral-7B-Instruct-v0.2': {
    provider: 'huggingface',
    modelId: 'mistralai/Mistral-7B-Instruct-v0.2',
    name: 'Mistral 7B (Hugging Face)',
    freeTierLimit: '~1k requests/5 min (Serverless)',
    requiresApiKey: true,
    apiKeyEnvVar: 'HUGGINGFACE_API_KEY',
    description: 'Open-source Mistral model',
  },

  // OpenRouter Models (aggregator) - Free tier available (free models only)
  'openrouter:openai/gpt-4o-mini': {
    provider: 'openrouter',
    modelId: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini (OpenRouter)',
    freeTierLimit: '50 requests/day (Free models only)',
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    description: 'Access via OpenRouter',
  },
  'openrouter:anthropic/claude-3.5-haiku': {
    provider: 'openrouter',
    modelId: 'anthropic/claude-3.5-haiku',
    name: 'Claude 3.5 Haiku (OpenRouter)',
    freeTierLimit: '50 requests/day (Free models only)',
    requiresApiKey: true,
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    description: 'Access via OpenRouter',
  },
};

/**
 * Default model can be configured via environment variable(s).
 *
 * - Server/runtime: DEFAULT_MODEL_KEY
 * - Client/build-time: NEXT_PUBLIC_DEFAULT_MODEL_KEY
 *
 * Both should be a valid key from MODEL_CONFIGS, e.g. "cerebras:gpt-oss-120b".
 */
export const DEFAULT_MODEL =
  (process.env.NEXT_PUBLIC_DEFAULT_MODEL_KEY ||
    process.env.DEFAULT_MODEL_KEY ||
    'gemini:gemini-2.5-flash-lite') as string;

export const FALLBACK_MODELS = [
  'gemini:gemini-2.5-flash-lite',
  'openai:gpt-4o-mini',
  'anthropic:claude-3-5-haiku-20241022',
  'deepseek:deepseek-chat',
  'groq:llama-3.3-70b-versatile',
];

export function getModelConfig(modelKey: string): ModelConfig | undefined {
  return MODEL_CONFIGS[modelKey];
}

export function getAvailableModels(): ModelConfig[] {
  return Object.values(MODEL_CONFIGS).filter((config) => {
    if (!config.requiresApiKey) return true;
    const apiKey = process.env[config.apiKeyEnvVar || ''];
    return !!apiKey;
  });
}

export function parseModelKey(modelKey: string): { provider: string; modelId: string } {
  const [provider, ...modelIdParts] = modelKey.split(':');
  return {
    provider,
    modelId: modelIdParts.join(':'),
  };
}

