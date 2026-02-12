import { AIProvider, ModelOptions, GenerateContentResult, RateLimitError } from '@/app/types/model';

// Dynamic import for Cerebras SDK to avoid Edge runtime issues
let CerebrasSDK: any = null;

async function getCerebrasSDK() {
  if (!CerebrasSDK) {
    try {
      // Dynamic import - only loads in Node.js runtime
      CerebrasSDK = (await import('@cerebras/cerebras_cloud_sdk')).default;
    } catch (error) {
      // If SDK can't be loaded (Edge runtime), throw a helpful error
      throw new Error('Cerebras SDK is not available in Edge runtime. Please use Node.js runtime for routes that use Cerebras models.');
    }
  }
  return CerebrasSDK;
}

export class CerebrasProvider implements AIProvider {
  private client: any;
  public provider = 'cerebras';
  private apiKey?: string;

  constructor(
    private modelId: string = 'gpt-oss-120b',
    apiKey?: string
  ) {
    // Store API key for lazy initialization
    this.apiKey = apiKey;
    // Don't initialize client in constructor - do it lazily in generateContent
    // This allows the class to be instantiated even if SDK isn't available
    this.client = null;
  }

  private async ensureClient() {
    if (!this.client) {
      const key = this.apiKey || process.env.CEREBRAS_API_KEY;
      if (!key) {
        throw new Error('CEREBRAS_API_KEY is not defined');
      }
      const Cerebras = await getCerebrasSDK();
      // Use official Cerebras SDK with configured retries
      // SDK automatically retries: 429, 408, 409, >=500, connection errors (2 times by default)
      this.client = new Cerebras({
        apiKey: key,
        maxRetries: 3, // Increase from default 2 to 3 for better reliability
        timeout: 60 * 1000, // 60 seconds (default is 1 minute)
      });
    }
    return this.client;
  }

  getModelId(): string {
    return this.modelId;
  }

  isAvailable(): boolean {
    return !!process.env.CEREBRAS_API_KEY || true; // Will be checked at creation
  }

  /**
   * Estimate token count (more accurate approximation)
   * English text: ~4 chars/token, but with structured data/prompts it can be ~3-3.5 chars/token
   * We use a conservative 3.5 chars/token to account for JSON, markdown, and structured content
   */
  private estimateTokens(text: string): number {
    // More conservative estimate for structured content (prompts, JSON, markdown)
    return Math.ceil(text.length / 3.5);
  }
  
  /**
   * Truncate text to fit within token limit
   * Accounts for prompt overhead and max_completion_tokens
   */
  private truncateToTokenLimit(text: string, maxTokens: number, reservedTokens: number = 2000): string {
    const availableTokens = maxTokens - reservedTokens;
    const maxChars = availableTokens * 3.5; // Use same ratio as estimation
    if (text.length <= maxChars) {
      return text;
    }
    // Truncate and add indicator
    return text.substring(0, maxChars - 50) + '\n\n[... content truncated to fit context limit ...]';
  }

