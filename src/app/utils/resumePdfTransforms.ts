/**
 * Template-specific transforms: build block list (and optional payload) from ResumeSections
 * for each PDF template (clean-chronological, creative-startup, functional, modern-hybrid, one-pager).
 */

import type { PdfTemplateId } from "@/app/constants/pdfTemplates";
import { getPdfTemplateConfig } from "@/app/constants/pdfTemplates";
import type { ResumeBlock, ResumeSections, ExperienceEntry } from "./resumePdfStructure";

export interface ClusterSection {
  title: string;
  bullets: string[];
}

export interface WorkHistoryEntry {
  company: string;
  title: string;
  dates: string;
}

export interface BuildBlocksResult {
  blocks: ResumeBlock[];
  keyAchievements?: string[];
  clusters?: ClusterSection[];
  workHistoryFooter?: WorkHistoryEntry[];
}

const DEFAULT_CLUSTER_CLOUD = ["kubernetes", "eks", "ci/cd", "circleci", "terraform", "aws", "deployment", "devops", "docker", "infrastructure", "cloud"];
const DEFAULT_CLUSTER_FRONTEND = ["react", "typescript", "i18n", "ui", "frontend", "redux", "next.js", "nextjs", "spa", "component"];
const DEFAULT_CLUSTER_API = ["rest", "graphql", "api", "backend", "microservices", "server", "node", "express"];

function blockSection(title: string): ResumeBlock {
  return { type: "section", text: title };
}
function blockParagraph(text: string): ResumeBlock {
  return { type: "paragraph", text };
}
function blockBullet(text: string): ResumeBlock {
  return { type: "bullet", text };
}

function experienceEntryToBlocks(entry: ExperienceEntry, bulletLimit: number): ResumeBlock[] {
  const bullets = entry.bullets.slice(0, bulletLimit);
  const line2 = entry.dates ? `${entry.title} – ${entry.dates}` : entry.title;
  const out: ResumeBlock[] = [
    blockParagraph(entry.company),
    blockParagraph(line2),
    ...bullets.map(blockBullet),
  ];
  return out;
}

/** Extract 3–4 key achievement bullets (metrics, Led, Reduced, Increased) or first bullets from recent roles. */
function deriveKeyAchievements(sections: ResumeSections, maxCount: number): string[] {
  const candidates: string[] = [];
  const metricPattern = /%|\$|\d+x|led\s|reduced|increased|improved|delivered|cut|saved|grew/i;
  for (const entry of sections.experience.slice(0, 3)) {
    for (const b of entry.bullets) {
      if (metricPattern.test(b)) candidates.push(b);
    }
  }
  if (candidates.length >= maxCount) return candidates.slice(0, maxCount);
  for (const entry of sections.experience.slice(0, 2)) {
    for (const b of entry.bullets.slice(0, 2)) {
      if (!candidates.includes(b)) candidates.push(b);
    }
  }
  return candidates.slice(0, maxCount);
}

/** Map a bullet to one cluster by keyword (first match). */
function clusterForBullet(
  text: string,
  keywords?: { cloud?: string[]; frontend?: string[]; api?: string[] }
): "cloud" | "frontend" | "api" | null {
  const lower = text.toLowerCase();
  const cloud = keywords?.cloud?.length ? keywords.cloud : DEFAULT_CLUSTER_CLOUD;
  const frontend = keywords?.frontend?.length ? keywords.frontend : DEFAULT_CLUSTER_FRONTEND;
  const api = keywords?.api?.length ? keywords.api : DEFAULT_CLUSTER_API;
  if (cloud.some((k) => lower.includes(k))) return "cloud";
  if (frontend.some((k) => lower.includes(k))) return "frontend";
  if (api.some((k) => lower.includes(k))) return "api";
  return null;
}

