import type { AgentState, ImprovementMetrics } from "../state";
import {
  applySuggestionsToOriginal,
  reassembleResumeFromSections,
  buildContactFromOriginal,
} from "@/app/utils/resumeReassemble";
import { sanitizeResumeForATS } from "@/app/utils/atsSanitizer";
import { deduplicateResumeSections } from "@/app/utils/resumeSectionDedupe";
import { rewriteParentheticalKeywords } from "@/app/utils/keywordParenthesesCleaner";
import { validateOrFixEducationBlock } from "@/app/utils/educationValidator";
import {
  sanitizeContactBlock,
  replaceContactBlock,
} from "@/app/utils/contactBlockSanitizer";
import { computeKeywordGap } from "../utils/keywordGap";

export async function reassembleAndScoreNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const {
    resumeAST,
    tailoredSummary = "",
    tailoredBulletsByJob = [],
    suggestions = [],
    rawResume,
    keywordResult,
    baselineScore = 50,
    preferences,
    bulletPlan,
  } = state;

  if (!rawResume || rawResume.trim().length === 0) {
    return {
      finalResumeText: rawResume,
      afterScore: baselineScore,
      suggestions: [],
    };
  }

  // 1. Surgical in-place application: preserves 100% of original headers, custom sections, and formatting
  let finalResume: string;
  if (suggestions && suggestions.length > 0) {
    finalResume = applySuggestionsToOriginal(rawResume, suggestions);
  } else if (resumeAST) {
    finalResume = reassembleResumeFromSections({
      parsed: resumeAST,
      tailoredSummary,
      tailoredBulletsByJob,
      originalResume: rawResume,
    });
  } else {
    finalResume = rawResume;
  }

  // 2. Deterministic ATS formatting hygiene (normalize bullet glyphs and date separators)
  finalResume = sanitizeResumeForATS(finalResume);
  finalResume = rewriteParentheticalKeywords(finalResume);

  // 3. Compute final keyword gap
  const keywordGap = computeKeywordGap(keywordResult, finalResume);

  // 4. Calculate score improvement based on found keywords and intensity
  const totalKeywords = (keywordResult?.criticalKeywords?.length || 10);
  const foundCount = keywordGap.foundInResume.length;
  const matchRatio = Math.min(1, foundCount / Math.max(1, totalKeywords));

  const targetBoost = preferences.intensity === "minimal" ? 15 : preferences.intensity === "targeted" ? 25 : 35;
  const afterScore = Math.min(98, Math.max(baselineScore + 10, Math.round(baselineScore + targetBoost * matchRatio)));

  // 5. Count metrics and modifications
  const placeholderCount = (finalResume.match(/\[[^\]]+\]/g) || []).length;
  const totalBulletsModified = (bulletPlan?.jobBulletChanges || []).reduce(
    (acc, cur) => acc + (cur.bulletIndices === "all" ? (resumeAST?.experience?.length || 1) * 3 : cur.bulletIndices.length),
    0
  );

  const improvementMetrics: ImprovementMetrics = {
    bulletsRewritten: totalBulletsModified,
    keywordsAdded: keywordGap.foundInResume.length,
    scoreImprovement: afterScore - baselineScore,
    intensityApplied: preferences.intensity,
    metricsInjected: placeholderCount,
  };

  return {
    finalResumeText: finalResume,
    beforeScore: baselineScore,
    afterScore,
    keywordGap,
    suggestions,
    improvementMetrics,
    logs: [
      `[reassembleAndScore] Reassembled resume | Match score: ${baselineScore}% -> ${afterScore}% (+${afterScore - baselineScore}%) | Suggestions: ${suggestions.length}`,
    ],
  };
}
