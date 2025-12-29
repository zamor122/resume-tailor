import OpenAI from 'openai';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

export class CerebrasProvider implements AIProvider {
  private client: OpenAI;
  public provider = 'cerebras';

  constructor(
    private modelId: string = 'llama-3.1-70b-instruct',
    apiKey?: string
  ) {
    const key = apiKey || process.env.CEREBRAS_API_KEY;
    if (!key) {
      throw new Error('CEREBRAS_API_KEY is not defined');
    }
    // Cerebras uses OpenAI-compatible API
    this.client = new OpenAI({
      apiKey: key,
      baseURL: 'https://api.cerebras.ai/v1',
    });
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.CEREBRAS_API_KEY || true; // Will be checked at creation
  }

  async generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult> {
    try {
      const promptText = Array.isArray(prompt) ? prompt.join('\n\n') : prompt;

      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: [
          {
            role: 'user',
            content: promptText,
          },
        ],
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        top_p: options?.topP,
        frequency_penalty: options?.frequencyPenalty,
        presence_penalty: options?.presencePenalty,
      });

      const text = response.choices[0]?.message?.content || '';

      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      return {
        text,
        usage,
      };
    } catch (error: any) {
      // Handle rate limit errors
      if (
        error?.status === 429 ||
        error?.response?.status === 429 ||
        error?.message?.includes('rate limit')
      ) {
        const retryAfter = error?.response?.headers?.['retry-after']
          ? parseInt(error.response.headers['retry-after'])
          : 30;

        const rateLimitError: RateLimitError = {
          status: 429,
          message: error.message || 'Rate limit exceeded',
          retryAfter,
          quotaExceeded: true,
        };
        throw rateLimitError;
      }

      throw error;
    }
  }
}

