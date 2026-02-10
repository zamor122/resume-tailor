/**
 * Error utilities for AI provider error detection.
 * Kept in a separate file to avoid circular imports (e.g. GeminiProvider imports ai-provider).
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  if (e.status === 429 || e.statusCode === 429) return true;
  if (e.status === 402 || e.statusCode === 402) return true;
  if (e.quotaExceeded === true) return true;
  const msg = String(e.message || '').toLowerCase();
  return msg.includes('rate limit') || msg.includes('quota exceeded');
}

export function isModelUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;
  if (e.status === 404 || e.statusCode === 404) return true;
  if (e.status === 403 || e.statusCode === 403) return true;
  if (e.status === 400 || e.statusCode === 400) return true;
  const msg = String(e.message || '').toLowerCase();
  return (
    msg.includes('not found') ||
    msg.includes('decommissioned') ||
    msg.includes('no longer supported')
  );
}
