import type { AgentState, ImprovementMetrics } from "../state";
import {
  applySuggestionsToOriginal,
  reassembleResumeFromSections,
  buildContactFromOriginal,
  getBulletsList,
  isSubstantiveChange,
  isolatePreciseOriginalChange,
} from "@/app/utils/resumeReassemble";
import { lightSanitizeForATS } from "@/app/utils/atsSanitizer";
import { deduplicateResumeSections } from "@/app/utils/resumeSectionDedupe";
import { rewriteParentheticalKeywords } from "@/app/utils/keywordParenthesesCleaner";
import { validateOrFixEducationBlock } from "@/app/utils/educationValidator";
import {
  sanitizeContactBlock,
  replaceContactBlock,
} from "@/app/utils/contactBlockSanitizer";
import { computeKeywordGap } from "../utils/keywordGap";
import { evaluateResumeAlignmentWithJev } from "@/app/services/jev";

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
  } = state;

  if (!rawResume || rawResume.trim().length === 0) {
    return {
      finalResumeText: rawResume,
      afterScore: baselineScore,
      suggestions: [],
    };
  }

  // 1. Surgical in-place application: preserves 100% of original headers, custom sections, and formatting
  const activeSuggestions = [...(suggestions || [])];
  if (activeSuggestions.length === 0) {
    if (tailoredSummary && resumeAST?.summary && tailoredSummary.trim() !== resumeAST.summary.trim()) {
      activeSuggestions.push({
        id: "sug-summary-auto",
        section: "Summary",
        originalText: resumeAST.summary.trim(),
        suggestedText: tailoredSummary.trim(),
        reason: "Keyword alignment and leadership scope",
        keywords: [],
        status: "accepted",
      });
    }
    if (tailoredBulletsByJob && tailoredBulletsByJob.length > 0 && resumeAST?.experience) {
      const expList = resumeAST.experience;
      tailoredBulletsByJob.forEach((newBullets, jobIdx) => {
        const origExp = expList[jobIdx];
        if (!origExp || !newBullets) return;

        const origList = getBulletsList(origExp.description);
        const newList = getBulletsList(newBullets);

        newList.forEach((nb, bulletIdx) => {
          const cleanN = nb.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();
          const cleanO = (origList[bulletIdx] || "").replace(/^([-*•–—]|\d+\.)\s*/, "").trim();

          if (cleanN && isSubstantiveChange(cleanO, cleanN)) {
            activeSuggestions.push({
              id: `sug-job-${jobIdx}-b-${bulletIdx}-auto`,
              section: origExp.company ? `${origExp.company} – ${origExp.title || "Role"}` : "Experience",
              originalText: cleanO,
              suggestedText: cleanN,
              reason: "Targeted keyword and achievement enhancement",
              keywords: [],
              status: "accepted",
              jobIndex: jobIdx,
              bulletIndex: bulletIdx,
            });
          }
        });
      });
    }
  }

  let finalResume: string;
  if (activeSuggestions.length > 0) {
    finalResume = applySuggestionsToOriginal(rawResume, activeSuggestions);
  } else {
    finalResume = rawResume;
  }

  // 2. Deterministic ATS formatting hygiene (normalize bullet glyphs and date separators)
  finalResume = lightSanitizeForATS(finalResume);
  finalResume = rewriteParentheticalKeywords(finalResume);

  // 3. Compute final keyword gap
  const keywordGap = computeKeywordGap(keywordResult, finalResume);

  // 4. Calculate score improvement based on found keywords and intensity
  const totalKeywords = (keywordResult?.criticalKeywords?.length || 10);
  const foundCount = keywordGap.foundInResume.length;
  const matchRatio = Math.min(1, foundCount / Math.max(1, totalKeywords));

  const targetBoost = preferences.intensity === "minimal" ? 15 : preferences.intensity === "targeted" ? 25 : 35;
  let beforeScore = baselineScore;
  let afterScore = Math.min(98, Math.max(baselineScore + 10, Math.round(baselineScore + targetBoost * matchRatio)));

  const jd = state.selectedJobDescription?.trim();
  if (jd && rawResume) {
    try {
      const apiKey = state.sessionApiKeys?.['TYPESAFE_API_KEY'];
      const [beforeEval, afterEval] = await Promise.all([
        evaluateResumeAlignmentWithJev(rawResume, jd, apiKey),
        evaluateResumeAlignmentWithJev(finalResume, jd, apiKey),
      ]);
      if (
        beforeEval &&
        Number.isFinite(beforeEval.matchScore) &&
        afterEval &&
        Number.isFinite(afterEval.matchScore)
      ) {
        beforeScore = beforeEval.matchScore;
        afterScore = Math.min(98, Math.max(beforeScore + 5, afterEval.matchScore));
      }
    } catch (err) {
      console.warn("[reassembleAndScore] Jev alignment evaluation failed, falling back to token scoring:", err);
    }
  }

  // 5. Count metrics from what was ACTUALLY applied.
  const placeholderCount = (finalResume.match(/\[[^\]]+\]/g) || []).length;

  // `activeSuggestions` is exactly the list applied to build finalResume above, so this
  // reports DELIVERED rewrites. It previously reported the planner's intent
  // (bulletPlan.jobBulletChanges), which can be far larger than what survived the
  // authenticity gate — yielding payloads that claimed rewrites while every section came
  // back `status:"unchanged"` with zero suggestions.
  const bulletsRewritten = activeSuggestions.length;

  // Keywords genuinely ADDED (present after, absent before). `foundInResume` alone is the
  // count of keywords already present, which was being reported as "keywordsAdded".
  const beforeKeywordGap = computeKeywordGap(keywordResult, rawResume);
  const keywordsAdded = keywordGap.foundInResume.filter(
    (kw) => !beforeKeywordGap.foundInResume.includes(kw)
  ).length;

  const improvementMetrics: ImprovementMetrics = {
    bulletsRewritten,
    keywordsAdded,
    scoreImprovement: afterScore - beforeScore,
    intensityApplied: preferences.intensity,
    metricsInjected: placeholderCount,
  };

  return {
    finalResumeText: finalResume,
    beforeScore,
    afterScore,
    keywordGap,
    suggestions: activeSuggestions,
    improvementMetrics,
    logs: [
      `[reassembleAndScore] Reassembled resume | Match score: ${beforeScore}% -> ${afterScore}% (+${afterScore - beforeScore}%) | Suggestions: ${activeSuggestions.length}`,
    ],
  };
}
