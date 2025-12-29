import { DEFAULT_MODEL } from '@/app/config/models';

export async function getModelFromSession(
  sessionId: string | undefined,
  modelKey: string | undefined,
  reqOrigin: string
): Promise<{
  modelKey: string;
  sessionApiKeys?: Record<string, string>;
}> {
  let selectedModel = modelKey || DEFAULT_MODEL;
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
        if (sessionData.session?.preferences?.modelPreferences?.defaultModel) {
          selectedModel = sessionData.session.preferences.modelPreferences.defaultModel;
        }
        if (sessionData.session?.preferences?.apiKeys) {
          sessionApiKeys = sessionData.session.preferences.apiKeys;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch session preferences:', e);
    }
  }

  return {
    modelKey: selectedModel,
    sessionApiKeys,
  };
}

