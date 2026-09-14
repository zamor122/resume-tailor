import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import type { ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";
import type { JDInterpreterResult } from "@/app/utils/keyword-extraction";

export interface CandidateProfile {
  primaryTitle: string;
  seniorityLevel: string;
  topSkills: string[];
  domain: string;
  searchQuery: string;
}

export interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  url: string;
  snippet: string;
}

export interface JobAudit {
  jobIndex: number;
  hasChanges: boolean;
  bulletIndices: number[] | 'all';
  auditRationale: string;
}

export interface BulletPlan {
  summaryChange: boolean;
  jobBulletChanges: Array<{
    jobIndex: number;
    bulletIndices: number[] | 'all';
    reason: string;
  }>;
  jobAudits?: JobAudit[];
  skillsChange: boolean;
}


export interface ImprovementMetrics {
  bulletsRewritten: number;
  keywordsAdded: number;
  scoreImprovement: number;
  intensityApplied: string;
  metricsInjected: number;
}

export interface ResumeSuggestion {
  id: string;
  section: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  keywords: string[];
  category?: "keyword" | "metric" | "summary" | "action_verb" | "streamline";
  status?: "pending" | "accepted" | "rejected";
  jobIndex?: number;
  bulletIndex?: number;
}

export type SectionGroupType = "experience" | "skills" | "summary" | "other";
export type SectionTailorStatus = "pending" | "tailoring" | "ready" | "reviewed" | "unchanged";

export interface ResumeSectionGroup {
  id: string;
  sectionType: SectionGroupType;
  title: string;
  subtitle?: string;
  jobIndex?: number;
  orderIndex: number;
  status: SectionTailorStatus;
  auditRationale: string;
  suggestions: ResumeSuggestion[];
  originalContent: string;
  tailoredContent?: string;
  hasChanges: boolean;
}

export interface AgentLog {
  step: string;
  message: string;
  timestamp: string;
}

export interface AgentState {
  // Inputs
  rawResume: string;
  rawJobDescription?: string;
  sessionId?: string;
  userId?: string;
  parentResumeId?: string;
  preferences: TailoringPreferences;
  modelKey?: string;
  sessionApiKeys?: Record<string, string>;

  // Parsed Structures
  resumeAST?: ParsedResumeForReassemble;
  candidateProfile?: CandidateProfile;

  // Job Target
  selectedJobDescription?: string;
  discoveredJobs?: DiscoveredJob[];
  companyResearch?: any;
  jobTitle?: string;

  // Keyword Analysis
  keywordResult?: JDInterpreterResult;
  sortedMissingKeywords?: string[];
  baselineScore?: number;

  // Bullet Planning
  bulletPlan?: BulletPlan;

  // Section Orchestration
  sectionGroups?: ResumeSectionGroup[];
  activeSectionId?: string;
  sectionCache?: Record<string, ResumeSectionGroup>;

  // Generation Results
  tailoredSummary?: string;
  tailoredBulletsByJob?: string[];
  tailoredSkills?: string;
  suggestions?: ResumeSuggestion[];

  // Final Output
  finalResumeText?: string;
  beforeScore?: number;
  afterScore?: number;
  keywordGap?: { foundInResume: string[]; missingKeywords: string[] };
  improvementMetrics?: ImprovementMetrics;

  // Tracking
  logs: string[];
  errors: string[];
}
