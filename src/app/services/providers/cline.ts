import OpenAI from 'openai';
import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

/**
 * ClinePass provider — OpenAI-compatible gateway used for penny-inference.
 *
 * DeepSeek v4.1 Flash via ClinePass is the mission's designated low-cost engine
 * (target <$0.005 per tailored resume). It is operator-funded: the server-side
 * CLINE_API_KEY pays, not the end user, so it is treated as a `penny` cost class
 * by the runtime cost-guard rather than a user BYO-key `paid-opt-in` provider.
 *
 * Endpoint and model id are env-overridable so the operator can confirm them
 * without a code change:
 *   CLINE_API_URL  (default: https://api.cline.bot/api/v1)
 *   CLINE_MODEL    (default: cline-pass/deepseek-v4.1-flash)
 *   CLINE_API_KEY  (required)
 *
 * NOTE: the default model id could not be verified against the live gateway
 * from the build environment (egress is blocked). Confirm it with
 * `GET $CLINE_API_URL/models` before enabling this as the default model.
 */
export class ClineProvider implements AIProvider {
  private client: OpenAI;
  public provider = 'cline';

  constructor(
    private modelId: string = process.env.CLINE_MODEL || 'cline-pass/deepseek-v4.1-flash',
    apiKey?: string
  ) {
    const key = apiKey || process.env.CLINE_API_KEY;
    if (!key) {
      throw new Error('CLINE_API_KEY is not defined');
    }
    // ClinePass exposes an OpenAI-compatible API.
    this.client = new OpenAI({
      apiKey: key,
      baseURL: process.env.CLINE_API_URL || 'https://api.cline.bot/api/v1',
    });
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.CLINE_API_KEY;
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
      // Handle rate limit and quota errors (429, 402)
      const status = error?.status || error?.response?.status;
      const isRateLimit = status === 429;
      const isQuotaError = status === 402;

      if (
        isRateLimit ||
        isQuotaError ||
        error?.message?.includes('rate limit') ||
        error?.message?.includes('Insufficient Balance') ||
        error?.message?.includes('insufficient balance')
      ) {
        const retryAfter = error?.response?.headers?.['retry-after']
          ? parseInt(error.response.headers['retry-after'])
          : 30;

        const rateLimitError: RateLimitError = {
          status: status || 429,
          message: error.message || (isQuotaError ? 'Insufficient balance' : 'Rate limit exceeded'),
          retryAfter,
          quotaExceeded: true,
        };
        throw rateLimitError;
      }

      throw error;
    }
  }
}
