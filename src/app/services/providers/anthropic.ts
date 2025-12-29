import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  public provider = 'anthropic';

  constructor(
    private modelId: string = 'claude-3-5-haiku-20241022',
    apiKey?: string
  ) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY is not defined');
    }
    this.client = new Anthropic({ apiKey: key });
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY || true; // Will be checked at creation
  }

  async generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult> {
    try {
      const promptText = Array.isArray(prompt) ? prompt.join('\n\n') : prompt;

      const response = await this.client.messages.create({
        model: this.modelId,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        messages: [
          {
            role: 'user',
            content: promptText,
          },
        ],
      });

      const text =
        response.content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('') || '';

      const usage = response.usage
        ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
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

