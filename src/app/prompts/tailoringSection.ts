/**
 * Section-level tailoring prompts for summary and experience bullets only.
 * Used when section-based tailoring is enabled: title/company/dates are copy-pasted; only bullets and summary are AI-tailored.
 */
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import { buildLeverInstructions } from "./tailoringPresets";

/**
 * Prompt to tailor only the Summary section. No contact, no experience structure—just the summary prose.
 */
export function getSummaryTailoringPrompt(params: {
  resume: string;
  jobDescription: string;
  jobTitle?: string;
  userInstructions?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
}): string {
  const { resume, jobDescription, jobTitle, userInstructions, userRequestedKeywords, preferences } = params;
  const jobTitleLine = jobTitle ? `\nTarget job title for the summary: "${jobTitle}". Use only in the summary (e.g. "${jobTitle} with X years...").` : "";
  const userBlock = userInstructions
    ? `\nUSER-SPECIFIC INSTRUCTIONS (follow these):\n${userInstructions}\n`
    : "";
  const keywordsBlock =
    userRequestedKeywords && userRequestedKeywords.length > 0
      ? `\nUSER-REQUESTED KEYWORDS TO WEAVE: ${userRequestedKeywords.join(", ")}\n`
      : "";
  const leverBlock = preferences ? `\n${buildLeverInstructions(preferences)}\n` : "";
  const hasUserRequests = !!(userInstructions || (userRequestedKeywords && userRequestedKeywords.length > 0) || preferences);
  const topUserBlock = hasUserRequests
    ? `

HIGHEST PRIORITY – USER PREFERENCES & CONTROLS (follow these first):
${leverBlock}${userBlock}${keywordsBlock}`
    : "";
  return `You are an expert resume writer. Tailor ONLY the Summary/Objective section for the job below.${topUserBlock}

RULES:
- Output ONLY the summary text (3–4 sentences or 3–4 bullets). No headers, no "## Summary", no contact, no other sections.
- Derive every claim from the resume. Do not add location, company name from the job posting, or domain concepts not in the resume.
- Omit articles (a, the, an). Use present participles (e.g. ", improving..." not "to improve").
- No "passionate about", "results-driven", or reader-addressing phrases. Factual, declarative only.
- Weave in 3–5 job-relevant keywords from the job description naturally. Do not list keywords. Never put keywords in parentheses (e.g. use "Python and Django" not "(Python, Django)").${jobTitleLine}

Resume:
"""
${resume}
"""

Job description:
"""
${jobDescription}
"""

Output only the summary text, nothing else.`;
}

/**
 * Prompt to tailor only the bullets for one job. Title, company, and dates are fixed and must not appear in your output.
 */
