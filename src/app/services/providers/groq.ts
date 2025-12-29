import Groq from 'groq-sdk';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

export class GroqProvider implements AIProvider {
  private client: Groq;
  public provider = 'groq';

  constructor(
    private modelId: string = 'llama-3.1-70b-versatile',
    apiKey?: string
  ) {
    const key = apiKey || process.env.GROQ_API_KEY;
    if (!key) {
      throw new Error('GROQ_API_KEY is not defined');
    }
    this.client = new Groq({ apiKey: key });
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY || true; // Will be checked at creation
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
        error?.statusCode === 429 ||
        error?.message?.includes('rate limit')
      ) {
        const retryAfter = error?.retryAfter || 30;

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

