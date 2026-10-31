/**
 * Section-level tailoring prompts for summary and experience bullets only.
 * Used when section-based tailoring is enabled: title/company/dates are copy-pasted; only bullets and summary are AI-tailored.
 */
import type { JevDiagnosticResult } from "@/app/services/jev";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import type { SeniorityTier } from "@/app/utils/seniorityClassifier";
import type { DomainTaxonomyConfig } from "@/app/config/domainTaxonomy";
import type { JobRoleKnowledge } from "@/app/services/jobKnowledge";
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
function buildSeniorityCalibration(seniorityTier?: SeniorityTier | string): string {
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
function buildAuthenticMetricsBlock(
  domainTaxonomy?: DomainTaxonomyConfig,
  jobKnowledge?: JobRoleKnowledge
): string {
  const metricExamples = jobKnowledge?.authenticMetricTypes?.length
    ? jobKnowledge.authenticMetricTypes.slice(0, 5).join(", ")
    : domainTaxonomy?.authenticMetricExamples?.length
    ? domainTaxonomy.authenticMetricExamples.slice(0, 5).join(", ")
    : "";

  const exampleSuffix = metricExamples ? ` (e.g. ${metricExamples})` : "";

  return `AUTHENTIC METRICS ONLY:
- Do NOT invent artificial percentage metrics (e.g. "by 35%", "increased revenue 40%") unless the original text states them.
- Instead quantify with authentic scope, volume, headcount, compliance standards, or concrete operational outcomes${exampleSuffix}.`;
}

const AUTHENTIC_METRICS_BLOCK = buildAuthenticMetricsBlock();

/**
 * Role and domain taxonomy calibration guidance ensuring native vocabulary and zero tech jargon bias.
 */
function buildDomainCalibrationBlock(
  domainTaxonomy?: DomainTaxonomyConfig,
  jobKnowledge?: JobRoleKnowledge
): string {
  if (!domainTaxonomy && !jobKnowledge) return "";

  const category = jobKnowledge?.industryCategory || domainTaxonomy?.category || "general_business";
  const title = jobKnowledge?.canonicalTitle || domainTaxonomy?.displayName || "the profession";
  const isTechRole = category === "technology_engineering";

  const lines: string[] = [`DOMAIN-SPECIFIC CALIBRATION (${domainTaxonomy?.displayName || title}):`];

  if (!isTechRole) {
    lines.push(
      `- CRITICAL DOMAIN VOCABULARY GUARDRAIL: DO NOT use software-engineering or tech jargon (such as "architected", "refactored", "automated software", "microservices", "codebase") for this non-technical role. Ground all phrasing strictly in ${title}'s authentic operational environment.`
    );
  }

  if (domainTaxonomy?.evaluationDirectives && domainTaxonomy.evaluationDirectives.length > 0) {
    lines.push(`- Role Directives: ${domainTaxonomy.evaluationDirectives.join("; ")}.`);
  }

  if (jobKnowledge?.coreCompetencies && jobKnowledge.coreCompetencies.length > 0) {
    lines.push(`- Target Core Competencies: ${jobKnowledge.coreCompetencies.slice(0, 6).join(", ")}.`);
  }

  return lines.join("\n");
}

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
 * Options for configuring experience bullet prompt generation.
 */
export interface ExperiencePromptOptions {
  recencyTier?: 'tier1_recent' | 'tier2_mid' | 'tier3_foundational' | string;
  seniorityTier?: string;
  successPillars?: string[];
  careerArc?: string;
  intensity?: string;
  relevantKeywords?: string[];
  vettedEmployers?: string[];
  targetCompany?: string;
  diagnosis?: JevDiagnosticResult;
  userInstructions?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
  domainTaxonomy?: DomainTaxonomyConfig;
  jobKnowledge?: JobRoleKnowledge;
}

export interface ExperiencePromptTarget {
  title?: string;
  jobTitle?: string;
  company?: string;
  dates?: string | null;
  description?: string;
  bulletsText?: string;
}

export type ExperienceBulletsPromptParams = ExperiencePromptOptions & {
  jobTitle?: string;
  title?: string;
  company?: string;
  dates?: string | null;
  bulletsText?: string;
  description?: string;
  jobDescription?: string;
  resumeContext?: string;
};

/**
 * Prompt to tailor only the bullets for one job. Title, company, and dates are fixed and must not appear in your output.
 */
export function getExperienceBulletsPrompt(
  exp: ExperiencePromptTarget,
  jobDescription: string,
  options?: ExperiencePromptOptions
): string;
export function getExperienceBulletsPrompt(
  params: ExperienceBulletsPromptParams
): string;
export function getExperienceBulletsPrompt(
  expOrParams: ExperiencePromptTarget | ExperienceBulletsPromptParams,
  maybeJobDescription?: string,
  maybeOptions?: ExperiencePromptOptions
): string {
  let jobTitle = "";
  let company = "";
  let dates: string | null = null;
  let bulletsText = "";
  let jobDescription = "";
  let options: ExperiencePromptOptions = {};

  if (typeof maybeJobDescription === "string") {
    const exp = expOrParams as ExperiencePromptTarget;
    jobTitle = exp.title || exp.jobTitle || "";
    company = exp.company || "";
    dates = exp.dates || null;
    bulletsText = exp.description || exp.bulletsText || "";
    jobDescription = maybeJobDescription;
    options = maybeOptions || {};
  } else {
    const params = expOrParams as ExperienceBulletsPromptParams;
    jobTitle = params.jobTitle || params.title || "";
    company = params.company || "";
    dates = params.dates || null;
    bulletsText = params.bulletsText || params.description || "";
    jobDescription = params.jobDescription || "";
    options = params;
  }

  const userInstructions = options.userInstructions;
  const userRequestedKeywords = options.userRequestedKeywords || options.relevantKeywords;
  const preferences = options.preferences;
  const seniorityTier = options.seniorityTier as SeniorityTier | undefined;
  const recencyTier = options.recencyTier;
  const careerArc = options.careerArc;
  const targetCompany = options.targetCompany;

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

  const domainTaxonomy = options.domainTaxonomy;
  const jobKnowledge = options.jobKnowledge;

  const governingBlock = [
    buildSeniorityCalibration(seniorityTier),
    buildRecencyDepthGuidance(recencyTier),
    buildCareerArcBlock(careerArc),
    buildCompanyPrivacyBlock(targetCompany),
    buildDomainCalibrationBlock(domainTaxonomy, jobKnowledge),
    REUSABLE_ACCOMPLISHMENTS_BLOCK,
    buildAuthenticMetricsBlock(domainTaxonomy, jobKnowledge),
  ]
    .filter(Boolean)
    .join("\n\n");

  const hasDomainVerbs = Boolean(
    (jobKnowledge?.powerVerbs && jobKnowledge.powerVerbs.length > 0) ||
    (domainTaxonomy?.primaryVerbs && domainTaxonomy.primaryVerbs.length > 0)
  );

  const verbsExample = hasDomainVerbs
    ? (jobKnowledge?.powerVerbs?.length ? jobKnowledge.powerVerbs : domainTaxonomy!.primaryVerbs).slice(0, 14).join(", ")
    : "Orchestrated, Architected, Engineered, Overhauled, Scaled, Standardized, Automated, Deployed, Revamped, Authored, Refactored, Delivered, Designed, Instituted, Accelerated";

  const domainBanned = domainTaxonomy?.bannedClichés?.length
    ? `, and domain clichés: ${domainTaxonomy.bannedClichés.map((c) => `"${c}"`).join(", ")}`
    : "";

  const bulletLines = bulletsText
    ? bulletsText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const bulletCount = bulletLines.length;

  return `You are an elite executive resume writer. Tailor the bullet points for this specific role against the target job description.

${governingBlock}
${
  options?.diagnosis
    ? `
=== JEV SYSTEM 1 DIAGNOSTIC DIRECTIVES ===
- Primary Focus Directive: ${options.diagnosis.enhancementFocus}
- High-Priority Competencies to Highlight (if supported by background): ${options.diagnosis.missingSkills && options.diagnosis.missingSkills.length > 0 ? options.diagnosis.missingSkills.join(', ') : 'Align with JD priorities'}
- Historical Scope Calibration: Match Rating ${options.diagnosis.seniorityScore}/5 for target ${options.seniorityTier || 'role'}
`
    : ''
}${topUserBlock}
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
2. ENHANCEMENT RULES & MAXIMUM IMPACT MANDATE:
   - ZERO THINKING / PREAMBLE LEAK: DO NOT output any internal thoughts, <think> tags, chain-of-thought analysis, or commentary (such as "*Analyze User Input:**"). Output ONLY the valid JSON array starting directly with [ and ending with ].
   - HIGH-IMPACT GOOGLE X-Y-Z STRUCTURE: Reframe candidate achievements into the high-impact pattern: Accomplished [X], as measured by [Y], by doing [Z]. State what was achieved, the measurable scale/metric/operational impact, and the exact strategic action taken.
   - BAN WEAK & PASSIVE PHRASING: NEVER use weak, subordinate, or passive phrasing such as "Assisted with", "Helped", "Worked on", "Responsible for", "Participated in", "Contributed to", "Handled", or "Supported". Every enhanced bullet MUST position the candidate as the primary driver and decisive owner of the result.
   - EXECUTIVE OWNERSHIP ACTION VERBS: Open each enhanced bullet with a powerful, authoritative past-tense action verb (e.g. ${verbsExample}).
   - BAN SUPERFICIAL WORD SWAPS: DO NOT make cosmetic, low-value synonym swaps (e.g. replacing "used" with "utilized"). Enhancements must substantively elevate the candidate's seniority, technical/business scope, operational scale, or target competency alignment.
   - AUTHENTIC QUANTIFICATION: Quantify using concrete scope, volume, throughput, latency, headcount, compliance standards, or business impact derived from the context. Do NOT fabricate artificial percentages or fictitious employers.
   - If a bullet already adequately covers the role and does not require substantive tailoring, return the exact original text unchanged with status: "unchanged".
   - NO REPETITIVE OPENING VERBS: Each enhanced bullet within this role MUST begin with a DISTINCT, varied past-tense action verb. NEVER repeat the same opening verb across bullets. Use varied, precise verbs suited to the work.
   - NO COOKIE-CUTTER CLAUSE FORMULAS: DO NOT repeat the exact same sentence pattern across bullets. Avoid repeatedly ending bullets with ", resulting in X% [metric]" or ", driving X% [metric]". Vary the sentence cadence:
     * Scope & Ownership Depth: Problem addressed → Approach or method chosen → Measurable outcome.
     * Scale & Volume: Volume or scale handled → Standard or reliability level maintained → Continuity or service win.
     * Efficiency & Process Improvement: Process or tooling instituted → Cross-functional adoption → Time, cost, or quality impact.
   - BANNED REPETITIVE AI FILLER: Strictly ban repetitive clichés: "leveraging", "spearheaded", "pivotal", "fostered", "testament to", "streamlined", "driving operational excellence", "seamlessly"${domainBanned}.
   - CONTEXTUAL KEYWORD WEAVING: Weave at most 1–2 target keywords per bullet where they naturally and authentically fit. DO NOT cram the same keywords into every bullet.
   - Omit articles (a, an, the). Use crisp, executive resume phrasing.
3. OUTPUT FORMAT: Output ONLY a valid JSON array of ${bulletCount} objects:
[
  {
    "index": 0,
    "originalText": "exact original bullet 0 without leading bullet marker",
    "suggestedText": "tailored bullet 0 without leading bullet marker",
    "status": "enhanced",
    "reason": "Tactical justification (e.g. Quantified outcome, added target keyword)",
    "keywords": ["TargetKeyword"]
  },
  {
    "index": 1,
    "originalText": "exact original bullet 1 without leading bullet marker",
    "suggestedText": "tailored bullet 1 without leading bullet marker",
    "status": "enhanced",
    "reason": "Strengthened action verb and ATS terminology",
    "keywords": ["SecondKeyword"]
  }
]
Output ONLY the valid JSON array of ${bulletCount} objects. Do not include markdown code fences, headers, or any other text.`;
}

export interface HolisticSummaryPromptParams {
  assembledResume?: string;
  originalSummary?: string;
  tailoredBullets?: string[] | string;
  jobDescription?: string;
  jobTitle?: string;
  userRequestedKeywords?: string[];
  preferences?: TailoringPreferences;
  seniorityTier?: SeniorityTier | string;
  recencyTier?: string;
  careerArc?: string;
  targetCompany?: string;
}

/**
 * Prompt to synthesize a holistic career summary from the assembled resume or tailored accomplishments.
 * Focuses on full career arc, core leadership scope, and signature competencies.
 * Zero contradictions with vetted experience, never a changelog of edits.
 * Strictly constrained to 2 to 3 concise, punchy sentences (REQ-UBI-02, REQ-EVT-03).
 */
export function getHolisticSummaryPrompt(params: HolisticSummaryPromptParams): string;
export function getHolisticSummaryPrompt(
  originalSummary: string,
  tailoredBullets: string[] | string,
  targetJD: string,
  options?: {
    seniorityTier?: SeniorityTier | string;
    careerArc?: string;
    targetCompany?: string;
    preferences?: TailoringPreferences;
    jobTitle?: string;
    userRequestedKeywords?: string[];
    recencyTier?: string;
  }
): string;
export function getHolisticSummaryPrompt(
  arg1: HolisticSummaryPromptParams | string,
  arg2?: string[] | string,
  arg3?: string,
  arg4?: {
    seniorityTier?: SeniorityTier | string;
    careerArc?: string;
    targetCompany?: string;
    preferences?: TailoringPreferences;
    jobTitle?: string;
    userRequestedKeywords?: string[];
    recencyTier?: string;
  }
): string {
  let assembledResume = "";
  let originalSummary = "";
  let tailoredBullets: string[] | string = [];
  let jobDescription = "";
  let jobTitle: string | undefined;
  let userRequestedKeywords: string[] = [];
  let preferences: TailoringPreferences | undefined;
  let seniorityTier: SeniorityTier | string | undefined;
  let recencyTier: string | undefined;
  let careerArc: string | undefined;
  let targetCompany: string | undefined;

  if (typeof arg1 === "string") {
    originalSummary = arg1;
    tailoredBullets = arg2 || [];
    jobDescription = arg3 || "";
    if (arg4) {
      seniorityTier = arg4.seniorityTier;
      careerArc = arg4.careerArc;
      targetCompany = arg4.targetCompany;
      preferences = arg4.preferences;
      jobTitle = arg4.jobTitle;
      userRequestedKeywords = arg4.userRequestedKeywords || [];
      recencyTier = arg4.recencyTier;
    }
  } else {
    assembledResume = arg1.assembledResume || "";
    originalSummary = arg1.originalSummary || "";
    tailoredBullets = arg1.tailoredBullets || [];
    jobDescription = arg1.jobDescription || "";
    jobTitle = arg1.jobTitle;
    userRequestedKeywords = arg1.userRequestedKeywords || [];
    preferences = arg1.preferences;
    seniorityTier = arg1.seniorityTier;
    recencyTier = arg1.recencyTier;
    careerArc = arg1.careerArc;
    targetCompany = arg1.targetCompany;
  }

  const targetTitleLine = jobTitle ? `Target Role Title: "${jobTitle}"\n` : "";
  const keywordsLine =
    userRequestedKeywords.length > 0 ? `Target Keywords: ${userRequestedKeywords.join(", ")}\n` : "";
  const leverBlock = preferences ? `\n${buildLeverInstructions(preferences)}\n` : "";
  const seniorityCalibration = buildSeniorityCalibration(seniorityTier);
  const seniorityBlock = seniorityCalibration ? `\n${seniorityCalibration}\n` : "";
  const careerArcBlock = buildCareerArcBlock(careerArc);
  const careerArcSection = careerArcBlock ? `\n${careerArcBlock}\n` : "";
  const companyPrivacyBlock = buildCompanyPrivacyBlock(targetCompany);
  const companyPrivacySection = companyPrivacyBlock ? `\n${companyPrivacyBlock}\n` : "";

  const bulletsText = Array.isArray(tailoredBullets)
    ? tailoredBullets.join("\n")
    : tailoredBullets;

  let resumeContent = assembledResume;
  if (!resumeContent) {
    const parts: string[] = [];
    if (originalSummary) {
      parts.push(`Original Summary:\n${originalSummary}`);
    }
    if (bulletsText) {
      parts.push(`Tailored Accomplishments:\n${bulletsText}`);
    }
    resumeContent = parts.join("\n\n");
  }

  return `You are an elite executive resume writer. Write a cohesive, holistic Professional Summary (2–3 sentences) representing the candidate's ENTIRE career arc, tailored for the target role below.
${leverBlock}
${targetTitleLine}${keywordsLine}${seniorityBlock}${careerArcSection}${companyPrivacySection}
CRITICAL INSTRUCTIONS:
- ZERO THINKING / PREAMBLE LEAK: DO NOT output any thinking trace, <think> tags, chain-of-thought analysis, or introductory remarks (such as "*Analyze User Input:**").
- This is a HOLISTIC EXECUTIVE SUMMARY of the candidate's career as an organic whole, NOT a changelog of recent edits.
- Synthesize their complete trajectory: years of experience, core leadership scope, and signature domain proficiencies derived directly from the assembled resume.
- GUARANTEE ZERO CONTRADICTIONS: Every capability, tool, and achievement claimed must be 100% grounded in the vetted resume below.
- BANNED BUZZWORDS: Do NOT use fluff or repetitive filler ("passionate", "results-driven", "team player", "leveraging", "spearheaded", "pivotal role"). Use authoritative, factual declarative sentences.
- Vary sentence syntax and cadence; avoid repetitive sentence structures.
- Output ONLY the 2–3 sentence summary paragraph. No headers, no intro, no conversational remarks.

STRICT RULES & CONSTRAINTS:
1. STRICT LENGTH CONSTRAINT: Write exactly 2 to 3 concise, punchy sentences (maximum 60 words total).
2. COMMANDING EXECUTIVE IDENTITY HOOK: Open sentence 1 directly with the candidate's target professional/executive identity and core domain authority (e.g. "[Target Title / Specialty] with [X]+ years directing [core domain scope]...").
3. PROVEN PEAK IMPACT: Sentence 2 highlights the candidate's highest-impact, quantified achievement or primary operational transformation directly relevant to the target job description.
4. FORWARD-LOOKING CAPABILITY ALIGNMENT: Sentence 3 reinforces their signature strategic capabilities and technical proficiencies positioned to deliver immediate impact in the target role.
5. Content Focus: Explicitly highlight the candidate's most relevant qualifications, primary domain authority, and proven accomplishments matching the target role.
6. Prohibit generic fluff, filler adjectives, or cliché openings ("Passionate, results-driven professional..."). Open directly with domain impact.
7. Strictly ground every claim in the provided tailored accomplishments. Do not invent unmentioned skills or statistics.

Assembled Resume:
"""
${resumeContent}
"""

Target Job Description:
"""
${(jobDescription || "").slice(0, 3000)}
"""

Output only the summary text:`;
}
