/** Snapshot of resume metrics (defensible, rule-based) */
export interface ResumeMetricsSnapshot {
  jdCoverage?: { addressed: number; total: number; percentage: number };
  criticalKeywords?: { matched: number; total: number };
  concreteEvidence?: { withEvidence: number; total: number; percentage: number };
  platformOwnership?: number;
  skimSuccess?: { score: number; total: number; percentage: number };
}

/**
 * Response shape from /api/humanize and /api/humanize/stream (complete event)
 */
export interface HumanizeResponse {
  originalResume: string;
  tailoredResume: string | null;
  obfuscatedResume: string;
  contentMap?: Record<string, string> | null;
  freeReveal?: { section: string; originalText: string; improvedText: string } | null;
  improvementMetrics?: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
    qualityScore?: number;
  };
  matchScore?: { before: number; after: number };
  metrics?: { before: ResumeMetricsSnapshot; after: ResumeMetricsSnapshot };
  qualityMetrics?: Record<string, unknown>;
  validationResult?: unknown;
  companyResearch?: unknown;
  resumeId?: string | null;
  hasAccess?: boolean;
  accessInfo?: unknown;
}
