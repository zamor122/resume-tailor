import { Mistral } from '@mistralai/mistralai';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

export class MistralProvider implements AIProvider {
  private client: Mistral;
  public provider = 'mistral';

  constructor(
    private modelId: string = 'mistral-small-latest',
    apiKey?: string
  ) {
    const key = apiKey || process.env.MISTRAL_API_KEY;
    if (!key) {
      throw new Error('MISTRAL_API_KEY is not defined');
    }
    this.client = new Mistral({ apiKey: key });
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.MISTRAL_API_KEY || true; // Will be checked at creation
  }

  async generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult> {
    try {
      const promptText = Array.isArray(prompt) ? prompt.join('\n\n') : prompt;

      const response = await this.client.chat.complete({
        model: this.modelId,
        messages: [
          {
            role: 'user',
            content: promptText,
          },
        ],
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        topP: options?.topP,
      });

      const content = response.choices[0]?.message?.content;
      let text = '';
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        text = content
          .map(c => {
            if (typeof c === 'string') return c;
            if (c && typeof c === 'object' && 'type' in c) {
              if (c.type === 'text' && 'text' in c) return c.text;
              return '';
            }
            return '';
          })
          .join('');
      }

      const usage = response.usage
        ? {
            promptTokens: response.usage.promptTokens || 0,
            completionTokens: response.usage.completionTokens || 0,
            totalTokens: (response.usage.promptTokens || 0) + (response.usage.completionTokens || 0),
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

