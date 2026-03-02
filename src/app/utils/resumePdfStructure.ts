/**
 * Parse resume markdown (after dedupe) into a flat structure for React-PDF rendering.
 * Also supports structured parse (ResumeSections) for template-specific transforms.
 */

import { deduplicateResumeSections } from "./resumeSectionDedupe";

/** Strip inline markdown to plain text for PDF. */
function stripInline(text: string): string {
  let t = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  return t.trim();
}

export type ResumeBlock =
  | { type: "name"; text: string }
  | { type: "section"; text: string }
  | { type: "subsection"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet"; text: string };

/** One job in the Experience section: company/title/dates header + bullets. */
export interface ExperienceEntry {
  company: string;
  title: string;
  dates: string;
  bullets: string[];
}

/** Structured sections for template-specific PDF transforms. */
export interface ResumeSections {
  name: string;
  contact: string;
  summary: string;
  experience: ExperienceEntry[];
  skills: string[];
  education: string;
  priorExperience: string;
  projects: string | null;
}

const SECTION_HEADER_REG = /^##\s+(.+)$/;

const SUMMARY_VARIANTS = ["Summary", "Professional Summary", "Objective", "Profile"];
const EXPERIENCE_VARIANTS = ["Experience", "Work Experience", "Professional Experience", "Employment"];
const SKILLS_VARIANTS = ["Skills", "Technical Skills", "Core Competencies", "Skills & Technologies", "Key Skills", "Technical Expertise"];
const EDUCATION_VARIANTS = ["Education", "Education & Certifications", "Academic", "Education and Training"];
const PRIOR_EXPERIENCE_VARIANTS = ["Prior Experience", "Additional Experience", "Earlier Experience"];
const PROJECTS_VARIANTS = ["Projects", "Side Projects", "Projects & Innovation", "Projects & Experience"];

function normalizeSectionTitle(header: string): string {
  return stripInline(header.replace(/^#+\s*/, "").trim());
}

function findSection(resume: string, variants: readonly string[]): { title: string; body: string } | null {
  const lines = resume.split(/\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].trim().match(SECTION_HEADER_REG);
    if (!m) continue;
    const title = normalizeSectionTitle(m[1]);
    const match = variants.some((v) => title.toLowerCase() === v.toLowerCase());
    if (!match) continue;
    const bodyLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (/^##\s+/.test(lines[j].trim())) break;
      bodyLines.push(lines[j]);
    }
    return { title, body: bodyLines.join("\n").trim() };
  }
  return null;
}

/** Detect job boundary: "Title – Duration" (en/em dash). */
function looksLikeTitleDuration(line: string): boolean {
  const t = line.trim();
  if (!t || /^[-*]\s+/.test(t)) return false;
  return /\s+[–—-]\s+/.test(t) && (/\d{4}/.test(t) || /\b(?:Present|current|now)\b/i.test(t));
}

/** Date range at end of line: "Month YYYY - Present" or "Month YYYY - Month YYYY". */
const DATE_RANGE_AT_END = /\s+[–—-]\s+([A-Za-z]+\s+\d{4}\s+[–—-]\s+(?:Present|[A-Za-z]+\s+\d{4})|[A-Za-z]+\s*[–—-]\s*Present|\d{4}\s+[–—-]\s+(?:Present|\d{4}))\s*$/i;

/** Parse single-line job header: "Company, Title - February 2023 - Present" or "Company - Date range". */
function parseSingleLineJobHeader(line: string): { company: string; title: string; dates: string } | null {
  const t = stripInline(line);
  if (!t || /^[-*]\s+/.test(t)) return null;
  const m = t.match(DATE_RANGE_AT_END);
  if (!m) return null;
  const dates = m[1].trim();
  const beforeDates = t.slice(0, m.index).trim();
  const dash = beforeDates.lastIndexOf(" - ");
  const left = dash >= 0 ? beforeDates.slice(0, dash).trim() : beforeDates;
  const commaIdx = left.indexOf(",");
  const company = commaIdx >= 0 ? left.slice(0, commaIdx).trim() : left;
  const title = commaIdx >= 0 ? left.slice(commaIdx + 1).trim() : "";
  if (!company && !left) return null;
  return { company: company || left, title, dates };
}

/** Parse Experience section body into entries (company, title, dates, bullets). */
function parseExperienceBody(body: string): ExperienceEntry[] {
  const lines = body.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const entries: ExperienceEntry[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const isBullet = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);
    if (isBullet) {
      i++;
      continue;
    }
    const companyLine = line;
    const titleLine = i + 1 < lines.length ? lines[i + 1] : "";
    const nextIsBullet = i + 2 < lines.length && (/^[-*]\s+/.test(lines[i + 2]) || /^\d+\.\s+/.test(lines[i + 2]));
    const titleLooksLikeDuration = looksLikeTitleDuration(titleLine);
    if (titleLooksLikeDuration && (nextIsBullet || lines.length === i + 2)) {
      const dashMatch = titleLine.match(/\s+[–—-]\s+(.+)$/);
      const dates = dashMatch ? stripInline(dashMatch[1]) : "";
      const titleOnly = dashMatch ? stripInline(titleLine.slice(0, titleLine.search(/\s+[–—-]\s+/))).trim() : stripInline(titleLine);
      const bullets: string[] = [];
      let j = i + 2;
      while (j < lines.length && (/^[-*]\s+/.test(lines[j]) || /^\d+\.\s+/.test(lines[j]))) {
        bullets.push(stripInline(lines[j].replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")));
        j++;
      }
      entries.push({
        company: stripInline(companyLine),
        title: titleOnly,
        dates,
        bullets,
      });
      i = j;
      continue;
    }
    const singleLine = parseSingleLineJobHeader(line);
    if (singleLine) {
      const bullets: string[] = [];
      let j = i + 1;
      while (j < lines.length && (/^[-*]\s+/.test(lines[j]) || /^\d+\.\s+/.test(lines[j]))) {
        bullets.push(stripInline(lines[j].replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")));
        j++;
      }
      entries.push({
        company: singleLine.company,
        title: singleLine.title,
        dates: singleLine.dates,
        bullets,
      });
      i = j;
      continue;
    }
    i++;
  }
  return entries;
}

/** Parse resume markdown into structured sections for template transforms. */
export function parseResumeSections(markdown: string): ResumeSections | null {
  try {
    const deduped = deduplicateResumeSections(markdown);
    const lines = deduped.replace(/\r\n/g, "\n").split("\n");
    let name = "";
    let contact = "";
    const firstH1 = lines.find((l) => /^#\s+[^#]/.test(l.trim()) && !/^##\s/.test(l.trim()));
    if (firstH1) {
      name = stripInline(firstH1.replace(/^#\s+/, ""));
      const idx = lines.indexOf(firstH1);
      if (idx >= 0 && idx + 1 < lines.length) {
        const next = lines[idx + 1].trim();
        if (next && !/^##\s/.test(next) && !/^#\s/.test(next) && (next.includes("@") || next.includes("|") || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(next))) {
          contact = stripInline(next);
        }
      }
    }

    const summarySection = findSection(deduped, SUMMARY_VARIANTS);
    const summary = summarySection ? stripInline(summarySection.body.replace(/^[-*]\s+/gm, "").replace(/^\d+\.\s+/gm, "").trim()) : "";

    const experienceSection = findSection(deduped, EXPERIENCE_VARIANTS);
    const experience = experienceSection ? parseExperienceBody(experienceSection.body) : [];

    const skillsSection = findSection(deduped, SKILLS_VARIANTS);
    let skills: string[] = [];
    if (skillsSection?.body) {
      const skillLines = skillsSection.body.split(/\n/).map((l) => l.trim()).filter(Boolean);
      for (const sl of skillLines) {
        if (/^[-*]\s+/.test(sl) || /^\d+\.\s+/.test(sl)) {
          skills.push(stripInline(sl.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "")));
        } else {
          const parts = sl.split(/[,;|]|\band\b/).map((p) => stripInline(p)).filter(Boolean);
          skills.push(...parts);
        }
      }
    }

    const educationSection = findSection(deduped, EDUCATION_VARIANTS);
    const education = educationSection ? stripInline(educationSection.body) : "";

    const priorSection = findSection(deduped, PRIOR_EXPERIENCE_VARIANTS);
    const priorExperience = priorSection ? stripInline(priorSection.body) : "";

    const projectsSection = findSection(deduped, PROJECTS_VARIANTS);
    const projects = projectsSection ? stripInline(projectsSection.body) : null;

    return {
      name,
      contact,
      summary,
      experience,
      skills,
      education,
      priorExperience,
      projects,
    };
  } catch {
    return null;
  }
}

export function markdownToResumeBlocks(markdown: string): ResumeBlock[] {
  const deduped = deduplicateResumeSections(markdown);
  const lines = deduped.replace(/\r\n/g, "\n").split("\n");
  const blocks: ResumeBlock[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      inList = false;
      continue;
    }

    if (/^#\s+[^#]/.test(trimmed) && !/^##\s/.test(trimmed)) {
      inList = false;
      blocks.push({ type: "name", text: stripInline(trimmed.replace(/^#\s+/, "")) });
      continue;
    }
    if (/^##\s+[^#]/.test(trimmed) && !/^###\s/.test(trimmed)) {
      inList = false;
      blocks.push({ type: "section", text: stripInline(trimmed.replace(/^##\s+/, "")) });
      continue;
    }
    if (/^###\s/.test(trimmed)) {
      inList = false;
      blocks.push({ type: "subsection", text: stripInline(trimmed.replace(/^#+\s+/, "")) });
      continue;
    }
    if (/^[-*]\s+/.test(trimmed) || /^\d+\.\s+/.test(trimmed)) {
      inList = true;
      const text = trimmed.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, "");
      blocks.push({ type: "bullet", text: stripInline(text) });
      continue;
    }
    inList = false;
    blocks.push({ type: "paragraph", text: stripInline(trimmed) });
  }

  return blocks;
}
