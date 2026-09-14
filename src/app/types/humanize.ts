import type { TailoringPreferences } from "./tailoringPreferences";
import type { DiscoveredJob, ResumeSuggestion, ResumeSectionGroup } from "@/app/agent/state";
import type { ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";

export type { ResumeSuggestion };

/** Keyword gap for sidebar: JD keywords found vs missing in the tailored resume */
export interface KeywordGapSnapshot {
  missingKeywords: string[];
  foundInResume: string[];
}

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
  suggestions?: ResumeSuggestion[];
  sectionGroups?: ResumeSectionGroup[];
  resumeAST?: ParsedResumeForReassemble;
  improvementMetrics?: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
    qualityScore?: number;
    bulletsRewritten?: number;
    keywordsAdded?: number;
    scoreImprovement?: number;
    intensityApplied?: string;
    metricsInjected?: number;
  };
  /** Job match score (optimized resume) */
  matchScore?: number;
  beforeScore?: number;
  /** Metrics for the optimized resume */
  metrics?: ResumeMetricsSnapshot;
  qualityMetrics?: Record<string, unknown>;
  validationResult?: unknown;
  companyResearch?: unknown;
  resumeId?: string | null;
  hasAccess?: boolean;
  accessInfo?: unknown;
  /** Agent specific data */
  tailoringPreferences?: TailoringPreferences;
  agentSteps?: string[];
  discoveredJobs?: DiscoveredJob[];
  formatSpec?: unknown;
}
