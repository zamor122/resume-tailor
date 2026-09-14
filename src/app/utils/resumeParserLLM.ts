import { generateWithFallback } from "@/app/services/model-fallback";
import { getResumeParserPrompt } from "@/app/prompts/resumeParserPrompt";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import { parseResume, type ParsedResume } from "@/app/utils/resumeParser";

/**
 * Sanitizes and normalizes an unknown LLM JSON output into a valid ParsedResume AST.
 */
export function sanitizeParsedResumeAST(data: any): ParsedResume {
  const contactInfo = {
    name: typeof data?.contactInfo?.name === "string" ? data.contactInfo.name : null,
    email: typeof data?.contactInfo?.email === "string" ? data.contactInfo.email : null,
    phone: typeof data?.contactInfo?.phone === "string" ? data.contactInfo.phone : null,
    location: typeof data?.contactInfo?.location === "string" ? data.contactInfo.location : null,
    linkedin: typeof data?.contactInfo?.linkedin === "string" ? data.contactInfo.linkedin : null,
    portfolio: typeof data?.contactInfo?.portfolio === "string" ? data.contactInfo.portfolio : null,
  };

  const experience = Array.isArray(data?.experience)
    ? data.experience
        .filter((e: any) => e && (e.company || e.title || e.description))
        .map((e: any) => ({
          title: String(e.title || "Software Engineer").trim(),
          company: String(e.company || "Company").trim(),
          dates: e.dates ? String(e.dates).trim() : null,
          location: e.location ? String(e.location).trim() : null,
          description: String(e.description || "").trim(),
        }))
    : [];

  const education = Array.isArray(data?.education)
    ? data.education
        .filter((ed: any) => ed && (ed.degree || ed.institution))
        .map((ed: any) => ({
          degree: String(ed.degree || "").trim(),
          institution: String(ed.institution || "").trim(),
          field: ed.field ? String(ed.field).trim() : null,
          dates: ed.dates ? String(ed.dates).trim() : null,
          gpa: ed.gpa ? String(ed.gpa).trim() : null,
        }))
    : [];

  const technicalSkills = Array.isArray(data?.skills?.technical)
    ? data.skills.technical
        .filter((s: any) => s !== null && s !== undefined)
        .map((s: any) => String(s).trim())
        .filter((s: string) => s.length > 0 && s.toLowerCase() !== "null")
    : [];

  const softSkills = Array.isArray(data?.skills?.soft)
    ? data.skills.soft
        .filter((s: any) => s !== null && s !== undefined)
        .map((s: any) => String(s).trim())
        .filter((s: string) => s.length > 0 && s.toLowerCase() !== "null")
    : [];

  const sections: string[] = [];
  if (data?.summary) sections.push("Summary");
  if (experience.length > 0) sections.push("Experience");
  if (technicalSkills.length > 0 || softSkills.length > 0) sections.push("Skills");
  if (education.length > 0) sections.push("Education");

  return {
    contactInfo,
    sections,
    experience,
    education,
    skills: {
      technical: technicalSkills,
      soft: softSkills,
      languages: [],
      certifications: [],
    },
    summary: typeof data?.summary === "string" && data.summary.trim() ? data.summary.trim() : null,
  };
}

/**
 * Parses a raw resume using an LLM with strict verbatim extraction and security directives.
 *
 * Guarantees:
 * 1. Maximum of 3 bounded attempts to prevent infinite loops.
 * 2. Any prompt injection or command inside the resume is treated as passive read-only text.
 * 3. Graceful fallback to deterministic parseResume if all LLM attempts fail or return empty data.
 */
export async function parseResumeWithLLM(
  rawResume: string,
  modelKey?: string,
  sessionApiKeys?: Record<string, string>,
  maxAttempts: number = 3
): Promise<ParsedResume> {
  if (!rawResume || !rawResume.trim()) {
    return parseResume("");
  }

  const prompt = getResumeParserPrompt(rawResume);
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await generateWithFallback(
        prompt,
        modelKey,
        {
          maxTokens: 2500,
          temperature: 0.0,
        },
        sessionApiKeys
      );

      const parsedJson = parseJSONFromText(response.text);
      if (parsedJson && (parsedJson.experience || parsedJson.summary || parsedJson.skills)) {
        const sanitized = sanitizeParsedResumeAST(parsedJson);
        // If we got at least one experience job or a summary, return the AST
        if (sanitized.experience.length > 0 || sanitized.summary) {
          return sanitized;
        }
      }

      console.warn(`[resumeParserLLM] Attempt ${attempt}/${maxAttempts}: LLM output lacked expected structure.`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[resumeParserLLM] Attempt ${attempt}/${maxAttempts} failed:`, lastError.message);
    }
  }

  // Fallback safety net: deterministic regex parser
  console.warn(
    "[resumeParserLLM] All LLM attempts exhausted. Falling back to deterministic resume parser.",
    lastError?.message
  );
  return parseResume(rawResume);
}
