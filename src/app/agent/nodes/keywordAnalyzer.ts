import type { AgentState } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import { resolveStepModel } from "@/app/runtime/cost-guard";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import {
  normalizeJDInterpreterResponse,
  extractKeywordsFrequencyBased,
  type JDInterpreterResult,
} from "@/app/utils/keyword-extraction";
import { cleanJobDescription } from "@/app/utils/jobDescriptionCleaner";

function buildCompactKeywordPrompt(cleanedJD: string, resume: string, titleHint?: string): string {
  return `Extract high-weight ATS skills and keywords from this job description.
Do NOT repeat the job description text. Output ONLY valid JSON matching this schema:
{
  "jobTitle": "${titleHint || "Role Title"}",
  "criticalKeywords": ["up to 12 most important skills, tools, certifications, or domain terms"],
  "keywords": {
    "technical": [{"term": "skill or tool", "importance": "critical|high|medium", "importanceScore": 80, "frequency": 1}],
    "soft": [{"term": "competency", "importance": "high|medium", "importanceScore": 60, "frequency": 1}],
    "industry": [{"term": "domain term", "importance": "high|medium", "importanceScore": 70, "frequency": 1}]
  }
}

Rules:
- Exclude generic filler ("experience", "performs", "duties", "ensure", "ability", "team", "work", "support", "required", "years").
- Mark terms MISSING from the resume as higher importance.

Resume snippet:
${resume.slice(0, 2000)}

Job Description:
${cleanedJD.slice(0, 4500)}

JSON only:`;
}

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
      const prompt = buildCompactKeywordPrompt(
        cleanedJD,
        resume || "",
        state.jobTitle || state.candidateProfile?.primaryTitle
      );
      const res = await generateWithFallback(
        prompt,
        resolveStepModel("extractKeywords", state.modelKey),
        { maxTokens: 1200, temperature: 0.1 },
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
