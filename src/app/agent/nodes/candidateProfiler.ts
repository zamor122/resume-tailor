import type { AgentState, CandidateProfile } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import { parseJSONFromText } from "@/app/utils/json-extractor";

const PROFILE_PROMPT = (resumeSnippet: string) => `
You are analyzing a resume to extract candidate profile information.
Output ONLY valid JSON with these fields:
{
  "primaryTitle": "most recent job title or target role",
  "seniorityLevel": "entry|mid|senior|staff|principal|executive",
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
  try {
    const snippet = state.rawResume.slice(0, 1500);
    const result = await generateWithFallback(
      PROFILE_PROMPT(snippet),
      state.modelKey,
      { maxTokens: 250, temperature: 0.1 },
      state.sessionApiKeys
    );

    const profile = parseJSONFromText<CandidateProfile>(result.text);

    return {
      candidateProfile: profile ?? {
        primaryTitle: "Professional",
        seniorityLevel: "mid",
        topSkills: [],
        domain: "General",
        searchQuery: "professional job opening",
      },
      jobTitle: profile?.primaryTitle || state.jobTitle,
      logs: [
        ...(state.logs || []),
        `[candidateProfiler] Profile extracted: ${profile?.primaryTitle || "Professional"} (${profile?.seniorityLevel || "mid"})`,
      ],
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      candidateProfile: {
        primaryTitle: "Professional",
        seniorityLevel: "mid",
        topSkills: [],
        domain: "General",
        searchQuery: "professional job opening",
      },
      errors: [...(state.errors || []), `[candidateProfiler] Fallback used: ${errMsg}`],
    };
  }
}
