import type { AgentState, ResumeSuggestion } from "../state";
import { generateWithFallback } from "@/app/services/model-fallback";
import {
  getSummaryTailoringPrompt,
  getExperienceBulletsPrompt,
} from "@/app/prompts/tailoringSection";

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

  // 1. Tailor Summary if planned
  if (bulletPlan?.summaryChange) {
    const originalSummary = resumeAST?.summary || "";
    promises.push(
      generateWithFallback(
        getSummaryTailoringPrompt({
          resume: rawResume,
          jobDescription: jdSnippet,
          jobTitle: state.jobTitle,
          preferences,
          userRequestedKeywords: sortedMissingKeywords.slice(0, 5),
        }),
        state.modelKey,
        { maxTokens: 400, temperature: 0.2 },
        state.sessionApiKeys
      )
        .then((res) => ({
          type: "summary" as const,
          text: res.text.trim(),
          originalInputText: originalSummary,
        }))
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
    if (!exp) return;

    const bulletsText =
      bulletIndices === "all"
        ? exp.description
        : extractSpecificBullets(exp.description, bulletIndices);

    promises.push(
      generateWithFallback(
        getExperienceBulletsPrompt({
          jobTitle: exp.title,
          company: exp.company,
          dates: exp.dates,
          bulletsText,
          jobDescription: jdSnippet,
          resumeContext: rawResume,
          preferences,
          userRequestedKeywords: sortedMissingKeywords.slice(0, 10),
        }),
        state.modelKey,
        { maxTokens: bulletIndices === "all" ? 800 : 400, temperature: 0.2 },
        state.sessionApiKeys
      )
        .then((res) => ({
          type: "bullets" as const,
          index: jobIndex,
          text: res.text.trim(),
          originalInputText: bulletsText,
        }))
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
          originalText: r.originalInputText.trim(),
          suggestedText: r.text.trim(),
          reason: `Reframed summary to highlight target role competencies and leadership scope`,
          keywords: topKeywords,
          status: "accepted",
        });
      }
    } else if (r.type === "bullets" && r.index !== undefined) {
      const exp = experience[r.index];
      const planItem = bulletPlan?.jobBulletChanges.find((c) => c.jobIndex === r.index);
      
      if (planItem?.bulletIndices === "all") {
        tailoredBulletsByJob[r.index] = r.text;
        // Break into individual bullet suggestions
        const origBullets = getBulletsList(exp.description);
        const newBullets = getBulletsList(r.text);
        newBullets.forEach((newB, bIdx) => {
          const origB = origBullets[bIdx] || origBullets[0] || "";
          if (origB && newB && origB.trim() !== newB.trim()) {
            const matchedKw = sortedMissingKeywords.filter((kw) =>
              newB.toLowerCase().includes(kw.toLowerCase())
            ).slice(0, 3);
            suggestions.push({
              id: `sug-job-${r.index}-bullet-${bIdx}`,
              section: `${exp.company} – ${exp.title}`,
              originalText: origB.trim(),
              suggestedText: newB.trim(),
              reason: planItem.reason || "Targeted ATS keyword alignment and quantifiable achievement metric",
              keywords: matchedKw,
              status: "accepted",
              jobIndex: r.index,
              bulletIndex: bIdx,
            });
          }
        });
      } else if (planItem?.bulletIndices) {
        tailoredBulletsByJob[r.index] = spliceRewrittenBullets(
          experience[r.index].description,
          r.text,
          planItem.bulletIndices as number[]
        );
        const origBullets = extractSpecificBulletsArray(exp.description, planItem.bulletIndices as number[]);
        const newBullets = getBulletsList(r.text);
        newBullets.forEach((newB, bIdx) => {
          const origB = origBullets[bIdx] || "";
          if (origB && newB && origB.trim() !== newB.trim()) {
            const matchedKw = sortedMissingKeywords.filter((kw) =>
              newB.toLowerCase().includes(kw.toLowerCase())
            ).slice(0, 3);
            suggestions.push({
              id: `sug-job-${r.index}-bullet-${planItem.bulletIndices[bIdx] ?? bIdx}`,
              section: `${exp.company} – ${exp.title}`,
              originalText: origB.trim(),
              suggestedText: newB.trim(),
              reason: planItem.reason || "Targeted ATS keyword alignment and quantifiable achievement metric",
              keywords: matchedKw,
              status: "accepted",
              jobIndex: r.index,
              bulletIndex: typeof planItem.bulletIndices === "object" ? (planItem.bulletIndices[bIdx] ?? bIdx) : bIdx,
            });
          }
        });
      }
    }
  });

  return {
    tailoredSummary,
    tailoredBulletsByJob,
    suggestions,
    logs: [
      `[surgicalTailor] Generated ${suggestions.length} granular suggestions across ${results.length} tailoring tasks (${preferences.intensity.toUpperCase()})`,
    ],
  };
}

function isBullet(line: string): boolean {
  const trimmed = line.trim();
  return /^([-*•–—]|\d+\.)\s+/.test(trimmed) || /^[-*•–—]/.test(trimmed);
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
  const lines = description.split("\n");
  const bullets = lines.filter(isBullet);
  return indices
    .map((i) => bullets[i])
    .filter(Boolean);
}

function spliceRewrittenBullets(
  originalDescription: string,
  rewrittenBulletsText: string,
  targetIndices: number[]
): string {
  const originalLines = originalDescription.split("\n");
  const bullets: string[] = [];
  const nonBulletPrefixes: Array<{ index: number; line: string }> = [];

  originalLines.forEach((l) => {
    if (isBullet(l)) {
      bullets.push(l);
    } else if (bullets.length === 0 && l.trim().length > 0) {
      nonBulletPrefixes.push({ index: 0, line: l });
    }
  });

  const rewrittenList = getBulletsList(rewrittenBulletsText);

  targetIndices.forEach((targetIdx, listIdx) => {
    if (rewrittenList[listIdx] && bullets[targetIdx]) {
      bullets[targetIdx] = rewrittenList[listIdx];
    }
  });

  const prefix = nonBulletPrefixes.map((p) => p.line).join("\n");
  return prefix ? `${prefix}\n${bullets.join("\n")}` : bullets.join("\n");
}
