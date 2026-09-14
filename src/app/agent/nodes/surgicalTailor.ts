import type { AgentState, ResumeSuggestion } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import {
  getSummaryTailoringPrompt,
  getExperienceBulletsPrompt,
} from "@/app/prompts/tailoringSection";
import {
  groupSuggestionsBySection,
  isolatePreciseOriginalChange,
} from "@/app/utils/resumeReassemble";
import { parseChunkBulletsResponse } from "@/app/utils/chunkBulletParser";

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
  const promises: Promise<{ type: "summary" | "bullets"; index?: number; text: string; originalInputText: string }>[] = [];
  const suggestions: ResumeSuggestion[] = [];

  console.log(`[surgicalTailor] ▶ Starting node`, {
    intensity: preferences?.intensity,
    summaryPlanned: !!bulletPlan?.summaryChange,
    jobsPlanned: bulletPlan?.jobBulletChanges?.length || 0,
    totalExperienceJobs: experience.length,
    missingKeywords: sortedMissingKeywords.slice(0, 8),
  });

  // 1. Tailor Summary if planned
  if (bulletPlan?.summaryChange) {
    const originalSummary = resumeAST?.summary || "";
    console.log(`[surgicalTailor] Summary tailoring task dispatched (length: ${originalSummary.length})`);
    promises.push(
      generateWithFallback(
        getSummaryTailoringPrompt({
          summaryText: originalSummary,
          jobDescription: jdSnippet,
          jobTitle: state.jobTitle,
          preferences,
          userRequestedKeywords: sortedMissingKeywords.slice(0, 5),
        }),
        state.modelKey,
        { maxTokens: 800, temperature: 0.2 },
        state.sessionApiKeys
      )
        .then((res) => {
          console.log(`[surgicalTailor] Summary LLM response received (length: ${res.text.length})`);
          return {
            type: "summary" as const,
            text: res.text.trim(),
            originalInputText: originalSummary,
          };
        })
        .catch((err) => {
          console.warn("[surgicalTailor] Summary tailoring LLM failed:", err);
          return {
            type: "summary" as const,
            text: originalSummary,
            originalInputText: originalSummary,
          };
        })
    );
  }

  // 2. Tailor Experience Bullets according to plan
  bulletPlan?.jobBulletChanges.forEach(({ jobIndex, bulletIndices }) => {
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
    console.log(`[surgicalTailor] Job ${jobIndex} (${exp.company}) dispatched with ${inputBulletsList.length} bullets:`, {
      bulletIndices,
      bulletsTextSnippet: bulletsText.slice(0, 100),
    });

    promises.push(
      generateWithFallback(
        getExperienceBulletsPrompt({
          jobTitle: exp.title,
          company: exp.company,
          dates: exp.dates,
          bulletsText,
          jobDescription: jdSnippet,
          preferences,
          userRequestedKeywords: sortedMissingKeywords.slice(0, 10),
        }),
        state.modelKey,
        { maxTokens: 2000, temperature: 0.2 },
        state.sessionApiKeys
      )
        .then((res) => {
          console.log(`[surgicalTailor] Job ${jobIndex} (${exp.company}) response received (chars: ${res.text.length})`);
          return {
            type: "bullets" as const,
            index: jobIndex,
            text: res.text.trim(),
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

  const results = await Promise.all(promises);

  let tailoredSummary = resumeAST?.summary || "";
  const tailoredBulletsByJob: string[] = experience.map((e) => e.description);

  results.forEach((r) => {
    if (r.type === "summary") {
      tailoredSummary = r.text;
      if (r.originalInputText.trim() && r.text.trim() && r.originalInputText.trim() !== r.text.trim()) {
        const topKeywords = sortedMissingKeywords.slice(0, 4);
        suggestions.push({
          id: "sug-summary",
          section: "Professional Summary",
          originalText: isolatePreciseOriginalChange(r.originalInputText, r.text, rawResume),
          suggestedText: r.text.trim(),
          reason: `Reframed summary to highlight target role competencies, core tech stack, and leadership scope`,
          keywords: topKeywords,
          category: "summary",
          status: "pending",
        });
        console.log(`[surgicalTailor] Added summary suggestion`);
      }
    } else if (r.type === "bullets" && r.index !== undefined) {
      const exp = experience[r.index];
      const planItem = bulletPlan?.jobBulletChanges.find((c) => c.jobIndex === r.index);

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

        tailoredBulletsByJob[r.index] = tailoredBullets.join("\n");
        chunkSuggestions.forEach((sug) => {
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

        tailoredBulletsByJob[r.index] = spliceRewrittenBullets(
          experience[r.index].description,
          tailoredBullets.join("\n"),
          targetIndices
        );

        chunkSuggestions.forEach((sug) => {
          const originalIdx = targetIndices[sug.bulletIndex ?? 0] ?? (sug.bulletIndex ?? 0);
          suggestions.push({
            ...sug,
            id: `sug-job-${r.index}-bullet-${originalIdx}`,
            bulletIndex: originalIdx,
            reason: planItem.reason || sug.reason,
          });
        });
      }
    }
  });

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
      `[surgicalTailor] Generated ${suggestions.length} granular suggestions across ${results.length} tailoring tasks (${preferences.intensity.toUpperCase()})`,
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
