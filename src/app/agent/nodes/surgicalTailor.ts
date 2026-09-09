import type { AgentState } from "../state";
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
  const promises: Promise<{ type: "summary" | "bullets"; index?: number; text: string }>[] = [];

  // 1. Tailor Summary if planned
  if (bulletPlan?.summaryChange) {
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
      ).then((res) => ({ type: "summary", text: res.text.trim() }))
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
      ).then((res) => ({ type: "bullets", index: jobIndex, text: res.text.trim() }))
    );
  });

  const results = await Promise.all(promises);

  let tailoredSummary = resumeAST?.summary || "";
  const tailoredBulletsByJob: string[] = experience.map((e) => e.description);

  results.forEach((r) => {
    if (r.type === "summary") {
      tailoredSummary = r.text;
    } else if (r.type === "bullets" && r.index !== undefined) {
      const planItem = bulletPlan?.jobBulletChanges.find((c) => c.jobIndex === r.index);
      if (planItem?.bulletIndices === "all") {
        tailoredBulletsByJob[r.index] = r.text;
      } else if (planItem?.bulletIndices) {
        tailoredBulletsByJob[r.index] = spliceRewrittenBullets(
          experience[r.index].description,
          r.text,
          planItem.bulletIndices as number[]
        );
      }
    }
  });

  return {
    tailoredSummary,
    tailoredBulletsByJob,
    logs: [
      `[surgicalTailor] Completed ${results.length} surgical tailoring tasks in parallel (${preferences.intensity.toUpperCase()})`,
    ],
  };
}

function extractSpecificBullets(description: string, indices: number[]): string {
  const lines = description.split("\n");
  const bullets = lines.filter((l) => l.trim().startsWith("-"));
  return indices
    .map((i) => bullets[i])
    .filter(Boolean)
    .join("\n");
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
    if (l.trim().startsWith("-")) {
      bullets.push(l);
    } else if (bullets.length === 0 && l.trim().length > 0) {
      nonBulletPrefixes.push({ index: 0, line: l });
    }
  });

  const rewrittenList = rewrittenBulletsText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("-"));

  targetIndices.forEach((targetIdx, listIdx) => {
    if (rewrittenList[listIdx] && bullets[targetIdx]) {
      bullets[targetIdx] = rewrittenList[listIdx];
    }
  });

  const prefix = nonBulletPrefixes.map((p) => p.line).join("\n");
  return prefix ? `${prefix}\n${bullets.join("\n")}` : bullets.join("\n");
}
