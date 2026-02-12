/**
 * Shared validation so we never store job-description phrases as company name.
 * Used by company-research (extraction) and humanize/stream (storage safety net for cached results).
 */
export function looksLikeCompanyName(s: string): boolean {
  if (!s?.trim()) return false;
  const t = s.trim();
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length > 5) return false;
  if (/^(other|various|multiple|all|different|internal|cross[- ]?functional)\s+/i.test(t)) return false;
  if (/\b(teams?|to bring|to provide|to support|to deliver|engineering teams|product teams)\b/i.test(t)) return false;
  return true;
}
