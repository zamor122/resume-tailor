import type { AgentState } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import { resolveStepModel } from "@/app/runtime/cost-guard";
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
        // Structured-extraction node -> penny engine when keyed, free chain otherwise.
        resolveStepModel("extractKeywords", state.modelKey),
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

  // Filter out generic JD filler words that are not real ATS skills/keywords
  const GENERIC_JD_STOPWORDS = new Set([
    "performs", "perform", "duties", "duty", "ensure", "ensures", "ensuring",
    "ability", "experience", "responsibilities", "responsibility", "requirements",
    "requirement", "required", "preferred", "including", "include", "related",
    "strong", "excellent", "working", "support", "supports", "provide", "provides",
    "assist", "assists", "maintain", "maintains", "various", "other", "using",
    "based", "within", "across", "must", "able", "skills", "skill", "knowledge",
    "years", "year", "work", "role", "position", "team", "company", "organization",
    "candidate", "candidates", "ideal", "looking", "seeking", "join", "help",
  ]);

  const isRealKeyword = (kw: string): boolean => {
    const term = (kw || "").trim().toLowerCase();
    return term.length >= 3 && !GENERIC_JD_STOPWORDS.has(term);
  };

  // Calculate missing keywords
  const resumeLower = resume.toLowerCase();
  const criticalKeywords = (keywordResult.criticalKeywords || []).filter(isRealKeyword);
  const missingCritical = criticalKeywords.filter((kw: string) => {
    const term = (kw || "").toLowerCase();
    const variations = [term, term.replace(/\s+/g, ""), term.replace(/\s+/g, "-"), term.replace(/\s+/g, "_")];
    return !variations.some((v) => resumeLower.includes(v));
  });

  const technicalKeywords = (keywordResult.keywords?.technical || [])
    .map((k) => k.term)
    .filter((term) => isRealKeyword(term) && !resumeLower.includes(term.toLowerCase()));

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
      `[keywordAnalyzer] Baseline match score: ${baselineScore}%, ${allMissing.length} missing keywords identified`,
    ],
  };
}
