/**
 * Deterministic resume metrics calculator.
 * All metrics are rule-based—no LLM calls. Defensible and auditable.
 * Uses frequency-based keyword extraction when dynamic terms are not provided.
 */

/** Common English stopwords - no domain-specific lists */
const STOPWORDS = new Set([
  "the", "and", "or", "but", "for", "with", "from", "that", "this", "these", "those",
  "have", "has", "had", "will", "would", "could", "should", "may", "might", "must",
  "can", "been", "being", "into", "through", "during", "before", "after", "above",
  "below", "between", "under", "again", "further", "then", "once", "here", "there",
  "when", "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "only", "own", "same", "than", "too", "very",
  "just", "also", "now", "about", "what", "which", "who", "whom", "their", "them",
]);

/**
 * Parse resume into bullet points (lines starting with -, *, •)
 */
function parseBullets(text: string): string[] {
  const lines = text.split(/\n/);
  return lines
    .filter((line) => /^\s*[-*•]\s+/.test(line))
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter((line) => line.length >= 15);
}

/**
 * Extract high-frequency terms from job description (4+ chars, 2+ occurrences).
 * No hardcoded keyword lists.
 */
function extractFrequencyBasedTerms(jobDescription: string): string[] {
  const lower = jobDescription.toLowerCase();
  const words = lower.match(/\b\w{4,}\b/g) || [];
  const freq = new Map<string, number>();
  words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));
  const terms: string[] = [];
  freq.forEach((count, word) => {
    if (count >= 2 && !STOPWORDS.has(word)) terms.push(word);
  });
  return terms.sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0));
}

/**
 * Extract role-critical requirements from job description.
 * Uses: bullet lines, "Required:", "Must have:", "Qualified candidates:" sections.
 */
export function extractRequirements(jobDescription: string): { requirements: string[]; total: number } {
  const lower = jobDescription.toLowerCase();
  const requirements: string[] = [];

  // Bullet lines: - * • or 1. 2. etc.
  const bulletRegex = /(?:^|\n)\s*[-*•]\s*(.+?)(?=\n|$)/gm;
  const numberedRegex = /(?:^|\n)\s*\d+[.)]\s*(.+?)(?=\n|$)/gm;

  let m;
  while ((m = bulletRegex.exec(jobDescription)) !== null) {
    const text = m[1].trim();
    if (text.length > 10 && text.length < 200) requirements.push(text);
  }
  while ((m = numberedRegex.exec(jobDescription)) !== null) {
    const text = m[1].trim();
    if (text.length > 10 && text.length < 200) requirements.push(text);
  }

  // "Required:" / "Must have:" / "Qualified candidates:" sections - extract following lines
  const sectionRegex = /(?:required|must have|qualifications?|qualified candidates)\s*[:-]\s*\n?([\s\S]*?)(?=\n\n|$)/gi;
  while ((m = sectionRegex.exec(jobDescription)) !== null) {
    const block = m[1];
    const items = block.split(/\n/).map((l) => l.replace(/^[-*•\d.)]\s*/, "").trim()).filter((l) => l.length > 15);
    requirements.push(...items);
  }

  const unique = [...new Set(requirements.map((r) => r.toLowerCase().slice(0, 80)))];
  const deduped = unique.map((u) => {
    const found = requirements.find((r) => r.toLowerCase().slice(0, 80) === u);
    return found || u;
  });

  return { requirements: deduped, total: deduped.length };
}

/**
 * JD Coverage Score: % of requirements explicitly addressed in resume bullets.
 */
export function jdCoverageScore(
  resume: string,
  requirements: string[]
): { addressed: number; total: number; percentage: number } {
  if (requirements.length === 0) return { addressed: 0, total: 0, percentage: 0 };

  const bullets = parseBullets(resume);
  const resumeText = resume.toLowerCase();

  let addressed = 0;
  for (const req of requirements) {
    const words = req.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 5);
    const hasOverlap = words.some((w) => resumeText.includes(w)) && words.length >= 2;
    if (hasOverlap) addressed++;
  }

  const percentage = Math.round((addressed / requirements.length) * 100);
  return { addressed, total: requirements.length, percentage };
}

/**
 * Extract critical keywords from job description.
 * Frequency-based only: high-frequency JD terms (4+ chars, 2+ occurrences), excluding stopwords.
 */
export function extractCriticalKeywords(jobDescription: string): string[] {
  return extractFrequencyBasedTerms(jobDescription);
}

/**
 * Critical Keyword Presence: must-have terms that appear IN CONTEXT (in bullets).
 */
export function criticalKeywordPresence(
  resume: string,
  criticalKeywords: string[]
): { matched: number; total: number } {
  if (criticalKeywords.length === 0) return { matched: 0, total: 0 };

  const bullets = parseBullets(resume);
  const resumeInBullets = bullets.join(" ").toLowerCase();

  let matched = 0;
  for (const kw of criticalKeywords) {
    if (resumeInBullets.includes(kw.toLowerCase())) matched++;
  }

  return { matched, total: criticalKeywords.length };
}

/**
 * Concrete Evidence Ratio: % of bullets with metrics, tools, or technical terms.
 * Uses dynamic technicalTerms when provided; otherwise frequency-based from JD.
 */
