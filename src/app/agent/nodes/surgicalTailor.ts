import type { AgentState, ResumeSuggestion } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import {
  getHolisticSummaryPrompt,
  getExperienceBulletsPrompt,
} from "@/app/prompts/tailoringSection";
import {
  extractVettedEmployers,
  sanitizeCompanyReferences,
} from "@/app/utils/companyPrivacyGuard";
import {
  groupSuggestionsBySection,
  isolatePreciseOriginalChange,
} from "@/app/utils/resumeReassemble";
import { parseChunkBulletsResponse } from "@/app/utils/chunkBulletParser";
import { stripModelThinking } from "@/app/utils/stripModelThinking";

/**
 * Contextually distributes target missing keywords across multiple career roles
 * so each job emphasizes complementary competencies rather than repetitive keyword stuffing.
 */
function getJobSpecificKeywords(
  exp: { title?: string; company?: string; description?: string },
  sortedMissingKeywords: string[],
  jobIndex: number
): string[] {
  if (!sortedMissingKeywords || sortedMissingKeywords.length <= 4) {
    return sortedMissingKeywords || [];
  }

  const descLower = (exp.description || "").toLowerCase();
  const titleLower = (exp.title || "").toLowerCase();

  // 1. Prioritize keywords that naturally relate to this role's historical domain/text
  const domainMatched = sortedMissingKeywords.filter((kw) => {
    const kwLower = kw.toLowerCase();
    return descLower.includes(kwLower) || titleLower.includes(kwLower);
  });

  // 2. Most recent role gets top high-priority target keywords
  if (jobIndex === 0) {
    const topKeywords = sortedMissingKeywords.slice(0, 6);
    return Array.from(new Set([...domainMatched, ...topKeywords])).slice(0, 8);
  }

  // 3. Earlier roles receive distributed complementary keyword slices
  const offset = (jobIndex * 3) % sortedMissingKeywords.length;
  const distributedKeywords = [
    ...sortedMissingKeywords.slice(offset, offset + 4),
    ...sortedMissingKeywords.slice(0, 2),
  ];

  return Array.from(new Set([...domainMatched, ...distributedKeywords])).slice(0, 7);
}

