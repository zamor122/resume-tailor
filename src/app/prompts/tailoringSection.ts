/**
 * Section-level tailoring prompts for summary and experience bullets only.
 * Used when section-based tailoring is enabled: title/company/dates are copy-pasted; only bullets and summary are AI-tailored.
 */
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import type { SeniorityTier } from "@/app/utils/seniorityClassifier";
import { buildLeverInstructions } from "./tailoringPresets";

/** Upper bound for an untrusted target company name injected into the privacy mandate. */
const MAX_COMPANY_NAME_LENGTH = 80;
/** Upper bound for the untrusted career arc context (longer than a company name, still bounded). */
const MAX_CAREER_ARC_LENGTH = 400;

/**
 * Neutralize an untrusted upstream/LLM string before interpolating it into a governing prompt block.
 * Collapses every whitespace run (newlines, tabs, etc.) into a single space, strips quote-like and
 * escape characters that could break out of the surrounding quoted instruction slot, and caps the
 * length so a pasted blob cannot dominate the prompt. Returns an empty string for non-string and
 * whitespace-only input so callers treat the value as absent.
 */
function sanitizeInjectedValue(value: string | undefined, maxLength: number): string {
  if (typeof value !== "string") return "";
  const collapsed = value.replace(/\s+/g, " ").replace(/["'`\\]/g, "").trim();
  if (!collapsed) return "";
  return collapsed.length > maxLength ? collapsed.slice(0, maxLength).trim() : collapsed;
}

/**
 * Tier-appropriate calibration guidance for universal level-calibrated prompting (REQ-UBI-01).
 * Returns an empty string when no tier is supplied (or only whitespace/an unknown tier) so existing
 * callers see no change and no dangling header is emitted.
 */
function buildSeniorityCalibration(seniorityTier?: SeniorityTier): string {
  const tier = typeof seniorityTier === "string" ? seniorityTier.trim() : "";
  if (!tier) return "";
  const tierGuidance: Record<SeniorityTier, string> = {
    executive:
      "Emphasize enterprise-level workflow orchestration, executive stakeholder alignment, resource governance, and the full scope of team leadership. Frame outcomes as organizational strategy and P&L-level accountability.",
    lead_manager:
      "Emphasize workflow orchestration, stakeholder alignment, resource governance, and team leadership scope (headcount, scheduling, performance, cross-department coordination).",
    senior:
      "Emphasize strategic trade-offs, mentoring and developing others, risk mitigation, and personal ownership of end-to-end outcomes.",
    mid: "Emphasize execution rigor, procedural delivery, and dependable hands-on contribution within established workflows.",
    entry:
      "Emphasize execution rigor, procedural delivery, and hands-on contribution that demonstrates readiness to grow.",
  };
  const guidance = tierGuidance[tier as SeniorityTier];
  if (!guidance) return "";
  return `SENIORITY CALIBRATION — TARGET TIER: ${tier}
- Calibrate every claim to the "${tier}" level; do not overstate or understate scope.
- ${guidance}`;
}

/**
 * Depth guidance graduated by how recent a role is (REQ-EVT-02).
 * Returns an empty string when no tier is supplied (or only whitespace) so existing callers see no
 * change and no dangling header is emitted.
 */
function buildRecencyDepthGuidance(recencyTier?: string): string {
  const tier = typeof recencyTier === "string" ? recencyTier.trim() : "";
  if (!tier) return "";
  const tierGuidance: Record<string, string> = {
    recent_deep:
      "Give these achievements maximum depth: highlight strategic scope, leadership ownership, and detailed, substantiated outcomes.",
    mid_career:
      "Keep these achievements concise, emphasizing transferable competencies and proven milestones.",
    foundational:
      "Keep these achievements brief and authentic: baseline execution, core responsibilities, and early-career milestones.",
  };
  const guidance =
    tierGuidance[tier] ||
    "Match depth to the recency of the role: more detail for recent roles, less for older ones.";
  return `RECENCY-ADJUSTED DEPTH — TIER: ${tier}
- ${guidance}`;
}

/**
 * Background positioning context describing the candidate's career arc (REQ-EVT-03).
 * Returns an empty string when no arc is supplied so existing callers see no change.
 * The arc is upstream/LLM-derived, so it is neutralized before interpolation.
 */
function buildCareerArcBlock(careerArc?: string): string {
  const safeArc = sanitizeInjectedValue(careerArc, MAX_CAREER_ARC_LENGTH);
  if (!safeArc) return "";
  return `CAREER ARC CONTEXT (background positioning only — do NOT quote verbatim into bullets):
${safeArc}`;
}

/**
 * Absolute prohibition on leaking the target employer's name into generated copy (REQ-UBI-02, REQ-ERR-01).
 * Returns an empty string when no target company is supplied so existing callers see no change.
 * The company name is JD-derived, so quotes/newlines/escapes are stripped and the length capped before
 * it is interpolated into this governing block; benign names pass through byte-identical.
 */
function buildCompanyPrivacyBlock(targetCompany?: string): string {
  const safeTarget = sanitizeInjectedValue(targetCompany, MAX_COMPANY_NAME_LENGTH);
  if (!safeTarget) return "";
  return `STRICT COMPANY PRIVACY MANDATE:
- DO NOT mention "${safeTarget}" anywhere in your output. The target employer is NOT part of the candidate's work history.
- The ONLY company names permitted in your output are the candidate's actual employers listed in their experience history.
- Never imply the candidate worked at, was employed by, or was contracted to the target employer.
- When organizational context is required, refer to "the organization" or a neutral description instead.`;
}

/**
 * Universal mandate that achievements read as transferable professional excellence (REQ-UBI-03).
 */
const REUSABLE_ACCOMPLISHMENTS_BLOCK = `REUSABLE PROFESSIONAL ACCOMPLISHMENTS:
- Frame all achievements as industry-standard excellence reusable for similar roles across employers.
- Do NOT tailor wording so narrowly that it only makes sense for one specific employer; express achievements at the role and industry level.`;

/**
 * Universal ban on invented percentage metrics in favor of authentic, verifiable scope.
 */
const AUTHENTIC_METRICS_BLOCK = `AUTHENTIC METRICS ONLY:
- Do NOT invent artificial percentage metrics (e.g. "by 35%", "increased revenue 40%") unless the original text states them.
- Instead quantify with authentic scope, volume, headcount, compliance standards, or concrete operational outcomes.`;

/**
 * Prompt to tailor only the Summary section. No contact, no experience structure—just the summary prose.
 */
export function getSummaryTailoringPrompt(params: {
  summaryText?: string;
  resume?: string;
  jobDescription: string;
  jobTitle?: string;
  userInstructions?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
}): string {
  const { summaryText, resume, jobDescription, jobTitle, userInstructions, userRequestedKeywords, preferences } = params;
  const originalSummary = summaryText || resume || "";
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
  return `You are an expert resume writer. Tailor ONLY the candidate's existing Summary/Objective section for the job below.${topUserBlock}

RULES:
- ZERO THINKING / PREAMBLE LEAK: DO NOT output thinking traces, <think> tags, chain-of-thought analysis, or introductory remarks (such as "*Analyze User Input:**"). Begin your output directly with the tailored summary text.
- Output ONLY the summary text (3–4 sentences or 3–4 bullets). No headers, no "## Summary", no contact, no experience, no other sections.
- Derive every claim strictly from the candidate's existing summary below. Do NOT add company names, job titles, or experience details from outside this summary.
- Omit articles (a, the, an). Use present participles (e.g. ", improving..." not "to improve").
- BANNED REPETITIVE BUZZWORDS: Zero "passionate about", "results-driven", "leveraging", "spearheaded", "pivotal", or reader-addressing phrases. Factual, authoritative, declarative only.
- Weave in 3–5 job-relevant keywords from the job description naturally with diverse sentence syntax. Do not list keywords. Never put keywords in parentheses (e.g. use "Python and Django" not "(Python, Django)").${jobTitleLine}

Candidate's Current Summary (Context Chunk):
"""
${originalSummary}
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
  seniorityTier?: SeniorityTier;
  recencyTier?: string;
  careerArc?: string;
  targetCompany?: string;
}): string {
  const {
    jobTitle,
    company,
    dates,
    bulletsText,
    jobDescription,
    userInstructions,
    userRequestedKeywords,
    preferences,
    seniorityTier,
    recencyTier,
    careerArc,
    targetCompany,
  } = params;
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

  const governingBlock = [
    buildSeniorityCalibration(seniorityTier),
    buildRecencyDepthGuidance(recencyTier),
    buildCareerArcBlock(careerArc),
    buildCompanyPrivacyBlock(targetCompany),
    REUSABLE_ACCOMPLISHMENTS_BLOCK,
    AUTHENTIC_METRICS_BLOCK,
  ]
    .filter(Boolean)
    .join("\n\n");

  const bulletLines = bulletsText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletCount = bulletLines.length;

  return `You are an elite executive resume writer. Tailor the bullet points for this specific role against the target job description.

${governingBlock}
${topUserBlock}
TARGET ROLE METADATA (context boundary - do not repeat):
- Title: ${jobTitle}
- Company: ${company}
- Dates: ${dates || "—"}

TARGET JOB DESCRIPTION:
"""
${jobDescription.slice(0, 2500)}
"""

ORIGINAL BULLETS FOR THIS ROLE (${bulletCount} bullets total):
"""
${bulletsText}
"""

CRITICAL INSTRUCTIONS:
1. STRICT 1-TO-1 MAPPING: You are provided with EXACTLY ${bulletCount} bullets. You MUST return a JSON array containing EXACTLY ${bulletCount} items, one for every input bullet in the exact order received (with index from 0 to ${Math.max(0, bulletCount - 1)}).
   - DO NOT stop after 1 item! You MUST include all ${bulletCount} items in your JSON array response.
   - Do NOT merge bullets, split bullets, delete bullets, or create new bullets.
2. ENHANCEMENT RULES & ANTI-REPETITION MANDATE:
   - ZERO THINKING / PREAMBLE LEAK: DO NOT output any internal thoughts, <think> tags, chain-of-thought analysis, or commentary (such as "*Analyze User Input:**"). Output ONLY the valid JSON array starting directly with [ and ending with ].
   - Make ONLY substantive, meaningful improvements (adding target skills, technologies, quantified impact metrics, or stronger action verbs).
   - NEVER make trivial formatting modifications: DO NOT insert line breaks/newlines, alter whitespace, re-wrap lines, change bullet marker symbols, or tweak trailing punctuation.
   - If a bullet already adequately covers the role and does not require substantive tailoring, return the exact original text unchanged with status: "unchanged".
   - NO REPETITIVE OPENING VERBS: Each enhanced bullet within this role MUST begin with a DISTINCT, varied past-tense action verb. NEVER repeat the same opening verb (e.g. do NOT use "Architected", "Spearheaded", or "Engineered" on more than one bullet). Use varied, precise verbs suited to the work: Accelerated, Benchmarked, Consolidated, Decoupled, Deployed, Standardized, Automated, Revamped, Authored, Refactored, Scaled, Designed, Instituted.
   - NO COOKIE-CUTTER CLAUSE FORMULAS: DO NOT repeat the exact same sentence pattern across bullets. Avoid repeatedly ending bullets with ", resulting in X% [metric]" or ", driving X% [metric]" or ", achieving X% [metric]". Vary the sentence cadence:
     * Architecture & Technical Depth: Problem solved → Architecture/tool chosen → Measurable latency/throughput result.
     * Scale & Systems Engineering: Throughput/volume handled → Resiliency/fault tolerance standard → Business continuity win.
     * Developer Velocity & Best Practices: Tooling instituted → Cross-functional adoption → Delivery speed impact.
   - BANNED REPETITIVE AI FILLER: Strictly ban repetitive clichés: "leveraging", "spearheaded", "pivotal", "fostered", "testament to", "streamlined", "driving operational excellence", "seamlessly".
   - CONTEXTUAL KEYWORD WEAVING: Weave at most 1–2 target keywords per bullet where they naturally and authentically fit. DO NOT cram the same keywords into every bullet.
   - Omit articles (a, an, the). Use crisp, executive resume phrasing.
3. OUTPUT FORMAT: Output ONLY a valid JSON array of ${bulletCount} objects:
[
  {
    "index": 0,
    "originalText": "exact original bullet 0 without leading bullet marker",
    "suggestedText": "tailored bullet 0 without leading bullet marker",
    "status": "enhanced",
    "reason": "Tactical justification (e.g. Quantified latency reduction, added Go/Kubernetes keywords)",
    "keywords": ["Go", "Kubernetes"]
  },
  {
    "index": 1,
    "originalText": "exact original bullet 1 without leading bullet marker",
    "suggestedText": "tailored bullet 1 without leading bullet marker",
    "status": "enhanced",
    "reason": "Strengthened action verb and ATS terminology",
    "keywords": ["TypeScript", "Microservices"]
  }
]
Output ONLY the valid JSON array of ${bulletCount} objects. Do not include markdown code fences, headers, or any other text.`;
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
  seniorityTier?: SeniorityTier;
}): string {
  const { assembledResume, jobDescription, jobTitle, userRequestedKeywords = [], preferences, seniorityTier } = params;
  const targetTitleLine = jobTitle ? `Target Role Title: "${jobTitle}"\n` : "";
  const keywordsLine =
    userRequestedKeywords.length > 0 ? `Target Keywords: ${userRequestedKeywords.join(", ")}\n` : "";
  const leverBlock = preferences ? `\n${buildLeverInstructions(preferences)}\n` : "";
  const seniorityCalibration = buildSeniorityCalibration(seniorityTier);
  const seniorityBlock = seniorityCalibration ? `\n${seniorityCalibration}\n` : "";

  return `You are an elite executive resume writer. Write a cohesive, holistic Professional Summary (3–4 sentences) representing the candidate's ENTIRE career arc, tailored for the target role below.
${leverBlock}
${targetTitleLine}${keywordsLine}${seniorityBlock}
CRITICAL INSTRUCTIONS:
- ZERO THINKING / PREAMBLE LEAK: DO NOT output any thinking trace, <think> tags, chain-of-thought analysis, or introductory remarks (such as "*Analyze User Input:**").
- This is a HOLISTIC EXECUTIVE SUMMARY of the candidate's career as an organic whole, NOT a changelog of recent edits.
- Synthesize their complete trajectory: years of experience, core leadership/engineering scope, and signature technical proficiencies derived directly from the assembled resume.
- GUARANTEE ZERO CONTRADICTIONS: Every capability, tool, and achievement claimed must be 100% grounded in the vetted resume below.
- BANNED BUZZWORDS: Do NOT use fluff or repetitive filler ("passionate", "results-driven", "team player", "leveraging", "spearheaded", "pivotal role"). Use authoritative, factual declarative sentences.
- Vary sentence syntax and cadence; avoid repetitive sentence structures.
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