  async generateContent(
    prompt: string | string[],
    options?: ModelOptions
  ): Promise<GenerateContentResult> {
    const promptText = Array.isArray(prompt) ? prompt.join('\n\n') : prompt;
    
    // Estimate input tokens (using more conservative ratio)
    const estimatedInputTokens = this.estimateTokens(promptText);
    
    // Context limit for gpt-oss-120b is 65536 tokens
    const CONTEXT_LIMIT = 65536;
    const RESERVED_TOKENS = 2000; // Reserve for prompt overhead and safety margin
    
    // Set reasonable max_completion_tokens if not provided
    // For resume generation, we expect ~2-4K tokens output (resume is typically 1-2 pages)
    const maxCompletionTokens = options?.maxTokens || Math.max(1000, Math.min(4000, CONTEXT_LIMIT - estimatedInputTokens - RESERVED_TOKENS));
    
    // Check if we exceed context limit BEFORE sending
    const totalEstimatedTokens = estimatedInputTokens + maxCompletionTokens;
    if (totalEstimatedTokens > CONTEXT_LIMIT) {
      const excessTokens = totalEstimatedTokens - CONTEXT_LIMIT;
      const excessChars = Math.ceil(excessTokens * 3.5);
      
      console.warn(`[Cerebras] Context limit exceeded! Estimated: ${totalEstimatedTokens} tokens (limit: ${CONTEXT_LIMIT}). Excess: ${excessTokens} tokens (~${excessChars} chars)`);
      
      throw new Error(
        `Prompt too long: Estimated ${totalEstimatedTokens} tokens exceeds context limit of ${CONTEXT_LIMIT} tokens. ` +
        `Please reduce the input size by approximately ${excessChars} characters. ` +
        `Current prompt length: ${promptText.length} characters.`
      );
    }
    
    // Validate maxCompletionTokens
    if (maxCompletionTokens <= 0 || maxCompletionTokens > 65000) {
      throw new Error(`Invalid max_tokens value: ${maxCompletionTokens}. Must be between 1 and 65000.`);
    }
    
    // Log token estimation
    console.log(`[Cerebras] Estimated input tokens: ${estimatedInputTokens}, max_tokens: ${maxCompletionTokens}, total: ${totalEstimatedTokens}/${CONTEXT_LIMIT}, model: ${this.modelId}`);

    try {
      // Build request payload
      const requestPayload: any = {
        model: this.modelId,
        messages: [
          {
            role: 'user',
            content: promptText,
          },
        ],
      };
      
      // Only include parameters if they're defined (Cerebras might reject undefined/null values)
      if (options?.temperature !== undefined) {
        requestPayload.temperature = options.temperature;
      }
      if (maxCompletionTokens > 0) {
        requestPayload.max_tokens = maxCompletionTokens;
      }
      if (options?.topP !== undefined) {
        requestPayload.top_p = options.topP;
      }
      if (options?.frequencyPenalty !== undefined) {
        requestPayload.frequency_penalty = options.frequencyPenalty;
      }
      if (options?.presencePenalty !== undefined) {
        requestPayload.presence_penalty = options.presencePenalty;
      }
      
      console.log(`[Cerebras] Request payload:`, {
        model: requestPayload.model,
        max_tokens: requestPayload.max_tokens,
        messageLength: promptText.length,
      });
      
      // Log full request details for debugging
      // Note: Edge runtime doesn't support file writes, so we log to console
      // For file logging, you'd need to use Node.js runtime or an external service
      const fullRequest = {
        timestamp: new Date().toISOString(),
        model: requestPayload.model,
        requestPayload: {
          ...requestPayload,
          messages: requestPayload.messages.map((msg: any) => ({
            role: msg.role,
            contentLength: msg.content?.length || 0,
            contentPreview: msg.content?.substring(0, 500) + (msg.content?.length > 500 ? '...' : ''),
            fullContent: msg.content, // Full content for debugging
          })),
        },
        tokenEstimation: {
          estimatedInputTokens,
          maxCompletionTokens,
          totalEstimatedTokens: estimatedInputTokens + maxCompletionTokens,
          promptTextLength: promptText.length,
          charsPerTokenEstimate: estimatedInputTokens > 0 ? promptText.length / estimatedInputTokens : 0,
        },
        requestSize: {
          promptChars: promptText.length,
          promptTokens: estimatedInputTokens,
          maxOutputTokens: maxCompletionTokens,
          totalTokens: estimatedInputTokens + maxCompletionTokens,
        },
      };
      
      // Log full request as JSON string (can be copied to a file manually if needed)
      console.log(`[Cerebras] Full Request JSON:\n${JSON.stringify(fullRequest, null, 2)}`);
      console.log(`[Cerebras] Request size: ${fullRequest.requestSize.promptChars} chars, ${fullRequest.requestSize.promptTokens} tokens (est.), total: ${fullRequest.requestSize.totalTokens} tokens`);
      
      // Note: File writing disabled in Edge runtime - request is logged to console above
      // In Node.js runtime, you can manually copy the JSON from console logs if needed
      
      // Ensure client is initialized (lazy load SDK)
      const client = await this.ensureClient();
      
      // Use .withResponse() to access both data and raw Response (including headers)
      // Per SDK docs: https://github.com/Cerebras/cerebras-cloud-sdk-node
      const { data: response, response: rawResponse } = await client.chat.completions
        .create(requestPayload)
        .withResponse();

      const text = response.choices[0]?.message?.content || '';

      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined;

      // Extract and log rate limit headers from raw Response
      // Per SDK docs, headers are accessed via rawResponse.headers.get()
      const rateLimitHeaders = {
        limitRequestsDay: rawResponse.headers.get('x-ratelimit-limit-requests-day'),
        limitTokensMinute: rawResponse.headers.get('x-ratelimit-limit-tokens-minute'),
        remainingRequestsDay: rawResponse.headers.get('x-ratelimit-remaining-requests-day'),
        remainingTokensMinute: rawResponse.headers.get('x-ratelimit-remaining-tokens-minute'),
        resetTokensMinute: rawResponse.headers.get('x-ratelimit-reset-tokens-minute'),
      };
      
      // Log token usage and rate limit status
      if (usage) {
        console.log(`[Cerebras] Token usage - Input: ${usage.promptTokens}, Output: ${usage.completionTokens}, Total: ${usage.totalTokens}`);
      }
      
      if (rateLimitHeaders.remainingTokensMinute) {
        console.log(`[Cerebras] Rate limit status - Remaining tokens/min: ${rateLimitHeaders.remainingTokensMinute}/${rateLimitHeaders.limitTokensMinute}, Requests/day: ${rateLimitHeaders.remainingRequestsDay}/${rateLimitHeaders.limitRequestsDay}`);
      }

      return {
        text,
        usage,
      };
    } catch (error: any) {
      // SDK automatically retries: 429, 408, 409, >=500, connection errors
      // If we get here, all SDK retries have been exhausted or it's a non-retryable error
      
      // Extract error details from Cerebras SDK error structure
      // SDK provides specific error types: RateLimitError, APIError, etc.
      let errorStatus = error?.status || error?.statusCode;
      let errorMessage = error?.message || 'Unknown error';
      let errorBody: any = null;

      // Cerebras SDK error handling
      // Check for SDK error structure (error.error for API errors)
      if (error?.error) {
        errorBody = error.error;
        if (errorBody.message) {
          errorMessage = errorBody.message;
        } else if (typeof errorBody === 'string') {
          errorMessage = errorBody;
        } else {
          errorMessage = JSON.stringify(errorBody);
        }
        errorStatus = errorStatus || errorBody.code || errorBody.status;
      }
      
      // Check for error in body property (some SDK versions)
      if (error?.body) {
        try {
          const body = typeof error.body === 'string' ? JSON.parse(error.body) : error.body;
          if (body?.error?.message) {
            errorMessage = body.error.message;
          } else if (body?.message) {
            errorMessage = body.message;
          }
          errorBody = body;
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Log full error for debugging
      console.error('[Cerebras Error Details]', {
        model: this.modelId,
        status: errorStatus,
        message: errorMessage,
        errorBody: errorBody,
        errorType: error?.constructor?.name,
        errorKeys: Object.keys(error || {}),
        // Log error name to identify SDK error types
        isRateLimitError: error?.constructor?.name === 'RateLimitError',
        isAPIError: error?.constructor?.name === 'APIError',
      });

      // Handle context length exceeded errors
      if (
        errorStatus === 400 &&
        (errorMessage?.toLowerCase().includes('context_length_exceeded') ||
         errorMessage?.toLowerCase().includes('reduce the length') ||
         errorMessage?.toLowerCase().includes('limit is 65536') ||
         errorBody?.code === 'context_length_exceeded')
      ) {
        const contextError: any = new Error(
          `Prompt too long: ${errorMessage || 'Context length exceeded'}. ` +
          `The model has a 65,536 token limit. Please reduce the size of your resume or job description.`
        );
        contextError.status = 400;
        contextError.code = 'CONTEXT_LENGTH_EXCEEDED';
        contextError.originalError = error;
        throw contextError;
      }

      // Handle rate limit errors (after SDK retries exhausted)
      // SDK automatically retries 429 errors, so if we get here, retries are done
      if (
        errorStatus === 429 ||
        error?.constructor?.name === 'RateLimitError' ||
        errorMessage?.toLowerCase().includes('rate limit') ||
        errorMessage?.toLowerCase().includes('quota')
      ) {
        // Try to get retry-after from error response if available
        let retryAfter = 30;
        if (error?.response) {
          const retryAfterHeader = error.response.headers?.get?.('retry-after') ||
                                   error.response.headers?.['retry-after'];
          if (retryAfterHeader) {
            retryAfter = parseInt(String(retryAfterHeader));
          }
        }

        const rateLimitError: RateLimitError = {
          status: 429,
          message: `Rate limit exceeded. ${errorMessage || 'Please wait before retrying.'}`,
          retryAfter,
          quotaExceeded: true,
        };
        throw rateLimitError;
      }

      // Create enhanced error with better message
      const enhancedError: any = new Error(
        `Cerebras API error: ${errorMessage} (Model: ${this.modelId}, Status: ${errorStatus || 'unknown'})`
      );
      enhancedError.status = errorStatus;
      enhancedError.originalError = error;
      
      throw enhancedError;
    }
  }
}

