/**
 * Rewrite parenthetical keyword lists in resume markdown so keywords appear in sentences, not as (a, b, c).
 * Detects patterns like (word1, word2, word3) and converts to "word1, word2, and word3" in context.
 */

/** Match parentheses containing a comma-separated list of word-like tokens (2–8 items). */
const PAREN_LIST = /\(([^()]{4,120})\)/g;

function looksLikeKeywordList(inner: string): boolean {
  const parts = inner.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2 || parts.length > 8) return false;
  const allWordLike = parts.every((p) => /^[\w.\-/]+(?:\s+[\w.\-/]+)*$/i.test(p) && p.length >= 2 && p.length <= 40);
  if (!allWordLike) return false;
  return true;
}

function rewriteOne(match: string, inner: string): string {
  const parts = inner.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return match;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return parts.slice(0, -1).join(", ") + ", and " + parts[parts.length - 1];
}

/**
 * Find parenthetical keyword lists and rewrite them as inline text (no parentheses).
 * Example: "Experience with (REST APIs, microservices, AWS)." → "Experience with REST APIs, microservices, and AWS."
 */
export function rewriteParentheticalKeywords(markdown: string): string {
  return markdown.replace(PAREN_LIST, (match, inner) => {
    if (!looksLikeKeywordList(inner)) return match;
    return rewriteOne(match, inner);
  });
}
