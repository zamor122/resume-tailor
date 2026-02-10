/**
 * Server-Side Umami Tracking Utility
 * 
 * Tracks events from the backend/server-side code.
 * Uses direct fetch calls (Edge runtime compatible) instead of @umami/api-client.
 */

// Read from process.env at call time to support test environment changes
const getUmamiConfig = () => ({
  apiUrl: process.env.UMAMI_API_URL || 'https://cloud.umami.is/api',
  websiteId: process.env.UMAMI_WEBSITE_ID || '96fc4b45-d8c8-4941-8a4f-330723725623',
  apiKey: process.env.UMAMI_API_KEY || '',
});

interface RateLimitHitData {
  endpoint: string;
  modelKey: string;
  limitType: 'per_ip' | 'global_cerebras';
  retryAfter: number;
  hashedIP: string;
  userId?: string;
  window: 'minute' | 'hour' | 'day';
  currentCount: number;
  limit: number;
}

/**
 * Track rate limit hit event
 */
export async function trackRateLimitHitServer(data: RateLimitHitData): Promise<void> {
  // Skip in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('[UmamiServer] 🚫 DEV MODE - Rate limit hit logged but NOT sent:', data);
    return;
  }
  
  const config = getUmamiConfig();
  if (!config.apiKey || !config.websiteId) {
    return;
  }
  
  try {
    // Use Umami's collect endpoint directly (Edge runtime compatible)
    const eventData = {
      website: config.websiteId,
      hostname: 'api',
      url: `/api/${data.endpoint}`,
      name: data.limitType === 'global_cerebras' 
        ? 'CEREBRAS_GLOBAL_LIMIT_HIT' 
        : 'MODEL_RATE_LIMIT_HIT',
      data: JSON.stringify({
        endpoint: data.endpoint,
        modelKey: data.modelKey,
        limitType: data.limitType,
        retryAfter: data.retryAfter,
        hashedIP: data.hashedIP,
        userId: data.userId || 'anonymous',
        window: data.window,
        currentCount: data.currentCount,
        limit: data.limit,
      }),
    };
    
    // Use fetch to send event to Umami collect endpoint
    const response = await fetch(`${config.apiUrl.replace('/api', '')}/api/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Resume-Tailor/1.0',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      console.error('[UmamiServer] Failed to track rate limit hit:', response.status, response.statusText);
    }
  } catch (error) {
    // Don't throw - tracking failures shouldn't break the app
    console.error('[UmamiServer] Error tracking rate limit hit:', error);
  }
}

/**
 * Track quota exceeded event
 */
export async function trackQuotaExceededServer(
  modelKey: string,
  endpoint: string,
  hashedIP: string,
  userId?: string
): Promise<void> {
  if (process.env.NODE_ENV === 'development') {
    console.log('[UmamiServer] 🚫 DEV MODE - Quota exceeded logged but NOT sent:', {
      modelKey,
      endpoint,
      hashedIP,
      userId,
    });
    return;
  }
  
  const config = getUmamiConfig();
  if (!config.apiKey || !config.websiteId) {
    return;
  }
  
  try {
    const eventData = {
      website: config.websiteId,
      hostname: 'api',
      url: `/api/${endpoint}`,
      name: 'MODEL_QUOTA_EXCEEDED',
      data: JSON.stringify({
        modelKey,
        endpoint,
        hashedIP,
        userId: userId || 'anonymous',
      }),
    };
    
    const response = await fetch(`${config.apiUrl.replace('/api', '')}/api/collect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Resume-Tailor/1.0',
      },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) {
      console.error('[UmamiServer] Failed to track quota exceeded:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('[UmamiServer] Error tracking quota exceeded:', error);
  }
}

