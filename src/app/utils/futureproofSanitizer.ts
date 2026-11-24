import type { IndustryCategory } from "@/app/config/domainTaxonomy";
import type { AiToolEntry, ComfortLevel } from "@/app/config/aiToolRegistry";

export interface DetectedRole {
  id: string;
  title: string;
  company: string;
  dateRange: string;
  isRecentForAi: boolean;
}

export interface RecommendedToolView {
  id: string;
  name: string;
  vendor: string;
  complianceBadges: string[];
  isIndustryStandard: boolean;
  comfortTier: ComfortLevel;
  preselected: boolean;
  shortDescription: string;
  fitReason: string;
}

export interface FutureproofAnalyzeResponse {
  industry: IndustryCategory;
  industryDisplayName: string;
  subRoleLabel: string;
  detectedRoles: DetectedRole[];
  hasRecentRoles: boolean;
  recommendedTools: RecommendedToolView[];
}

export interface BulletUpgrade {
  id: string;
  roleTitle: string;
  company: string;
  dateRange: string;
  placementType: "role_experience" | "modern_workflows_section";
  toolId: string;
  toolName: string;
  originalBullet: string;
  upgradedBullet: string;
  rationale: string;
  isLocked?: boolean;
}

export interface InterviewTalkingPoint {
  toolId: string;
  toolName: string;
  complianceBadges: string[];
  plainEnglishSummary: string;
  thirtySecondAnswer: string;
  isLocked?: boolean;
}

export interface FutureproofGenerateResponse {
  industry: IndustryCategory;
  industryDisplayName: string;
  selectedTools: Array<{
    id: string;
    name: string;
    vendor: string;
    complianceBadges: string[];
  }>;
  placementMode: "inline_roles" | "modern_workflows_section";
  bulletUpgrades: BulletUpgrade[];
  skillsBlock: string[];
  interviewTalkingPoints: InterviewTalkingPoint[];
  mergedResume: string | null;
  isUnlocked: boolean;
  totalUpgrades: number;
  unlockedCount: number;
}

export const FREE_PREVIEW_UPGRADE_COUNT = 2;

const LOCKED_BULLET_PLACEHOLDER =
  "🔒 AI-integrated bullet locked — unlock with an AI Resume Tailor pass to view, copy, and export your full Futureproof resume.";

const LOCKED_TALKING_POINT_PLACEHOLDER =
  "🔒 Unlock with an AI Resume Tailor pass to access your personalized 30-second interview script for this tool.";

/**
 * Server-side freemium sanitizer.
 * Guarantees that locked bullet upgrades, the full merged resume, and interview scripts
 * are NEVER sent in the HTTP JSON payload to unauthenticated or unpaid callers.
 */
export function sanitizeFutureproofForLocked(
  response: FutureproofGenerateResponse
): FutureproofGenerateResponse {
  if (response.isUnlocked) {
    return response;
  }

  const sanitizedUpgrades: BulletUpgrade[] = response.bulletUpgrades.map(
    (item, idx) => {
      if (idx < FREE_PREVIEW_UPGRADE_COUNT) {
        return { ...item, isLocked: false };
      }
      return {
        ...item,
        upgradedBullet: LOCKED_BULLET_PLACEHOLDER,
        rationale: "Unlock your pass to view this tailored AI workflow upgrade.",
        isLocked: true,
      };
    }
  );

  const sanitizedTalkingPoints: InterviewTalkingPoint[] =
    response.interviewTalkingPoints.map((tp) => ({
      toolId: tp.toolId,
      toolName: tp.toolName,
      complianceBadges: tp.complianceBadges,
      plainEnglishSummary: tp.plainEnglishSummary,
      thirtySecondAnswer: LOCKED_TALKING_POINT_PLACEHOLDER,
      isLocked: true,
    }));

  const unlockedCount = Math.min(
    FREE_PREVIEW_UPGRADE_COUNT,
    response.bulletUpgrades.length
  );

  return {
    ...response,
    bulletUpgrades: sanitizedUpgrades,
    interviewTalkingPoints: sanitizedTalkingPoints,
    mergedResume: null,
    isUnlocked: false,
    totalUpgrades: response.bulletUpgrades.length,
    unlockedCount,
  };
}

/**
 * Build deterministic interview talking points directly from the verified registry
 * so every tool always has an accurate, credible, compliance-aware interview script.
 */
export function buildTalkingPointsFromRegistry(
  tools: AiToolEntry[]
): InterviewTalkingPoint[] {
  return tools.map((t) => ({
    toolId: t.id,
    toolName: t.name,
    complianceBadges: t.complianceBadges,
    plainEnglishSummary: t.shortDescription,
    thirtySecondAnswer: t.interviewTalkingPoint,
    isLocked: false,
  }));
}
