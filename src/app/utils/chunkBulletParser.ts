import type { ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange, getBulletsList } from "./resumeReassemble";

export interface RawChunkBulletItem {
  index?: number;
  originalText?: string;
  suggestedText?: string;
  status?: string;
  reason?: string;
  keywords?: string[];
}

/**
 * Resilient 1-to-1 bullet response parser.
 * Extracts structured JSON array if present, or gracefully falls back to line-by-line pairing.
 * Guarantees that every original bullet has a corresponding 1:1 suggestion/tailored output.
 */
export function parseChunkBulletsResponse(params: {
  llmText: string;
  origBullets: string[];
  sectionGroupId: string;
  sectionGroupTitle: string;
  jobIndex?: number;
  sortedMissingKeywords?: string[];
}): { suggestions: ResumeSuggestion[]; tailoredBullets: string[] } {
  const {
    llmText,
    origBullets,
    sectionGroupId,
    sectionGroupTitle,
    jobIndex,
    sortedMissingKeywords = [],
  } = params;

  let parsedItems: RawChunkBulletItem[] | null = null;

  // 1. Try to extract and parse JSON array
  try {
    let cleanText = llmText.trim();
    // Strip markdown code fences if present (```json ... ``` or ``` ...)
    const fenceMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fenceMatch) {
      cleanText = fenceMatch[1].trim();
    } else {
      const arrayMatch = cleanText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        cleanText = arrayMatch[0].trim();
      }
    }

    const candidate = JSON.parse(cleanText);
    if (Array.isArray(candidate) && candidate.length > 0) {
      parsedItems = candidate;
    }
  } catch {
    // JSON parse failed, will use fallback
  }

  const suggestions: ResumeSuggestion[] = [];
  const tailoredBullets: string[] = [];

  if (parsedItems && parsedItems.length > 0) {
    origBullets.forEach((origLine, idx) => {
      const cleanOrig = origLine.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();
      // Match by index or position
      const match =
        parsedItems!.find((p) => p.index === idx) ||
        parsedItems![idx];

      const cleanNew = (match?.suggestedText || (match as any)?.tailored || cleanOrig)
        .replace(/^([-*•–—]|\d+\.)\s*/, "")
        .trim();

      const isSubstantive = isSubstantiveChange(cleanOrig, cleanNew);
      tailoredBullets.push(isSubstantive ? `- ${cleanNew}` : `- ${cleanOrig}`);

      if (isSubstantive) {
        const matchedKw = match?.keywords && match.keywords.length > 0
          ? match.keywords
          : sortedMissingKeywords.filter((kw) =>
              cleanNew.toLowerCase().includes(kw.toLowerCase())
            ).slice(0, 3);

        const hasMetric =
          /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanNew) &&
          !/\d+%|\$\d+|\d+x|\d+\+/i.test(cleanOrig);

        suggestions.push({
          id: `${sectionGroupId}-sug-${idx}`,
          section: sectionGroupTitle,
          originalText: cleanOrig,
          suggestedText: cleanNew,
          reason:
            match?.reason ||
            (hasMetric
              ? "Quantified operational impact metric for recruiter resonance"
              : "Targeted ATS keyword alignment and active leadership voice"),
          keywords: matchedKw,
          category: hasMetric ? "metric" : matchedKw.length > 0 ? "keyword" : "action_verb",
          status: "pending",
          jobIndex,
          bulletIndex: idx,
        });
      }
    });

    return { suggestions, tailoredBullets };
  }

  // 2. Fallback: Parse raw bullet lines
  let rawNewBullets = getBulletsList(llmText);

  if (rawNewBullets.length === 0) {
    rawNewBullets = llmText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .map((l) => (l.startsWith("- ") ? l : `- ${l}`));
  }

  origBullets.forEach((origLine, idx) => {
    const cleanOrig = origLine.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();
    const rawNew = rawNewBullets[idx] || origLine;
    const cleanNew = rawNew.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();

    const isSubstantive = isSubstantiveChange(cleanOrig, cleanNew);
    tailoredBullets.push(isSubstantive ? `- ${cleanNew}` : `- ${cleanOrig}`);

    if (isSubstantive) {
      const matchedKw = sortedMissingKeywords.filter((kw) =>
        cleanNew.toLowerCase().includes(kw.toLowerCase())
      ).slice(0, 3);

      const hasMetric =
        /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanNew) &&
        !/\d+%|\$\d+|\d+x|\d+\+/i.test(cleanOrig);

      suggestions.push({
        id: `${sectionGroupId}-sug-${idx}`,
        section: sectionGroupTitle,
        originalText: cleanOrig,
        suggestedText: cleanNew,
        reason: hasMetric
          ? "Quantified operational impact metric for recruiter resonance"
          : "Targeted ATS keyword alignment and active leadership voice",
        keywords: matchedKw,
        category: hasMetric ? "metric" : matchedKw.length > 0 ? "keyword" : "action_verb",
        status: "pending",
        jobIndex,
        bulletIndex: idx,
      });
    }
  });

  return { suggestions, tailoredBullets };
}
