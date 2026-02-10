import { HfInference } from '@huggingface/inference';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

export class HuggingFaceProvider implements AIProvider {
  private client: HfInference;
  public provider = 'huggingface';

  constructor(
    private modelId: string = 'meta-llama/Llama-3.1-8B-Instruct',
    apiKey?: string
  ) {
    const key = apiKey || process.env.HUGGINGFACE_API_KEY;
    if (!key) {
      throw new Error('HUGGINGFACE_API_KEY is not defined');
    }
    this.client = new HfInference(key);
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.HUGGINGFACE_API_KEY || true; // Will be checked at creation
  }

  async generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult> {
    try {
      const promptText = Array.isArray(prompt) ? prompt.join('\n\n') : prompt;

      const response = await this.client.textGeneration({
        model: this.modelId,
        inputs: promptText,
        parameters: {
          temperature: options?.temperature,
          max_new_tokens: options?.maxTokens,
          top_p: options?.topP,
          return_full_text: false,
        },
      });

      const text = typeof response === 'string' ? response : response.generated_text || '';

      return {
        text,
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





