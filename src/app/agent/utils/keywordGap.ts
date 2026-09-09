export interface KeywordGapSnapshot {
  foundInResume: string[];
  missingKeywords: string[];
}

const FOUND_KEYWORDS_CAP = 20;
const MISSING_KEYWORDS_CAP = 20;
const MISSING_KEYWORD_MIN_LENGTH = 5;

const MISSING_KEYWORDS_BLOCKLIST = new Set([
  "anduril", "your", "select", "military", "veteran", "disability", "clearance", "disorder",
  "compensation", "duty", "roles", "form", "self", "requires", "external", "voluntary",
  "identification", "protected", "federal", "government", "role", "applicant", "candidate",
  "employment", "equal", "veterans", "confidential", "industries", "environments", "health",
  "defense technology", "advanced technology", "defense industry", "military systems",
  "allied military capabilities", "innovative", "transform", "bring", "changing", "defense",
  "technology", "mission", "capabilities", "allied", "cutting-edge", "cutting edge",
]);

/**
 * Compute keyword gap against final resume text: which JD keywords appear (found) vs missing.
 */
export function computeKeywordGap(keywords: any, text: string): KeywordGapSnapshot {
  const textLower = text.toLowerCase();
  const criticalList = keywords?.criticalKeywords || [];
  const allJobKeywords = [
    ...(keywords?.keywords?.technical || []),
    ...(keywords?.keywords?.industry || []),
  ];
  const variations = (term: string) => {
    const t = (term || "").toLowerCase();
    return [t, t.replace(/\s+/g, ""), t.replace(/\s+/g, "-"), t.replace(/\s+/g, "_")];
  };
  const appearsIn = (term: string) => variations(term).some((v) => v.length >= 3 && textLower.includes(v));

  const found: string[] = [];
  const missing: string[] = [];
  const seenLower = new Set<string>();

  for (const kw of criticalList) {
    const term = (typeof kw === "string" ? kw : (kw as any)?.term ?? "").trim();
    if (term.length < 3) continue;
    const key = term.toLowerCase();
    if (seenLower.has(key)) continue;
    seenLower.add(key);
    if (appearsIn(term)) found.push(term);
    else missing.push(term);
  }

  const importanceOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...allJobKeywords].sort((a: any, b: any) => {
    const aImp = importanceOrder[a?.importance] ?? 2;
    const bImp = importanceOrder[b?.importance] ?? 2;
    if (bImp !== aImp) return bImp - aImp;
    return (b?.frequency ?? 1) - (a?.frequency ?? 1);
  });
  for (const k of sorted) {
    const term = (k?.term ?? "").trim();
    if (term.length < 3) continue;
    const key = term.toLowerCase();
    if (seenLower.has(key)) continue;
    seenLower.add(key);
    if (appearsIn(term)) found.push(term);
    else missing.push(term);
  }

  const filteredMissing = missing.filter(
    (term) =>
      term.length >= MISSING_KEYWORD_MIN_LENGTH && !MISSING_KEYWORDS_BLOCKLIST.has(term.toLowerCase())
  );

  return {
    foundInResume: found.slice(0, FOUND_KEYWORDS_CAP),
    missingKeywords: filteredMissing.slice(0, MISSING_KEYWORDS_CAP),
  };
}
