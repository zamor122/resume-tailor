/**
 * Metrics guidance formatting for tailoring and enhancement prompts.
 * Used by: humanize stream, job-relevancy-enhancer
 */

interface MetricGuidance {
  teamSizeRange: string;
  userScaleRange: string;
  percentImprovementRange: string;
  costSavingsRange: string;
  industryExamples: string[];
  forbiddenPatterns: string[];
}

interface MetricsContext {
  metricGuidance?: MetricGuidance;
  companySize?: string;
  industry?: string;
}

export function formatMetricsGuidance(
  metricsContext: MetricsContext | null | undefined
): string {
  if (!metricsContext?.metricGuidance) return "";

  const { metricGuidance, companySize = "Unknown", industry = "Technology" } = metricsContext;
  const lines: string[] = [
    `METRICS GUIDANCE (Company: ${companySize}, Industry: ${industry}):`,
    `- Plausible ranges: team sizes ${metricGuidance.teamSizeRange}, user scale ${metricGuidance.userScaleRange}, % improvement ${metricGuidance.percentImprovementRange}, cost savings ${metricGuidance.costSavingsRange}`,
    "- Add metrics only when inferrable from original (e.g., 'optimized' → 'improved X by Y%')",
    "- When adding metrics, include plausible measurement context: 'measured by user count before and after', 'measured by Segment metrics', 'measured from CodePipeline deployment metrics', 'measured by cost before vs cost after'",
    "- Never add metrics without plausible attribution or inferrable context. Interviewers will ask 'how did you measure that?'",
  ];

  if (metricGuidance.forbiddenPatterns?.length > 0) {
    lines.push(`- Forbidden: ${metricGuidance.forbiddenPatterns.join(", ")} for this company size`);
  }

  if (metricGuidance.industryExamples?.length > 0) {
    lines.push(`- Industry examples: ${metricGuidance.industryExamples.slice(0, 3).join(", ")}`);
  }

  lines.push("- Never exceed plausible scale for company size; interviewers spot implausible metrics");

  return lines.join("\n");
}
