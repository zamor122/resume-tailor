import type { AgentState, CandidateProfile } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import {
  classifySeniorityTier,
  extractSuccessPillars,
  buildCareerArcContext,
  type SeniorityTier,
} from "@/app/utils/seniorityClassifier";

const PROFILE_PROMPT = (resumeSnippet: string) => `
You are analyzing a resume to extract candidate profile information.
Output ONLY valid JSON with these fields:
{
  "primaryTitle": "most recent job title or target role",
  "seniorityLevel": "entry|mid|senior|lead_manager|executive",
  "topSkills": ["skill1", "skill2", ...up to 8 primary skills],
  "domain": "e.g. Full Stack Web, Cloud Infrastructure, Healthcare, Finance",
  "searchQuery": "concise search query to find matching job postings, e.g. Senior Full Stack Engineer remote"
}

Resume (first 1500 chars):
${resumeSnippet}

JSON only, no markdown:`;

export async function candidateProfilerNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const jd = state.rawJobDescription || state.selectedJobDescription || "";
  try {
    const snippet = state.rawResume.slice(0, 1500);
    const result = await generateWithFallback(
      PROFILE_PROMPT(snippet),
      state.modelKey,
      { maxTokens: 250, temperature: 0.1 },
      state.sessionApiKeys
    );

    const parsedProfile = parseJSONFromText<CandidateProfile>(result.text);

    const primaryTitle = parsedProfile?.primaryTitle || state.jobTitle || "Professional";
    const seniorityTier: SeniorityTier = classifySeniorityTier(primaryTitle, jd);
    const successPillars = extractSuccessPillars(jd, primaryTitle);
    const careerArc = buildCareerArcContext(state.resumeAST?.experience, parsedProfile?.domain);

    const profile: CandidateProfile = {
      primaryTitle,
      seniorityLevel: seniorityTier,
      seniorityTier,
      topSkills: parsedProfile?.topSkills || [],
      domain: parsedProfile?.domain || "General",
      searchQuery: parsedProfile?.searchQuery || `${primaryTitle} job opening`,
      successPillars,
      careerArc,
    };

    return {
      candidateProfile: profile,
      jobTitle: parsedProfile?.primaryTitle || state.jobTitle,
      seniorityTier,
      successPillars,
      careerArc,
      logs: [
        `[candidateProfiler] Profile extracted: ${profile.primaryTitle} (${profile.seniorityLevel})`,
      ],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const fallbackTitle = state.jobTitle || "Professional";
    const seniorityTier: SeniorityTier = classifySeniorityTier(fallbackTitle, jd);
    const successPillars = extractSuccessPillars(jd, fallbackTitle);
    const careerArc = buildCareerArcContext(state.resumeAST?.experience);

    return {
      candidateProfile: {
        primaryTitle: fallbackTitle,
        seniorityLevel: seniorityTier,
        seniorityTier,
        topSkills: [],
        domain: "General",
        searchQuery: `${fallbackTitle} job opening`,
        successPillars,
        careerArc,
      },
      seniorityTier,
      successPillars,
      careerArc,
      errors: [`[candidateProfiler] Fallback used: ${errMsg}`],
    };
  }
}
