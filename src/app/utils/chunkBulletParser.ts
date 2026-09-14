import type { ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange, getBulletsList, isolatePreciseOriginalChange } from "./resumeReassemble";
import { stripModelThinking, isThinkingOrPreamble } from "./stripModelThinking";

export const BULLET_PREFIX_REGEX = /^([-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]|\d+\.)\s*/;

export interface RawChunkBulletItem {
  index?: number;
  originalText?: string;
  suggestedText?: string;
  status?: string;
  reason?: string;
  keywords?: string[];
}

const VERB_SYNONYMS: Record<string, string[]> = {
  architected: ["Engineered", "Designed", "Constructed", "Structured", "Formulated"],
  engineered: ["Architected", "Built", "Developed", "Constructed", "Implemented"],
  spearheaded: ["Directed", "Championed", "Steered", "Orchestrated", "Guided"],
  orchestrated: ["Coordinated", "Mobilized", "Harmonized", "Managed", "Executed"],
  led: ["Directed", "Guided", "Steered", "Managed", "Headed"],
  developed: ["Authored", "Engineered", "Implemented", "Constructed", "Delivered"],
  built: ["Constructed", "Created", "Engineered", "Produced", "Deployed"],
  implemented: ["Executed", "Instituted", "Deployed", "Integrated", "Standardized"],
  designed: ["Architected", "Crafted", "Formulated", "Modeled", "Engineered"],
  created: ["Authored", "Originated", "Established", "Produced", "Launched"],
  managed: ["Oversaw", "Administered", "Directed", "Supervised", "Guided"],
  improved: ["Enhanced", "Elevated", "Optimized", "Boosted", "Accelerated"],
  optimized: ["Refined", "Streamlined", "Maximized", "Tuned", "Enhanced"],
  enhanced: ["Elevated", "Boosted", "Amplified", "Upgraded", "Strengthened"],
  delivered: ["Shipped", "Produced", "Dispatched", "Completed", "Executed"],
  automated: ["Streamlined", "Programmed", "Modernized", "Accelerated", "Refactored"],
  accelerated: ["Expedited", "Quickened", "Advanced", "Spurred", "Streamlined"],
  standardized: ["Normalized", "Unified", "Harmonized", "Codified", "Formalized"],
  consolidated: ["Unified", "Merged", "Integrated", "Centralized", "Streamlined"],
  refactored: ["Restructured", "Revamped", "Overhauled", "Remodeled", "Modernized"],
};

/**
 * Ensures opening action verbs are not repeated across consecutive bullets in the same job.
 */
function diversifyOpeningVerb(bulletText: string, usedVerbs: Set<string>): string {
  const words = bulletText.trim().split(/\s+/);
  if (words.length < 2) return bulletText;

  const rawFirstWord = words[0].replace(/[^a-zA-Z]/g, "");
  const lowerFirst = rawFirstWord.toLowerCase();

  if (!usedVerbs.has(lowerFirst)) {
    usedVerbs.add(lowerFirst);
    return bulletText;
  }

  // If already used, try to find an unused synonym
  const candidates = VERB_SYNONYMS[lowerFirst];
  if (candidates) {
    for (const syn of candidates) {
      if (!usedVerbs.has(syn.toLowerCase())) {
        usedVerbs.add(syn.toLowerCase());
        const rest = bulletText.slice(words[0].length);
        return `${syn}${rest}`;
      }
    }
  }

  return bulletText;
}

/**
 * Resilient 1-to-1 bullet response parser.
 * Extracts structured JSON array if present, or gracefully falls back to line-by-line pairing.
 * Guarantees that every original bullet has a corresponding 1:1 suggestion/tailored output.
 * Strips model thinking tags and preambles, and enforces opening verb diversity.
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

  // Strip model thinking traces and preambles before parsing
  const cleanLlmText = stripModelThinking(llmText || "");

  let parsedItems: RawChunkBulletItem[] | null = null;

  // 1. Try to extract and parse JSON array
  try {
    let cleanText = cleanLlmText;
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
  const usedOpeningVerbs = new Set<string>();

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

      let rawNew = (match?.suggestedText || (match as any)?.tailored || cleanOrig);
      let cleanNew = stripModelThinking(rawNew)
        .replace(BULLET_PREFIX_REGEX, "")
        .trim();

      // Discard invalid thinking/preamble leaks
      if (isThinkingOrPreamble(cleanNew) || cleanNew.length < 5) {
        cleanNew = cleanOrig;
      } else {
        // Enforce opening verb diversity across bullets in this job
        cleanNew = diversifyOpeningVerb(cleanNew, usedOpeningVerbs);
      }

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
  let rawNewBullets = getBulletsList(cleanLlmText)
    .map((l) => stripModelThinking(l).trim())
    .filter((l) => l.length > 0 && !isThinkingOrPreamble(l));

  if (rawNewBullets.length === 0) {
    rawNewBullets = cleanLlmText
      .split(/\r?\n/)
      .map((l) => stripModelThinking(l).trim())
      .filter((l) => l.length > 0 && !isThinkingOrPreamble(l))
      .map((l) => (l.startsWith("- ") ? l : `- ${l}`));
  }

  origBullets.forEach((origLine, idx) => {
    const cleanOrig = origLine.replace(BULLET_PREFIX_REGEX, "").trim();
    const rawNew = rawNewBullets[idx] || origLine;
    let cleanNew = stripModelThinking(rawNew).replace(BULLET_PREFIX_REGEX, "").trim();

    // Discard invalid thinking/preamble leaks
    if (isThinkingOrPreamble(cleanNew) || cleanNew.length < 5) {
      cleanNew = cleanOrig;
    } else {
      // Enforce opening verb diversity across bullets in this job
      cleanNew = diversifyOpeningVerb(cleanNew, usedOpeningVerbs);
    }

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
