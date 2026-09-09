/**
 * Click-through preset instructions for resume tailoring.
 * Keys are sent from the client as promptPresetIds; values are injected into the prompt.
 */
import type {
  TailoringPreferences,
  IntensityLevel,
  MetricsMode,
  SeniorityLevel,
} from "@/app/types/tailoringPreferences";

export const TAILORING_PRESETS: Record<string, string> = {
  "emphasize-leadership":
    "Emphasize leadership, mentoring, and cross-team collaboration. Lead bullets with 'Led', 'Owned', 'Championed' where accurate. Highlight team size and stakeholder work.",
  "more-metrics":
    "Add or surface quantifiable metrics (percentages, time saved, scale, team size) in every experience bullet where plausible. Prefer numbers in the first line of each bullet.",
  "specialized-skills":
    "Prioritize the core skills and qualifications from the job description. Use the job's key terms in the summary and top bullets. Highlight relevant expertise whether technical, clinical, trade, or service-oriented.",
  "customer-impact":
    "Lead with impact on customers, patients, or clients where accurate. Highlight reliability, quality of service, and concrete outcomes. Use role-appropriate language (e.g. patient care, customer satisfaction, client delivery).",
  "ats-keywords-first":
    "Maximize ATS keyword density in Summary and first two bullets of each role. Use exact job-description phrases in those spots without changing factual content.",
};

/** Human-readable labels for preset IDs (for UI chips) */
export const TAILORING_PRESET_LABELS: Record<string, string> = {
  "emphasize-leadership": "Emphasize leadership",
  "more-metrics": "More metrics",
  "specialized-skills": "Highlight specialized skills",
  "customer-impact": "Emphasize impact",
  "ats-keywords-first": "ATS keywords first",
};

/**
 * Build combined user instructions from preset IDs and optional custom text.
 */
export function buildUserInstructions(
  promptPresetIds?: string[],
  customInstructions?: string
): string {
  const presetTexts = (promptPresetIds ?? [])
    .map((id) => TAILORING_PRESETS[id])
    .filter(Boolean);
  const custom = (customInstructions ?? "").trim();
  return [...presetTexts, custom].filter(Boolean).join("\n\n");
}

/** Convert intensity lever -> prompt instruction block */
export function buildIntensityInstruction(intensity: IntensityLevel): string {
  switch (intensity) {
    case "minimal":
      return `TRANSFORMATION SCOPE — MINIMAL (LIGHT POLISH):
- Change as little as possible. Rewrite a MAXIMUM of 1–2 bullet points across the entire resume, only where critical ATS keywords are completely absent.
- All other bullets, phrasing, and structure must stay 100% identical to the original resume.
- Preserve the candidate's exact voice, terminology, and sentence patterns.`;
    case "targeted":
      return `TRANSFORMATION SCOPE — TARGETED (BALANCED):
- Rewrite 3–5 of the highest-impact bullets across experience sections plus the professional summary.
- Use the Google XYZ format (Accomplished [X] as measured by [Y] by doing [Z]) for the most impactful bullets.
- Weave missing critical ATS keywords naturally into these selected bullets. Keep remaining bullets close to original.`;
    case "overhaul":
      return `TRANSFORMATION SCOPE — COMPLETE OVERHAUL (DEEP RE-FRAME):
- Completely rewrite EVERY experience bullet and summary into executive-grade language with strong action verbs and Google XYZ structure.
- CRITICAL AUTHENTICITY GUARDRAIL: You MUST preserve the candidate's authentic experience ideas, projects, technologies used, responsibilities, and domain history.
- Do NOT invent new employers, fake titles, fictional degrees, or fabricated accomplishments not supported by the original resume.
- Re-frame their real work into its strongest, most compelling expression for the target role.`;
  }
}

/** Convert metricsMode lever -> prompt instruction block */
export function buildMetricsInstruction(mode: MetricsMode): string {
  switch (mode) {
    case "strict":
      return `METRICS MODE — STRICT (KEEP ORIGINAL NUMBERS ONLY):
- Use ONLY numbers, percentages, and metrics already present in the original resume.
- Do not invent, estimate, or infer new metrics. If a bullet lacks a metric in the original, keep it metric-free.`;
    case "placeholders":
      return `METRICS MODE — SMART PLACEHOLDERS [X%]:
- Where a bullet clearly implies measurable impact but no exact number is given, insert an editable bracketed placeholder inline: e.g. "increasing throughput by [X%]", "reducing latency by [Y ms]", "supporting [N] concurrent users".
- Use at most one bracketed placeholder per bullet. Do not invent exact numbers.`;
    case "benchmarks":
      return `METRICS MODE — INDUSTRY KPI BENCHMARKS:
- Re-frame accomplishments using standard industry KPI frameworks relevant to the target role (e.g. latency, MTTR, uptime, conversion rate, team velocity, budget efficiency).
- Quantify context realistically based on the candidate's actual responsibilities and domain scale.`;
  }
}

/** Convert seniorityLevel lever -> prompt instruction block */
export function buildSeniorityInstruction(level: SeniorityLevel): string {
  switch (level) {
    case "mid":
      return `SENIORITY FRAMING — MID-LEVEL:
- Use contributor-focused language highlighting execution and technical craft.
- Verbs: Built, Developed, Implemented, Contributed to, Maintained, Analyzed, Integrated.`;
    case "senior":
      return `SENIORITY FRAMING — SENIOR / STAFF:
- Use ownership, architectural, and scope language.
- Verbs: Led, Architected, Designed, Spearheaded, Owned, Drove, Established, Mentored.
- Highlight system scale, technical trade-offs, and cross-functional collaboration.`;
    case "executive":
      return `SENIORITY FRAMING — LEAD / EXECUTIVE:
- Use strategic, organizational, and business-impact language.
- Verbs: Directed, Scaled, Transformed, Championed, Defined, Orchestrated.
- Frame accomplishments in terms of org-level ROI, efficiency, team growth, and strategic outcomes.`;
  }
}

/** Build the complete lever instruction block to inject into any tailoring prompt */
export function buildLeverInstructions(prefs?: TailoringPreferences): string {
  if (!prefs) return "";
  return [
    buildIntensityInstruction(prefs.intensity),
    buildMetricsInstruction(prefs.metricsMode),
    buildSeniorityInstruction(prefs.seniorityLevel),
  ]
    .filter(Boolean)
    .join("\n\n");
}
