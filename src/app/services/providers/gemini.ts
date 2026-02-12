import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

export class GeminiProvider implements AIProvider {
  private client: GoogleGenerativeAI;
  private model: any;
  public provider = 'gemini';

  constructor(
    private modelId: string = 'gemini-2.5-flash-lite',
    apiKey?: string
  ) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not defined');
    }
    this.client = new GoogleGenerativeAI(key);
    this.model = this.client.getGenerativeModel({ model: this.modelId });
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.GEMINI_API_KEY || true; // Will be checked at creation
  }

  async generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult> {
    try {
      const promptText = Array.isArray(prompt) ? prompt.join('\n\n') : prompt;

      const generationConfig: any = {};
      if (options?.temperature !== undefined) {
        generationConfig.temperature = options.temperature;
      }
      if (options?.maxTokens !== undefined) {
        generationConfig.maxOutputTokens = options.maxTokens;
      }
      if (options?.topP !== undefined) {
        generationConfig.topP = options.topP;
      }

      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        generationConfig,
      });

      const response = await result.response;
      const text = response.text();

      // Extract usage info if available
      const usage = result.response.usageMetadata
        ? {
            promptTokens: result.response.usageMetadata.promptTokenCount,
            completionTokens: result.response.usageMetadata.candidatesTokenCount,
            totalTokens: result.response.usageMetadata.totalTokenCount,
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
        error?.message?.includes('429') ||
        error?.message?.includes('quota')
      ) {
        const retryDelay = error?.errorDetails?.find(
          (d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
        )?.retryDelay || '30';
        let retrySeconds =
          typeof retryDelay === 'string'
            ? parseInt(retryDelay.replace('s', '')) || 30
            : 30;
        retrySeconds = Math.min(retrySeconds, 30);

        const rateLimitError: RateLimitError = {
          status: 429,
          message: error.message || 'Rate limit exceeded',
          retryAfter: retrySeconds,
          quotaExceeded: true,
        };
        throw rateLimitError;
      }

      throw error;
    }
  }
}





