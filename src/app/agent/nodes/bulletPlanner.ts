import type { AgentState, BulletPlan } from "../state";

export function bulletPlannerNode(state: AgentState): Partial<AgentState> {
  const { preferences, resumeAST, sortedMissingKeywords = [] } = state;
  const experience = resumeAST?.experience || [];
  const { intensity, sectionsToModify } = preferences;

  let bulletPlan: BulletPlan;

  if (intensity === "minimal") {
    // Touch at most 2 bullets across ALL jobs where missing keywords are highest
    bulletPlan = {
      summaryChange: false,
      skillsChange: false,
      jobBulletChanges: pickTopBulletsAcrossJobs(experience, sortedMissingKeywords, 2),
    };
  } else if (intensity === "targeted") {
    // Rewrite 3–5 highest-relevance bullets + summary
    bulletPlan = {
      summaryChange: sectionsToModify.summary,
      skillsChange: sectionsToModify.skills,
      jobBulletChanges: pickTopBulletsAcrossJobs(experience, sortedMissingKeywords, 5),
    };
  } else {
    // Complete Overhaul: all bullets across all jobs
    bulletPlan = {
      summaryChange: sectionsToModify.summary,
      skillsChange: sectionsToModify.skills,
      jobBulletChanges: experience.map((_, i) => ({
        jobIndex: i,
        bulletIndices: "all",
        reason: "complete overhaul mode",
      })),
    };
  }

  const totalBulletsToModify = bulletPlan.jobBulletChanges.reduce(
    (sum, c) => sum + (c.bulletIndices === "all" ? 99 : c.bulletIndices.length),
    0
  );

  return {
    bulletPlan,
    logs: [
      `[bulletPlanner] Intensity: ${intensity.toUpperCase()} -> Plan: ${bulletPlan.summaryChange ? "Summary + " : ""}${totalBulletsToModify > 50 ? "All experience bullets" : `${totalBulletsToModify} experience bullets`}`,
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

function pickTopBulletsAcrossJobs(
  experience: Array<{ description: string }>,
  missingKeywords: string[],
  maxTotal: number
): Array<{ jobIndex: number; bulletIndices: number[]; reason: string }> {
  const candidates: Array<{ jobIndex: number; bulletIndex: number; gapScore: number }> = [];

  experience.forEach((job, ji) => {
    const bullets = getBulletsList(job.description || "");

    bullets.forEach((b, bi) => {
      const bLower = b.toLowerCase();
      // Count how many missing keywords could be relevant or are missing
      const gapScore = missingKeywords.filter((kw) => !bLower.includes(kw.toLowerCase())).length;
      candidates.push({ jobIndex: ji, bulletIndex: bi, gapScore });
    });
  });

  candidates.sort((a, b) => b.gapScore - a.gapScore);
  const selected = candidates.slice(0, maxTotal);

  const byJob: Record<number, number[]> = {};
  selected.forEach(({ jobIndex, bulletIndex }) => {
    if (!byJob[jobIndex]) byJob[jobIndex] = [];
    byJob[jobIndex].push(bulletIndex);
  });

  return Object.entries(byJob).map(([ji, bis]) => ({
    jobIndex: Number(ji),
    bulletIndices: bis,
    reason: "highest keyword gap optimization",
  }));
}