/** Build cluster sections and work history from experience. */
function buildFunctionalClusters(
  sections: ResumeSections,
  clusterKeywords?: { cloud?: string[]; frontend?: string[]; api?: string[] }
): { clusters: ClusterSection[]; workHistory: WorkHistoryEntry[] } {
  const cloud: string[] = [];
  const frontend: string[] = [];
  const api: string[] = [];
  const seen = new Set<string>();
  for (const entry of sections.experience) {
    for (const b of entry.bullets) {
      const key = clusterForBullet(b, clusterKeywords);
      if (key && !seen.has(b)) {
        seen.add(b);
        if (key === "cloud") cloud.push(b);
        else if (key === "frontend") frontend.push(b);
        else api.push(b);
      }
    }
  }
  const clusters: ClusterSection[] = [];
  if (cloud.length) clusters.push({ title: "Cloud Infrastructure & DevOps", bullets: cloud });
  if (frontend.length) clusters.push({ title: "Frontend Architecture", bullets: frontend });
  if (api.length) clusters.push({ title: "API & Backend Systems", bullets: api });
  const workHistory: WorkHistoryEntry[] = sections.experience.map((e) => ({
    company: e.company,
    title: e.title,
    dates: e.dates,
  }));
  return { clusters, workHistory };
}

/** Summary to blocks (optionally truncated to maxLines). */
function summaryToBlocks(summary: string, maxLines?: number): ResumeBlock[] {
  if (!summary.trim()) return [];
  const lines = summary.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const use = maxLines != null ? lines.slice(0, maxLines).join("\n") : summary;
  return [blockSection("Summary"), blockParagraph(use)];
}

/** Skills to blocks: either one paragraph (comma-separated) or section + bullets. */
function skillsToBlocks(skills: string[], asOneParagraph: boolean): ResumeBlock[] {
  if (!skills.length) return [];
  if (asOneParagraph) {
    return [blockSection("Skills"), blockParagraph(skills.join(", "))];
  }
  return [
    blockSection("Skills"),
    ...skills.map((s) => blockBullet(s)),
  ];
}

/**
 * Build template-specific blocks (and optional payload) from structured sections.
 */
