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

export interface BulletPlan {
  summaryChange: boolean;
  jobBulletChanges: Array<{
    jobIndex: number;
    bulletIndices: number[] | 'all';
    reason: string;
  }>;
  skillsChange: boolean;
}

export interface ImprovementMetrics {
  bulletsRewritten: number;
  keywordsAdded: number;
  scoreImprovement: number;
  intensityApplied: string;
  metricsInjected: number;
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

  // Generation Results
  tailoredSummary?: string;
  tailoredBulletsByJob?: string[];
  tailoredSkills?: string;

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