export async function surgicalTailorNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const {
    resumeAST,
    selectedJobDescription = "",
    bulletPlan,
    preferences,
    rawResume,
    sortedMissingKeywords = [],
  } = state;

  const experience = resumeAST?.experience || [];
  const jdSnippet = selectedJobDescription.slice(0, 3000);
  const suggestions: ResumeSuggestion[] = [];

  // Privacy guard inputs are computed ONCE and reused for every persisted output (REQ-UBI-02, REQ-ERR-01).
  const vettedEmployers = extractVettedEmployers(experience);
  const targetCompany = deriveTargetCompany(state);
  const summaryPlanned = !!bulletPlan?.summaryChange;

  console.log(`[surgicalTailor] ▶ Starting node`, {
    intensity: preferences?.intensity,
    summaryPlanned,
    jobsPlanned: bulletPlan?.jobBulletChanges?.length || 0,
    totalExperienceJobs: experience.length,
    missingKeywords: sortedMissingKeywords.slice(0, 8),
    vettedEmployers,
    targetCompany: targetCompany || "(none derived)",
  });

  // PHASE 1 — dispatch every job bullet task in parallel. The summary is intentionally NOT queued
  // here: it can only be synthesized after these bullets resolve (REQ-EVT-04).
  type BulletTaskResult = { type: "bullets"; index: number; text: string; originalInputText: string };
  const bulletPromises: Promise<BulletTaskResult>[] = [];

  bulletPlan?.jobBulletChanges.forEach(({ jobIndex, bulletIndices, recencyTier }) => {
    const exp = experience[jobIndex];
    if (!exp) {
      console.warn(`[surgicalTailor] Warning: jobIndex ${jobIndex} not found in resumeAST.experience`);
      return;
    }

    const bulletsText =
      bulletIndices === "all"
        ? exp.description
        : extractSpecificBullets(exp.description, bulletIndices);

    const inputBulletsList = getBulletsList(bulletsText);
    const auditTier = bulletPlan?.jobAudits?.find((a) => a.jobIndex === jobIndex)?.recencyTier;
    const resolvedRecencyTier = recencyTier ?? auditTier;
    console.log(`[surgicalTailor] Job ${jobIndex} (${exp.company}) dispatched with ${inputBulletsList.length} bullets:`, {
      bulletIndices,
      recencyTier: resolvedRecencyTier || "(none)",
      bulletsTextSnippet: bulletsText.slice(0, 100),
    });

    const jobKeywords = getJobSpecificKeywords(exp, sortedMissingKeywords, jobIndex);

    bulletPromises.push(
      generateWithFallback(
        getExperienceBulletsPrompt({
          jobTitle: exp.title,
          company: exp.company,
          dates: exp.dates,
          bulletsText,
          jobDescription: jdSnippet,
          preferences,
          userRequestedKeywords: jobKeywords,
          seniorityTier: state.seniorityTier,
          careerArc: state.careerArc,
          targetCompany,
          recencyTier: resolvedRecencyTier,
        }),
        state.modelKey,
        { maxTokens: 2000, temperature: 0.2 },
        state.sessionApiKeys
      )
        .then((res) => {
          const cleanText = stripModelThinking(res.text).trim();
          console.log(`[surgicalTailor] Job ${jobIndex} (${exp.company}) response received (chars: ${cleanText.length})`);
          return {
            type: "bullets" as const,
            index: jobIndex,
            text: cleanText,
            originalInputText: bulletsText,
          };
        })
        .catch((err) => {
          console.warn(`[surgicalTailor] Job ${jobIndex} bullet tailoring LLM failed:`, err);
          return {
            type: "bullets" as const,
            index: jobIndex,
            text: bulletsText,
            originalInputText: bulletsText,
          };
        })
    );
  });

  const results = await Promise.all(bulletPromises);

  let tailoredSummary = resumeAST?.summary || "";
  const tailoredBulletsByJob: string[] = experience.map((e) => e.description);

  results.forEach((r) => {
    const exp = experience[r.index];
    const planItem = bulletPlan?.jobBulletChanges.find((c) => c.jobIndex === r.index);
    if (!exp) return;

    if (planItem?.bulletIndices === "all") {
      const origBullets = getBulletsList(exp.description);
      const { suggestions: chunkSuggestions, tailoredBullets } = parseChunkBulletsResponse({
        llmText: r.text,
        origBullets,
        sectionGroupId: `section-exp-${r.index}`,
        sectionGroupTitle: `${exp.company} – ${exp.title}`,
        jobIndex: r.index,
        sortedMissingKeywords,
      });

      console.log(`[surgicalTailor] Job ${r.index} ("all") produced ${chunkSuggestions.length} suggestions from ${origBullets.length} input bullets`);

      const sanitizedSuggestions = sanitizePhaseOneSuggestions(chunkSuggestions, vettedEmployers, targetCompany);
      const sanitizedBullets = tailoredBullets.map((bullet) =>
        sanitizeCompanyReferences(bullet, vettedEmployers, targetCompany)
      );

      tailoredBulletsByJob[r.index] = sanitizedBullets.join("\n");
      sanitizedSuggestions.forEach((sug) => {
        suggestions.push({
          ...sug,
          id: `sug-job-${r.index}-bullet-${sug.bulletIndex ?? 0}`,
          reason: planItem.reason || sug.reason,
        });
      });
    } else if (planItem?.bulletIndices) {
      const targetIndices = planItem.bulletIndices as number[];
      const origBullets = extractSpecificBulletsArray(exp.description, targetIndices);
      const { suggestions: chunkSuggestions, tailoredBullets } = parseChunkBulletsResponse({
        llmText: r.text,
        origBullets,
        sectionGroupId: `section-exp-${r.index}`,
        sectionGroupTitle: `${exp.company} – ${exp.title}`,
        jobIndex: r.index,
        sortedMissingKeywords,
      });

      console.log(`[surgicalTailor] Job ${r.index} (${targetIndices.length} targeted bullets) produced ${chunkSuggestions.length} suggestions:`, chunkSuggestions.map(s => ({ idx: s.bulletIndex, text: s.suggestedText.slice(0, 40) })));

      const sanitizedSuggestions = sanitizePhaseOneSuggestions(chunkSuggestions, vettedEmployers, targetCompany);
      const sanitizedBullets = tailoredBullets.map((bullet) =>
        sanitizeCompanyReferences(bullet, vettedEmployers, targetCompany)
      );

      tailoredBulletsByJob[r.index] = spliceRewrittenBullets(
        experience[r.index].description,
        sanitizedBullets.join("\n"),
        targetIndices
      );

      sanitizedSuggestions.forEach((sug) => {
        const originalIdx = targetIndices[sug.bulletIndex ?? 0] ?? (sug.bulletIndex ?? 0);
        suggestions.push({
          ...sug,
          id: `sug-job-${r.index}-bullet-${originalIdx}`,
          bulletIndex: originalIdx,
          reason: planItem.reason || sug.reason,
        });
      });
    }
  });

  // PHASE 2 — synthesize the holistic summary strictly AFTER all Phase-1 bullets resolved (REQ-EVT-04).
  // The prompt is assembled from the already-tailored bullets so the summary reflects final state.
  if (summaryPlanned) {
    const originalSummary = resumeAST?.summary || "";
    const assembledResume = buildAssembledResume(experience, tailoredBulletsByJob);

    try {
      const res = await generateWithFallback(
        getHolisticSummaryPrompt({
          assembledResume,
          jobDescription: jdSnippet,
          jobTitle: state.jobTitle,
          userRequestedKeywords: sortedMissingKeywords.slice(0, 5),
          preferences,
          seniorityTier: state.seniorityTier,
        }),
        state.modelKey,
        { maxTokens: 800, temperature: 0.2 },
        state.sessionApiKeys
      );

      const synthesizedSummary = sanitizeCompanyReferences(
        stripModelThinking(res.text).trim(),
        vettedEmployers,
        targetCompany
      );
      console.log(`[surgicalTailor] Holistic summary synthesized after ${results.length} bullet task(s) (length: ${synthesizedSummary.length})`);

      if (synthesizedSummary.trim()) {
        tailoredSummary = synthesizedSummary;
      }

      if (originalSummary.trim() && synthesizedSummary.trim() && originalSummary.trim() !== synthesizedSummary.trim()) {
        suggestions.push({
          id: "sug-summary",
          section: "Professional Summary",
          originalText: isolatePreciseOriginalChange(originalSummary, synthesizedSummary, rawResume),
          suggestedText: synthesizedSummary.trim(),
          reason: `Reframed summary to highlight target role competencies, core tech stack, and leadership scope`,
          keywords: sortedMissingKeywords.slice(0, 4),
          category: "summary",
          status: "pending",
        });
        console.log(`[surgicalTailor] Added summary suggestion`);
      }
    } catch (err) {
      console.warn("[surgicalTailor] Holistic summary synthesis failed, keeping original summary:", err);
      tailoredSummary = originalSummary;
    }
  }

  // Group suggestions into bottom-to-top section groups
  const sectionGroups = groupSuggestionsBySection(suggestions, resumeAST, rawResume);

  // Connect explicit audit rationales from bulletPlan.jobAudits and update tailoredContent
  if (sectionGroups.length > 0) {
    sectionGroups.forEach((group) => {
      if (group.sectionType === "experience" && group.jobIndex !== undefined) {
        if (tailoredBulletsByJob[group.jobIndex]) {
          group.tailoredContent = tailoredBulletsByJob[group.jobIndex];
        }
        if (bulletPlan?.jobAudits && bulletPlan.jobAudits.length > 0) {
          const audit = bulletPlan.jobAudits.find((a) => a.jobIndex === group.jobIndex);
          if (audit) {
            group.auditRationale = audit.auditRationale;
            if (!audit.hasChanges && (!group.suggestions || group.suggestions.length === 0)) {
              group.status = "unchanged";
              group.hasChanges = false;
            }
          }
        }
      }
    });
  }

  // Set initial active section to the first section group (bottom-to-top start)
  const activeSectionId = sectionGroups[0]?.id;

  console.log(`[surgicalTailor] ✔ Completed. Generated ${suggestions.length} suggestions across ${sectionGroups.length} section groups:`, {
    suggestionIds: suggestions.map(s => s.id),
  });

  return {
    tailoredSummary,
    tailoredBulletsByJob,
    suggestions,
    sectionGroups,
    activeSectionId,
    logs: [
      `[surgicalTailor] Generated ${suggestions.length} granular suggestions across ${results.length + (summaryPlanned ? 1 : 0)} tailoring tasks (${preferences.intensity.toUpperCase()})`,
    ],
  };
}

