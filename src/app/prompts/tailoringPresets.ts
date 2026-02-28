/**
 * Click-through preset instructions for resume tailoring.
 * Keys are sent from the client as promptPresetIds; values are injected into the prompt.
 */
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
