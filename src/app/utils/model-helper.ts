// Default model is configurable via env to make switching providers/models trivial.
// Prefer DEFAULT_MODEL_KEY (server/runtime). Keep a safe fallback for local dev.
const DEFAULT_MODEL_KEY = process.env.DEFAULT_MODEL_KEY || 'cerebras:gpt-oss-120b';

export async function getModelFromSession(
  sessionId: string | undefined,
  modelKey: string | undefined,
  reqOrigin: string
): Promise<{
  modelKey: string;
  sessionApiKeys?: Record<string, string>;
}> {
  // Default to Cerebras if no model specified
  let selectedModel = modelKey || DEFAULT_MODEL_KEY;
  let sessionApiKeys: Record<string, string> | undefined;

  if (sessionId) {
    try {
      const sessionResponse = await fetch(`${reqOrigin}/api/mcp/session-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', sessionId }),
      });
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        
        // Get API keys from session if available
        if (sessionData.session?.preferences?.apiKeys) {
          sessionApiKeys = sessionData.session.preferences.apiKeys;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch session preferences:', e);
    }
  }

  // Use env-configured default if no model explicitly provided
  if (!modelKey) {
    selectedModel = DEFAULT_MODEL_KEY;
    console.log(`[Model Selection] Using default model: ${selectedModel}`);
  } else {
    console.log(`[Model Selection] Using provided model: ${selectedModel}`);
  }

  return {
    modelKey: selectedModel,
    sessionApiKeys,
  };
}