function isBullet(line: string): boolean {
  const trimmed = line.trim();
  return /^([-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]|\d+\.)\s*/.test(trimmed) || /^[-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]/.test(trimmed);
}

function getBulletsList(text: string): string[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter(isBullet);
  if (bulletLines.length > 0) return bulletLines;
  return lines;
}

function extractSpecificBullets(description: string, indices: number[]): string {
  return extractSpecificBulletsArray(description, indices).join("\n");
}

function extractSpecificBulletsArray(description: string, indices: number[]): string[] {
  const bullets = getBulletsList(description);
  return indices
    .map((i) => bullets[i])
    .filter(Boolean);
}

function spliceRewrittenBullets(
  originalDescription: string,
  rewrittenBulletsText: string,
  targetIndices: number[]
): string {
  const bullets = getBulletsList(originalDescription);
  const rewrittenList = getBulletsList(rewrittenBulletsText);

  targetIndices.forEach((targetIdx, listIdx) => {
    if (rewrittenList[listIdx] && bullets[targetIdx] !== undefined) {
      bullets[targetIdx] = rewrittenList[listIdx];
    }
  });

  return bullets.join("\n");
}

/**
 * Generic role/level/scope words that must never be mistaken for an employer name by the
 * job-description heuristic below (e.g. "Role at Senior level" must NOT yield "Senior").
 */