export function concreteEvidenceRatio(
  resume: string,
  technicalTerms?: string[]
): { withEvidence: number; total: number; percentage: number } {
  const bullets = parseBullets(resume);
  if (bullets.length === 0) return { withEvidence: 0, total: 0, percentage: 0 };

  const metricPattern = /\d+%|\d+gb|\d+mb|\$\d+|\d+\s*years?|\d+k|\d+m/i;
  const lowerBullets = bullets.map((b) => b.toLowerCase());
  const terms = technicalTerms && technicalTerms.length > 0
    ? new Set(technicalTerms.map((t) => t.toLowerCase()))
    : new Set<string>(); // Empty = no term match; only metric pattern counts

  let withEvidence = 0;
  for (const bullet of lowerBullets) {
    const hasMetric = metricPattern.test(bullet);
    const hasTool = terms.size > 0 && [...terms].some((t) => bullet.includes(t));
    if (hasMetric || hasTool) withEvidence++;
  }

  const percentage = Math.round((withEvidence / bullets.length) * 100);
  return { withEvidence, total: bullets.length, percentage };
}

/**
 * Platform Ownership Signals: count of bullets mentioning SDKs, CLIs, portals, etc.
 */
export function platformOwnershipSignals(resume: string): number {
  const bullets = parseBullets(resume);
  const pattern = /\b(sdk|cli|portal|internal platform|shared infrastructure|enablement|enable other teams)\b/i;
  return bullets.filter((b) => pattern.test(b)).length;
}

/**
 * Skim Success Score: % of bullets that pass 10-second skim test.
 * Pass = starts with tool/outcome (technical term or number in first 5 words) OR contains visible metric.
 * Uses dynamic technicalTerms when provided.
 */
export function skimSuccessScore(
  resume: string,
  technicalTerms?: string[]
): { score: number; total: number; percentage: number } {
  const bullets = parseBullets(resume);
  if (bullets.length === 0) return { score: 0, total: 0, percentage: 0 };

  const metricPattern = /\d+%|\d+gb|\d+mb|\$\d+/i;
  const lowerBullets = bullets.map((b) => b.toLowerCase());
  const terms = technicalTerms && technicalTerms.length > 0
    ? new Set(technicalTerms.map((t) => t.toLowerCase()))
    : new Set<string>();

  let score = 0;
  for (const bullet of lowerBullets) {
    const hasMetric = metricPattern.test(bullet);
    const firstWords = bullet.split(/\s+/).slice(0, 5).join(" ");
    const startsWithTech = terms.size > 0 && [...terms].some((t) => firstWords.includes(t));
    const startsWithNumber = /^\d/.test(bullet.trim());
    if (hasMetric || startsWithTech || startsWithNumber) score++;
  }

  const percentage = Math.round((score / bullets.length) * 100);
  return { score, total: bullets.length, percentage };
}

export interface ResumeMetricsSnapshot {
  jdCoverage: { addressed: number; total: number; percentage: number };
  criticalKeywords: { matched: number; total: number };
  concreteEvidence: { withEvidence: number; total: number; percentage: number };
  platformOwnership: number;
  skimSuccess: { score: number; total: number; percentage: number };
}

export interface ComputeResumeMetricsOptions {
  criticalKeywords?: string[];
  technicalTerms?: string[];
  requirements?: string[];
}

/**
 * Compute all metrics for a resume against a job description.
 * When criticalKeywords or technicalTerms are not provided, uses frequency-based extraction from JD.
 */
export function computeResumeMetrics(
  resume: string,
  jobDescription: string,
  options?: ComputeResumeMetricsOptions
): ResumeMetricsSnapshot {
  const requirements =
    options?.requirements ?? extractRequirements(jobDescription).requirements;
  const criticalKeywords =
    options?.criticalKeywords ?? extractCriticalKeywords(jobDescription);
  const technicalTerms =
    options?.technicalTerms ?? extractFrequencyBasedTerms(jobDescription);

  const jdCoverage = jdCoverageScore(resume, requirements);
  const criticalKw = criticalKeywordPresence(resume, criticalKeywords);
  const concreteEvidence = concreteEvidenceRatio(resume, technicalTerms);
  const platformOwnership = platformOwnershipSignals(resume);
  const skimSuccess = skimSuccessScore(resume, technicalTerms);

  return {
    jdCoverage,
    criticalKeywords: criticalKw,
    concreteEvidence,
    platformOwnership,
    skimSuccess,
  };
}

/**
 * Compute weighted composite score (0-100) for backward compatibility.
 */
export function computeCompositeScore(snapshot: ResumeMetricsSnapshot): number {
  const jd = snapshot.jdCoverage.percentage;
  const kw =
    snapshot.criticalKeywords.total > 0
      ? (snapshot.criticalKeywords.matched / snapshot.criticalKeywords.total) * 100
      : 50;
  const evidence = snapshot.concreteEvidence.percentage;
  const platform = Math.min(100, snapshot.platformOwnership * 15);
  const skim = snapshot.skimSuccess.percentage;

  return Math.round(
    jd * 0.35 + kw * 0.25 + evidence * 0.2 + platform * 0.1 + skim * 0.1
  );
}
