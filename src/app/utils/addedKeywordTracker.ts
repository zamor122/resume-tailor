import type { ResumeSuggestion } from "@/app/agent/state";
import { analytics } from "@/app/services/analytics";

export type SuggestionReaction = "helpful" | "not_helpful";

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKeyword(haystack: string, keyword: string): boolean {
  if (!haystack || !keyword) return false;
  const kwLower = keyword.trim().toLowerCase();
  if (kwLower.length < 2) return false;

  // Multi-word phrases match cleanly as substrings
  if (/\s/.test(kwLower)) {
    return haystack.toLowerCase().includes(kwLower);
  }

  // Short or symbolic tokens (e.g. Go, PCI, CI/CD, SQL, AWS) require non-word boundaries
  const pattern = new RegExp(`(?:^|[^a-z0-9_])${escapeRegExp(kwLower)}(?:$|[^a-z0-9_])`, "i");
  return pattern.test(haystack);
}

/**
 * Identifies JD keywords present in `suggestedText` that were NOT present in the
 * candidate's original resume (or original bullet). Deterministic, case-preserving.
 */
export function extractAddedMissingKeywords(
  originalResume: string,
  originalText: string,
  suggestedText: string,
  candidateKeywords: string[] = []
): string[] {
  if (!suggestedText || suggestedText.includes("🔒")) return [];

  const origPool = `${originalResume || ""}\n${originalText || ""}`;
  const seen = new Set<string>();
  const added: string[] = [];

  for (const rawKw of candidateKeywords) {
    const kw = (rawKw || "").trim();
    const norm = kw.toLowerCase();
    if (!kw || norm.length < 2 || seen.has(norm)) continue;
    seen.add(norm);

    if (containsKeyword(suggestedText, kw) && !containsKeyword(origPool, kw)) {
      added.push(kw);
      if (added.length >= 5) break;
    }
  }

  return added;
}

/**
 * Returns missing JD keywords added in a suggestion, preferring server-computed
 * `addedMissingKeywords` (which works even when `suggestedText` is locked) and
 * falling back to computing from `originalResume` + `suggestion.keywords`.
 */
export function resolveSuggestionAddedKeywords(
  suggestion: Pick<ResumeSuggestion, "originalText" | "suggestedText" | "keywords" | "addedMissingKeywords">,
  originalResume?: string
): string[] {
  if (Array.isArray(suggestion.addedMissingKeywords) && suggestion.addedMissingKeywords.length > 0) {
    return suggestion.addedMissingKeywords;
  }
  return extractAddedMissingKeywords(
    originalResume || "",
    suggestion.originalText,
    suggestion.suggestedText,
    suggestion.keywords || []
  );
}

export interface PersistReactionParams {
  resumeId?: string;
  suggestionId: string;
  reaction: SuggestionReaction;
  addedKeywords: string[];
  status?: "accepted" | "rejected" | "pending";
  userId?: string;
  accessToken?: string;
  sessionId?: string | null;
}

/**
 * Fires analytics tracking immediately and persists the user's keyword-addition
 * reaction when ownership credentials (`userId+accessToken` or `sessionId`) exist.
 */
export async function persistSuggestionReaction({
  resumeId,
  suggestionId,
  reaction,
  addedKeywords,
  status,
  userId,
  accessToken,
  sessionId,
}: PersistReactionParams): Promise<void> {
  analytics.trackEvent(analytics.events.SUGGESTION_KEYWORD_REACTION, {
    ...analytics.getTrackingContext({ section: "output", element: "keyword_reaction", resumeId }),
    suggestionId,
    reaction,
    addedKeywords,
    addedKeywordsCount: addedKeywords.length,
  });

  if (!resumeId) return;
  const hasAuth = Boolean(userId && accessToken);
  const resolvedSessionId =
    sessionId ??
    (typeof window !== "undefined" ? localStorage.getItem("resume-tailor-session-id") : null);
  if (!hasAuth && !resolvedSessionId) return;

  try {
    await fetch("/api/resume/suggestion-reaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeId,
        suggestionId,
        reaction,
        addedKeywords,
        ...(status && { status }),
        ...(userId && { userId }),
        ...(accessToken && { accessToken }),
        ...(resolvedSessionId && { sessionId: resolvedSessionId }),
      }),
    });
  } catch (err) {
    console.warn("[addedKeywordTracker] Failed to persist suggestion reaction:", err);
  }
}