const GENERIC_TARGET_TOKENS = new Set([
  "senior",
  "junior",
  "staff",
  "lead",
  "principal",
  "manager",
  "director",
  "intern",
  "remote",
  "hybrid",
  "onsite",
  "contract",
  "level",
  "the",
  "this",
  "our",
  "your",
]);

/**
 * Guards the job-description heuristic against over-capturing generic prose. Errs toward returning
 * nothing (a missed scrub is far less harmful than scrubbing a legitimate word out of every bullet).
 */
function isPlausibleCompanyName(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (trimmed.length < 4) return false;
  return !GENERIC_TARGET_TOKENS.has(trimmed.toLowerCase());
}

/**
 * Derives the target employer name defensively from the most authoritative source available (REQ-UBI-02).
 *
 * Priority order:
 * 1. `companyResearch.name` / `companyResearch.company` — already-resolved target metadata.
 * 2. `discoveredJobs[0].company` — the first job discovered for this run.
 * 3. A deliberately CONSERVATIVE regex over the selected job description that only captures a
 *    capitalized organisation token immediately following an "at" boundary, e.g.
 *    "Role at TargetCorp looking for Senior Product Analyst" -> "TargetCorp".
 *    Multi-word capture stops at the first lowercase token, so trailing prose is never swallowed,
 *    and generic role/level words (see `isPlausibleCompanyName`) are rejected outright.
 *
 * Returns `undefined` (never `""`) when nothing is confidently found so downstream privacy gating
 * treats the target company as genuinely absent instead of scrubbing against an empty string.
 */
function deriveTargetCompany(state: AgentState): string | undefined {
  const research = state.companyResearch;
  if (research && typeof research === "object") {
    const fromResearch = [research.name, research.company].find(
      (value): value is string => typeof value === "string" && value.trim().length > 1
    );
    if (fromResearch) return fromResearch.trim();
  }

  const discovered = state.discoveredJobs?.[0]?.company;
  if (typeof discovered === "string" && discovered.trim().length > 1) {
    return discovered.trim();
  }

  const jdMatch = (state.selectedJobDescription || "").match(
    /\bat\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*)*)/
  );
  const jdCandidate = jdMatch?.[1]?.trim();
  if (jdCandidate && isPlausibleCompanyName(jdCandidate)) return jdCandidate;

  return undefined;
}

/**
 * Builds the Phase-2 assembled resume context from RESOLVED Phase-1 bullet output (REQ-EVT-04).
 * Only experience metadata plus the already-tailored bullets are included so the holistic summary is
 * synthesized from post-tailoring state; the full raw resume is deliberately never attached.
 */
function buildAssembledResume(
  experience: Array<{ title?: string; company?: string; dates?: string | null; description?: string }>,
  tailoredBulletsByJob: string[]
): string {
  const blocks = experience.map((exp, index) => {
    const header = `### ${exp.company} – ${exp.title} (${exp.dates || "—"})`;
    const bullets = (tailoredBulletsByJob[index] || exp.description || "").trim();
    return `${header}\n${bullets}`;
  });
  return ["## Experience", ...blocks].join("\n\n");
}

/**
 * Applies the company privacy guard to Phase-1 suggestions (REQ-UBI-02, REQ-ERR-01).
 * Only `suggestedText` is sanitized — `originalText` must always remain the candidate's authentic
 * verbatim history and is therefore never touched.
 */
function sanitizePhaseOneSuggestions(
  suggestions: ResumeSuggestion[],
  vettedEmployers: string[],
  targetCompany?: string
): ResumeSuggestion[] {
  return suggestions.map((sug) => ({
    ...sug,
    suggestedText: sanitizeCompanyReferences(sug.suggestedText, vettedEmployers, targetCompany),
  }));
}
