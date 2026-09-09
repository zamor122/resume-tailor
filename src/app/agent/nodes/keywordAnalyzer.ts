import type { AgentState } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getJDInterpreterPrompt } from "@/app/prompts";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import {
  normalizeJDInterpreterResponse,
  extractKeywordsFrequencyBased,
  type JDInterpreterResult,
} from "@/app/utils/keyword-extraction";
import { cleanJobDescription } from "@/app/utils/jobDescriptionCleaner";

export async function keywordAnalyzerNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const jd = state.selectedJobDescription || state.rawJobDescription || "";
  const cleanedJD = cleanJobDescription(jd, { maxLength: 8000 });
  const resume = state.rawResume;

  let keywordResult: JDInterpreterResult;

  if (cleanedJD.length < 50) {
    keywordResult = {
      ...extractKeywordsFrequencyBased(resume),
      cleanedJobDescription: cleanedJD,
      jobTitle: state.jobTitle,
    };
  } else {
    try {
      const prompt = getJDInterpreterPrompt(
        cleanedJD,
        resume || undefined,
        state.jobTitle || state.candidateProfile?.primaryTitle
      );
      const res = await generateWithFallback(
        prompt,
        state.modelKey,
        { maxTokens: 800, temperature: 0.1 },
        state.sessionApiKeys
      );
      const parsed = parseJSONFromText<Record<string, unknown>>(res.text);
      if (parsed) {
        keywordResult = normalizeJDInterpreterResponse(parsed, cleanedJD);
      } else {
        keywordResult = {
          ...extractKeywordsFrequencyBased(cleanedJD),
          cleanedJobDescription: cleanedJD,
          jobTitle: state.jobTitle,
        };
      }
    } catch {
      keywordResult = {
        ...extractKeywordsFrequencyBased(cleanedJD),
        cleanedJobDescription: cleanedJD,
        jobTitle: state.jobTitle,
      };
    }
  }

  // Calculate missing keywords
  const resumeLower = resume.toLowerCase();
  const criticalKeywords = keywordResult.criticalKeywords || [];
  const missingCritical = criticalKeywords.filter((kw: string) => {
    const term = (kw || "").toLowerCase();
    if (term.length < 3) return false;
    const variations = [term, term.replace(/\s+/g, ""), term.replace(/\s+/g, "-"), term.replace(/\s+/g, "_")];
    return !variations.some((v) => resumeLower.includes(v));
  });

  const technicalKeywords = (keywordResult.keywords?.technical || [])
    .map((k) => k.term)
    .filter((term) => term && term.length > 2 && !resumeLower.includes(term.toLowerCase()));

  const allMissing = Array.from(new Set([...missingCritical, ...technicalKeywords])).slice(0, 20);

  // Baseline score estimation (0-100)
  const totalCritical = criticalKeywords.length || 1;
  const matchedCritical = totalCritical - missingCritical.length;
  const baselineScore = Math.min(95, Math.max(30, Math.round((matchedCritical / totalCritical) * 70 + 20)));

  return {
    keywordResult,
    selectedJobDescription: cleanedJD,
    sortedMissingKeywords: allMissing,
    baselineScore,
    jobTitle: keywordResult.jobTitle || state.jobTitle || state.candidateProfile?.primaryTitle,
    logs: [
      ...(state.logs || []),
      `[keywordAnalyzer] Baseline match score: ${baselineScore}%, ${allMissing.length} missing keywords identified`,
    ],
  };
}