export function getExperienceBulletsPrompt(params: {
  jobTitle: string;
  company: string;
  dates: string | null;
  bulletsText: string;
  jobDescription: string;
  resumeContext?: string;
  userInstructions?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
}): string {
  const { jobTitle, company, dates, bulletsText, jobDescription, userInstructions, userRequestedKeywords, preferences } = params;
  const userBlock = userInstructions
    ? `\nUSER-SPECIFIC INSTRUCTIONS (follow these):\n${userInstructions}\n`
    : "";
  const keywordsBlock =
    userRequestedKeywords && userRequestedKeywords.length > 0
      ? `\nTARGET KEYWORDS TO WEAVE: ${userRequestedKeywords.join(", ")}\n`
      : "";
  const leverBlock = preferences ? `\n${buildLeverInstructions(preferences)}\n` : "";
  const hasUserRequests = !!(userInstructions || (userRequestedKeywords && userRequestedKeywords.length > 0) || preferences);
  const topUserBlock = hasUserRequests
    ? `

HIGHEST PRIORITY – USER PREFERENCES & CONTROLS (follow these first):
${leverBlock}${userBlock}${keywordsBlock}`
    : "";

  return `You are an elite executive resume writer. Tailor the bullet points for this specific role against the target job description.
${topUserBlock}
TARGET ROLE METADATA (context boundary - do not repeat):
- Title: ${jobTitle}
- Company: ${company}
- Dates: ${dates || "—"}

TARGET JOB DESCRIPTION:
"""
${jobDescription.slice(0, 2500)}
"""

ORIGINAL BULLETS FOR THIS ROLE:
"""
${bulletsText}
"""

CRITICAL INSTRUCTIONS:
1. STRICT 1-TO-1 MAPPING: For every original bullet, generate exactly one enhanced version. Do NOT merge bullets, split bullets, delete bullets, or create new bullets.
2. ENHANCEMENT RULES:
   - Make ONLY substantive, meaningful improvements (adding target skills, technologies, quantified impact metrics, or stronger action verbs).
   - NEVER make trivial formatting modifications: DO NOT insert line breaks/newlines, alter whitespace, re-wrap lines, change bullet marker symbols, or tweak trailing punctuation.
   - If a bullet already adequately covers the role and does not require substantive tailoring, return the exact original text unchanged.
   - First bullet: Overview of responsibilities, team scope, core tech stack, product type, and methodology.
   - Remaining bullets: Action (strong past-tense verb) → Ingredients (technologies, tools, metrics) → Impact (quantified business or technical outcome).
   - Only weave in keywords that authentically reflect experience described in the original bullet. Never invent claims or put keywords in parentheses.
   - Omit articles (a, an, the). Use crisp resume phrasing.
3. OUTPUT FORMAT: Output ONLY a valid JSON array with the exact same number of items as the original bullets:
[
  {
    "index": 0,
    "originalText": "exact original bullet without leading dash",
    "suggestedText": "tailored bullet without leading dash",
    "status": "enhanced",
    "reason": "Tactical justification (e.g. Quantified latency reduction, added Go/Kubernetes keywords)",
    "keywords": ["Go", "Kubernetes"]
  }
]
Output ONLY a valid JSON array. Do not include markdown code fences, headers, or any other text.`;
}

/**
 * Prompt to synthesize a holistic career summary from the assembled resume.
 * Focuses on full career arc, core leadership/engineering scope, and signature competencies.
 * Zero contradictions with vetted experience, never a changelog of edits.
 */
export function getHolisticSummaryPrompt(params: {
  assembledResume: string;
  jobDescription: string;
  jobTitle?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
}): string {
  const { assembledResume, jobDescription, jobTitle, userRequestedKeywords = [], preferences } = params;
  const targetTitleLine = jobTitle ? `Target Role Title: "${jobTitle}"\n` : "";
  const keywordsLine =
    userRequestedKeywords.length > 0 ? `Target Keywords: ${userRequestedKeywords.join(", ")}\n` : "";
  const leverBlock = preferences ? `\n${buildLeverInstructions(preferences)}\n` : "";

  return `You are an elite executive resume writer. Write a cohesive, holistic Professional Summary (3–4 sentences) representing the candidate's ENTIRE career arc, tailored for the target role below.
${leverBlock}
${targetTitleLine}${keywordsLine}
CRITICAL INSTRUCTIONS:
- This is a HOLISTIC EXECUTIVE SUMMARY of the candidate's career as an organic whole, NOT a changelog of recent edits.
- Synthesize their complete trajectory: years of experience, core leadership/engineering scope, and signature technical proficiencies derived directly from the assembled resume.
- GUARANTEE ZERO CONTRADICTIONS: Every capability, tool, and achievement claimed must be 100% grounded in the vetted resume below.
- Do NOT use fluff ("passionate", "results-driven", "team player"). Use authoritative, factual declarative sentences with present participles where appropriate.
- Output ONLY the 3–4 sentence summary paragraph. No headers, no intro, no conversational remarks.

Assembled Resume:
"""
${assembledResume}
"""

Target Job Description:
"""
${jobDescription.slice(0, 3000)}
"""

Output only the summary text:`;
}
