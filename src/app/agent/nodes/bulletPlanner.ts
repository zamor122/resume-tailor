import type { AgentState, BulletPlan, JobAudit, JobBulletChange, RecencyTier } from "../state";

export function getRecencyTier(jobIndex: number): RecencyTier {
  if (jobIndex === 0 || jobIndex === 1) {
    return "recent_deep";
  }
  if (jobIndex === 2 || jobIndex === 3) {
    return "mid_career";
  }
  return "foundational";
}

export function getRecencyRationale(tier: RecencyTier, jobIndex: number): string {
  switch (tier) {
    case "recent_deep":
      return jobIndex === 0
        ? "Target role leadership, strategic scope, and detailed outcomes"
        : "Recent tenure strategic ownership and high-impact delivery";
    case "mid_career":
      return "Mid-career transferable competencies and proven milestones";
    case "foundational":
      return "Foundational career authenticity and core execution baseline";
  }
}

export function bulletPlannerNode(state: AgentState): Partial<AgentState> {
  const { preferences, resumeAST, sortedMissingKeywords = [] } = state;
  const experience = resumeAST?.experience || [];
  const { intensity, sectionsToModify } = preferences;

  console.log(`[bulletPlanner] ▶ Starting planner`, {
    intensity,
    experienceJobsCount: experience.length,
    missingKeywordsCount: sortedMissingKeywords.length,
    sectionsToModify,
  });

  let bulletPlan: BulletPlan;

  if (intensity === "minimal") {
    // Touch at most 2 bullets across jobs where missing keywords are highest
    const topChanges = sectionsToModify?.experience !== false
      ? pickTopBulletsAcrossJobs(experience, sortedMissingKeywords, 2).map((c) => ({
          ...c,
          recencyTier: getRecencyTier(c.jobIndex),
        }))
      : [];
    bulletPlan = {
      summaryChange: false,
      skillsChange: false,
      jobBulletChanges: topChanges,
    };
  } else if (intensity === "targeted") {
    // Universal Recency-Graduated Pipeline: process every job chunk with recency-graduated depth
    const jobChanges: JobBulletChange[] = sectionsToModify?.experience !== false
      ? experience.map((_, i) => {
          const tier = getRecencyTier(i);
          return {
            jobIndex: i,
            bulletIndices: "all" as const,
            reason: getRecencyRationale(tier, i),
            recencyTier: tier,
          };
        })
      : [];
    bulletPlan = {
      summaryChange: Boolean(sectionsToModify?.summary),
      skillsChange: Boolean(sectionsToModify?.skills),
      jobBulletChanges: jobChanges,
    };
  } else {
    // Complete Overhaul: all bullets across all jobs
    const jobChanges: JobBulletChange[] = sectionsToModify?.experience !== false
      ? experience.map((_, i) => {
          const tier = getRecencyTier(i);
          return {
            jobIndex: i,
            bulletIndices: "all" as const,
            reason: "complete overhaul mode",
            recencyTier: tier,
          };
        })
      : [];
    bulletPlan = {
      summaryChange: Boolean(sectionsToModify?.summary),
      skillsChange: Boolean(sectionsToModify?.skills),
      jobBulletChanges: jobChanges,
    };
  }

  const jobAudits: JobAudit[] = experience.map((job, idx) => {
    const tier = getRecencyTier(idx);
    const planChange = bulletPlan.jobBulletChanges.find((c) => c.jobIndex === idx);
    if (planChange) {
      return {
        jobIndex: idx,
        hasChanges: true,
        bulletIndices: planChange.bulletIndices,
        auditRationale: planChange.reason || getRecencyRationale(tier, idx),
        recencyTier: tier,
      };
    }
    return {
      jobIndex: idx,
      hasChanges: false,
      bulletIndices: [],
      auditRationale: idx === experience.length - 1
        ? "Foundational early tenure preserved to maintain genuine career history"
        : "Role already satisfies target profile baseline; preserved as-is",
      recencyTier: tier,
    };
  });

  bulletPlan.jobAudits = jobAudits;

  const totalBulletsToModify = bulletPlan.jobBulletChanges.reduce(
    (sum, c) => sum + (c.bulletIndices === "all" ? 99 : c.bulletIndices.length),
    0
  );

  console.log(`[bulletPlanner] ✔ Plan generated`, {
    intensity,
    summaryChange: bulletPlan.summaryChange,
    skillsChange: bulletPlan.skillsChange,
    totalBulletsToModify,
    jobChanges: bulletPlan.jobBulletChanges.map((c) => ({
      jobIndex: c.jobIndex,
      company: experience[c.jobIndex]?.company || `Job ${c.jobIndex}`,
      bulletIndices: c.bulletIndices,
    })),
  });

  return {
    bulletPlan,
    logs: [
      `[bulletPlanner] Intensity: ${intensity.toUpperCase()} -> Plan: ${bulletPlan.summaryChange ? "Summary + " : ""}${totalBulletsToModify > 50 ? "All experience bullets" : `${totalBulletsToModify} experience bullets`}`,
    ],
  };
}

