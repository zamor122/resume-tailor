import type { ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange, getBulletsList, isolatePreciseOriginalChange } from "./resumeReassemble";

export const BULLET_PREFIX_REGEX = /^([-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]|\d+\.)\s*/;

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

  console.log(`[chunkBulletParser] ▶ Parsing chunk for "${sectionGroupTitle}" (jobIndex: ${jobIndex ?? "N/A"}, inputBullets: ${origBullets.length}, rawChars: ${llmText?.length || 0})`);

  let parsedItems: RawChunkBulletItem[] | null = null;

  // 1. Try to extract and parse JSON array
  try {
    let cleanText = (llmText || "").trim();
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
      console.log(`[chunkBulletParser] Extracted JSON array with ${parsedItems.length} items`);
    }
  } catch (e) {
    console.log(`[chunkBulletParser] JSON extraction skipped (${e instanceof Error ? e.message : String(e)}), using line-based parsing`);
  }

  const suggestions: ResumeSuggestion[] = [];
  const tailoredBullets: string[] = [];

  if (parsedItems && parsedItems.length > 0) {
    origBullets.forEach((origLine, idx) => {
      const cleanOrig = origLine.replace(BULLET_PREFIX_REGEX, "").trim();

      // Match strategy:
      // 1. Explicit item.index === idx
      // 2. Text similarity against item.originalText
      // 3. Fallback to position parsedItems[idx]
      let match = parsedItems!.find((p) => p.index === idx);

      if (!match && cleanOrig) {
        const cleanOrigSnippet = cleanOrig.toLowerCase().slice(0, 30);
        match = parsedItems!.find((p) => {
          if (!p.originalText) return false;
          const cleanItemOrig = p.originalText.replace(BULLET_PREFIX_REGEX, "").trim().toLowerCase();
          return (
            cleanItemOrig.includes(cleanOrigSnippet) ||
            cleanOrig.toLowerCase().includes(cleanItemOrig.slice(0, 30))
          );
        });
      }

      if (!match && idx < parsedItems!.length) {
        match = parsedItems![idx];
      }

      const cleanNew = (match?.suggestedText || (match as any)?.tailored || cleanOrig)
        .replace(BULLET_PREFIX_REGEX, "")
        .trim();

      const isSubstantive = isSubstantiveChange(cleanOrig, cleanNew);
      tailoredBullets.push(isSubstantive ? `- ${cleanNew}` : `- ${cleanOrig}`);

      console.log(`[chunkBulletParser] Bullet [${idx}]: isSubstantive=${isSubstantive}`, {
        orig: cleanOrig.slice(0, 50),
        suggested: cleanNew.slice(0, 50),
        matchFound: !!match,
        matchedBy: match ? (match.index === idx ? "index" : "text/position") : "none",
      });

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
          originalText: isolatePreciseOriginalChange(cleanOrig, cleanNew),
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

    console.log(`[chunkBulletParser] ✔ Finished structured parse for "${sectionGroupTitle}": generated ${suggestions.length} suggestions from ${origBullets.length} input bullets`);
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
    const cleanOrig = origLine.replace(BULLET_PREFIX_REGEX, "").trim();
    const rawNew = rawNewBullets[idx] || origLine;
    const cleanNew = rawNew.replace(BULLET_PREFIX_REGEX, "").trim();

    const isSubstantive = isSubstantiveChange(cleanOrig, cleanNew);
    tailoredBullets.push(isSubstantive ? `- ${cleanNew}` : `- ${cleanOrig}`);

    console.log(`[chunkBulletParser] (Fallback) Bullet [${idx}]: isSubstantive=${isSubstantive}`, {
      orig: cleanOrig.slice(0, 50),
      new: cleanNew.slice(0, 50),
    });

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
        originalText: isolatePreciseOriginalChange(cleanOrig, cleanNew),
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

  console.log(`[chunkBulletParser] ✔ Finished fallback parse for "${sectionGroupTitle}": generated ${suggestions.length} suggestions from ${origBullets.length} input bullets`);
  return { suggestions, tailoredBullets };
}