export function buildBlocksForTemplate(
  sections: ResumeSections,
  templateId: PdfTemplateId
): BuildBlocksResult {
  const config = getPdfTemplateConfig(templateId);
  const blocks: ResumeBlock[] = [];

  if (sections.name) blocks.push({ type: "name", text: sections.name });
  if (sections.contact) blocks.push(blockParagraph(sections.contact));

  switch (templateId) {
    case "clean-chronological": {
      const maxFirst = config.cleanChronologicalMaxBulletsFirst ?? 5;
      const maxMid = config.cleanChronologicalMaxBulletsMid ?? 4;
      const maxOld = config.cleanChronologicalMaxBulletsOld ?? 3;
      blocks.push(...summaryToBlocks(sections.summary));
      blocks.push(blockSection("Experience"));
      sections.experience.forEach((entry, i) => {
        let maxBullets = maxOld;
        if (i < 2) maxBullets = maxFirst;
        else if (i < 4) maxBullets = maxMid;
        blocks.push(...experienceEntryToBlocks(entry, maxBullets));
      });
      if (sections.priorExperience.trim()) {
        blocks.push(blockSection("Prior Experience"));
        sections.priorExperience.split(/\n/).forEach((line) => {
          const t = line.trim();
          if (t) blocks.push(blockParagraph(t));
        });
      }
      blocks.push(...skillsToBlocks(sections.skills, false));
      if (sections.education.trim()) {
        blocks.push(blockSection("Education"));
        blocks.push(blockParagraph(sections.education));
      }
      return { blocks };
    }

    case "creative-startup": {
      blocks.push(...skillsToBlocks(sections.skills, false));
      blocks.push(...summaryToBlocks(sections.summary));
      if (sections.projects?.trim()) {
        blocks.push(blockSection("Projects & Innovation"));
        blocks.push(blockParagraph(sections.projects));
      }
      blocks.push(blockSection("Experience"));
      sections.experience.forEach((entry) => {
        blocks.push(...experienceEntryToBlocks(entry, entry.bullets.length));
      });
      if (sections.priorExperience.trim()) {
        blocks.push(blockSection("Prior Experience"));
        sections.priorExperience.split(/\n/).forEach((line) => {
          const t = line.trim();
          if (t) blocks.push(blockParagraph(t));
        });
      }
      if (sections.education.trim()) {
        blocks.push(blockSection("Education"));
        blocks.push(blockParagraph(sections.education));
      }
      return { blocks };
    }

    case "functional": {
      blocks.push(...summaryToBlocks(sections.summary));
      const { clusters, workHistory } = buildFunctionalClusters(sections, config.functionalClusterKeywords);
      for (const c of clusters) {
        blocks.push(blockSection(c.title));
        c.bullets.forEach((b) => blocks.push(blockBullet(b)));
      }
      return {
        blocks,
        clusters: clusters.length ? clusters : undefined,
        workHistoryFooter: workHistory.length ? workHistory : undefined,
      };
    }

    case "modern-hybrid": {
      const keyCount = config.modernHybridKeyAchievementsCount ?? 4;
      const oldestMaxBullets = config.modernHybridOldestRoleMaxBullets ?? 2;
      blocks.push(...summaryToBlocks(sections.summary));
      const keyAchievements = deriveKeyAchievements(sections, keyCount);
      const experience = sections.experience.map((entry, i) => {
        const isOldest = i === sections.experience.length - 1 && sections.experience.length > 1;
        const maxBullets = isOldest ? oldestMaxBullets : entry.bullets.length;
        return { ...entry, bullets: entry.bullets.slice(0, maxBullets) };
      });
      blocks.push(blockSection("Experience"));
      experience.forEach((entry) => blocks.push(...experienceEntryToBlocks(entry, entry.bullets.length)));
      if (sections.priorExperience.trim()) {
        blocks.push(blockSection("Prior Experience"));
        sections.priorExperience.split(/\n/).forEach((line) => {
          const t = line.trim();
          if (t) blocks.push(blockParagraph(t));
        });
      }
      blocks.push(...skillsToBlocks(sections.skills, false));
      if (sections.education.trim()) {
        blocks.push(blockSection("Education"));
        blocks.push(blockParagraph(sections.education));
      }
      return {
        blocks,
        keyAchievements: keyAchievements.length ? keyAchievements : undefined,
      };
    }

    case "one-pager": {
      const onePagerMaxBullets = config.onePagerMaxBulletsPerRole ?? 3;
      const oldestSingleLine = config.onePagerOldestRoleSingleLine !== false;
      blocks.push(...summaryToBlocks(sections.summary, 2));
      blocks.push(blockSection("Experience"));
      const lastIdx = sections.experience.length - 1;
      sections.experience.forEach((entry, i) => {
        if (oldestSingleLine && i === lastIdx && sections.experience.length > 1) {
          const line = entry.dates ? `${entry.title} – ${entry.company} – ${entry.dates}` : `${entry.company} – ${entry.title}`;
          blocks.push(blockParagraph(line));
        } else {
          blocks.push(...experienceEntryToBlocks(entry, onePagerMaxBullets));
        }
      });
      if (sections.priorExperience.trim()) {
        blocks.push(blockSection("Prior Experience"));
        sections.priorExperience.split(/\n/).forEach((line) => {
          const t = line.trim();
          if (t) blocks.push(blockParagraph(t));
        });
      }
      blocks.push(...skillsToBlocks(sections.skills, true));
      if (sections.education.trim()) {
        blocks.push(blockSection("Education"));
        blocks.push(blockParagraph(sections.education));
      }
      return { blocks };
    }

    default: {
      blocks.push(...summaryToBlocks(sections.summary));
      blocks.push(blockSection("Experience"));
      sections.experience.forEach((entry) => blocks.push(...experienceEntryToBlocks(entry, entry.bullets.length)));
      if (sections.priorExperience.trim()) {
        blocks.push(blockSection("Prior Experience"));
        sections.priorExperience.split(/\n/).forEach((line) => {
          const t = line.trim();
          if (t) blocks.push(blockParagraph(t));
        });
      }
      blocks.push(...skillsToBlocks(sections.skills, false));
      if (sections.education.trim()) {
        blocks.push(blockSection("Education"));
        blocks.push(blockParagraph(sections.education));
      }
      return { blocks };
    }
  }
}