function isBullet(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^<\/?(?:think|thought|reasoning|cot)/i.test(trimmed)) return false;
  if (/^(\*{1,3}|#{1,6})\s*Analyze/i.test(trimmed)) return false;
  if (/^\*{1,2}[a-zA-Z0-9]/.test(trimmed)) return false;
  if (/^#{1,6}\s+/.test(trimmed)) return false;

  return (
    /^([-*•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]|\d+[.)])\s+/.test(trimmed) ||
    /^[•–—●○■▪✦★◦▸\u2022\u25cf\u25cb\u25aa\u25ab]/.test(trimmed)
  );
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
  if (experience.length === 0) return [];

  const candidates: Array<{ jobIndex: number; bulletIndex: number; gapScore: number }> = [];

  experience.forEach((job, ji) => {
    const bullets = getBulletsList(job.description || "");

    bullets.forEach((b, bi) => {
      const bLower = b.toLowerCase();
      // Count how many missing keywords could be relevant or are missing
      const keywordGap = missingKeywords.filter((kw) => !bLower.includes(kw.toLowerCase())).length;
      // Recency bonus: recent roles are higher priority for recruiters
      const recencyBonus = Math.max(0, 10 - ji * 2);
      // Slight bonus for top bullets in a job (first 2 bullets are highest impact)
      const positionBonus = bi === 0 ? 3 : bi === 1 ? 2 : 0;
      const gapScore = keywordGap * 2 + recencyBonus + positionBonus;

      candidates.push({ jobIndex: ji, bulletIndex: bi, gapScore });
    });
  });

  candidates.sort((a, b) => b.gapScore - a.gapScore);

  // Distribute across jobs rather than dumping all into job 0
  const maxPerJob = experience.length > 1
    ? Math.max(2, Math.ceil(maxTotal / Math.min(experience.length, 3)))
    : maxTotal;

  const jobCounts: Record<number, number> = {};
  const selected: Array<{ jobIndex: number; bulletIndex: number }> = [];

  for (const cand of candidates) {
    if (selected.length >= maxTotal) break;
    const currentCount = jobCounts[cand.jobIndex] || 0;
    if (currentCount < maxPerJob) {
      selected.push(cand);
      jobCounts[cand.jobIndex] = currentCount + 1;
    }
  }

  // If strict per-job cap left remaining slots, fill from top remaining candidates
  if (selected.length < maxTotal) {
    for (const cand of candidates) {
      if (selected.length >= maxTotal) break;
      if (!selected.some(s => s.jobIndex === cand.jobIndex && s.bulletIndex === cand.bulletIndex)) {
        selected.push(cand);
      }
    }
  }

  const byJob: Record<number, number[]> = {};
  selected.forEach(({ jobIndex, bulletIndex }) => {
    if (!byJob[jobIndex]) byJob[jobIndex] = [];
    byJob[jobIndex].push(bulletIndex);
  });

  return Object.entries(byJob).map(([ji, bis]) => ({
    jobIndex: Number(ji),
    bulletIndices: bis.sort((a, b) => a - b),
    reason: "highest keyword gap optimization",
  }));
}
