/**
 * Reassemble a resume from parsed sections and tailored content.
 * Used by section-based tailoring: fixed title/company/dates + tailored bullets per job.
 */

import type { ParsedOriginal } from "./contactBlockSanitizer";

export interface ParsedExperienceEntry {
  title: string;
  company: string;
  dates: string | null;
  location?: string | null;
  description: string;
}

export interface ParsedResumeForReassemble {
  contactInfo?: ParsedOriginal["contactInfo"];
  education?: Array<{ degree?: string; institution?: string; field?: string | null; dates?: string | null }> | null;
  experience?: ParsedExperienceEntry[];
  sections?: string[];
  skills?: { technical?: string[]; soft?: string[] };
  summary?: string | null;
}

/**
 * Build Contact block from parsed resume only (no AI).
 * At most 2 lines; only include fields present in original.
 */
export function buildContactFromParsed(parsed: ParsedResumeForReassemble): string {
  const c = parsed.contactInfo;
  if (!c) return "";
  const line1Parts: string[] = [];
  if (c.name?.trim()) line1Parts.push(c.name.trim());
  if (c.location?.trim()) line1Parts.push(c.location.trim());
  if (c.phone?.trim()) line1Parts.push(c.phone.trim());
  const line2Parts: string[] = [];
  if (c.email?.trim()) line2Parts.push(c.email.trim());
  if (c.linkedin?.trim()) line2Parts.push(c.linkedin.trim());
  if (c.portfolio?.trim()) line2Parts.push(c.portfolio.trim());
  const lines = [];
  if (line1Parts.length) lines.push(line1Parts.join(" "));
  if (line2Parts.length) lines.push(line2Parts.join(" "));
  return lines.join("\n");
}

/**
 * Build contact block from the original resume: prefer parsed contact when present and sufficient,
 * otherwise use the first block (lines before the first ##) normalized to 1-2 lines.
 * Used after tailoring to restore contact from the original so no fields are lost.
 */
export function buildContactFromOriginal(
  originalResume: string,
  parsed?: ParsedOriginal | null
): string {
  const c = parsed?.contactInfo;
  const hasParsedContact =
    c && (c.name?.trim() || c.email?.trim() || c.phone?.trim());
  if (hasParsedContact) {
    return buildContactFromParsed(parsed as ParsedResumeForReassemble);
  }
  const lines = originalResume.split(/\r?\n/);
  let contactEndIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      contactEndIndex = i;
      break;
    }
    contactEndIndex = i + 1;
  }
  if (contactEndIndex === 0) return "";
  const firstBlock = lines.slice(0, contactEndIndex).join("\n");
  const normalized = firstBlock
    .replace(/\|[^|]*\|/g, " ")
    .replace(/\s*\|\s*/g, " ")
    .replace(/^[-*•]\s*/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
  const asLines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  if (asLines.length <= 2) return asLines.join("\n");
  return asLines.slice(0, 2).join("\n");
}

/**
 * Extract a section (e.g. ## Education) from full resume markdown.
 * Returns the section header line + content until the next ## or end.
 */
export function extractSection(resume: string, sectionHeader: string): string | null {
  const normalized = sectionHeader.replace(/^#+\s*/i, "").trim();
  const regex = new RegExp(`(##\\s+${normalized.replace(/\s+/g, "\\s+")}[^\\n]*)([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const match = resume.match(regex);
  if (!match) return null;
  return (match[1] + match[2]).trim();
}

const SKILLS_HEADER_VARIANTS = [
  "Skills",
  "Technical Skills",
  "Core Competencies",
  "Skills & Technologies",
  "Key Skills",
  "Technical Expertise",
];

const EDUCATION_HEADER_VARIANTS = [
  "Education",
  "Education & Certifications",
  "Academic",
  "Education and Training",
];

const PRIOR_EXPERIENCE_VARIANTS = [
  "Prior Experience",
  "Additional Experience",
  "Earlier Experience",
];

/**
 * Try multiple header variants; return the first section that matches.
 */
export function extractSectionWithVariants(resume: string, variants: readonly string[]): string | null {
  for (const v of variants) {
    const section = extractSection(resume, v);
    if (section) return section;
  }
  return null;
}

/**
 * Reassemble full resume markdown from parsed resume, tailored summary, tailored bullets per job, and original resume (for Skills/Education/Prior Experience sections).
 * Order: Contact, Summary, Experience (fixed title/company/dates + tailored bullets), Prior Experience (if present), Skills, Education.
 */
export function reassembleResumeFromSections(params: {
  parsed: ParsedResumeForReassemble;
  tailoredSummary: string;
  tailoredBulletsByJob: string[];
  originalResume: string;
}): string {
  const { parsed, tailoredSummary, tailoredBulletsByJob, originalResume } = params;
  const contactBlock = buildContactFromParsed(parsed);
  const experience = parsed.experience || [];
  const experienceBlocks: string[] = [];
  for (let i = 0; i < experience.length; i++) {
    const exp = experience[i];
    const bullets = tailoredBulletsByJob[i] ?? exp.description;
    const line1 = exp.location?.trim() ? `${exp.company}, ${exp.location}` : exp.company;
    const line2 = exp.dates?.trim() ? `${exp.title} – ${exp.dates}` : exp.title;
    experienceBlocks.push(`${line1}\n${line2}\n${bullets}`);
  }
  const experienceSection = "## Experience\n\n" + experienceBlocks.join("\n\n");
  const priorExperienceSection = extractSectionWithVariants(originalResume, PRIOR_EXPERIENCE_VARIANTS);
  const skillsSection = extractSectionWithVariants(originalResume, SKILLS_HEADER_VARIANTS) || "## Skills\n\n";
  const educationSection = extractSectionWithVariants(originalResume, EDUCATION_HEADER_VARIANTS) || "## Education\n\n";
  const parts: string[] = [];
  if (contactBlock) parts.push(contactBlock);
  parts.push("## Summary\n\n" + tailoredSummary.trim());
  parts.push(experienceSection);
  if (priorExperienceSection?.trim()) parts.push(priorExperienceSection.trim());
  if (skillsSection.trim()) parts.push(skillsSection.trim());
  if (educationSection.trim()) parts.push(educationSection.trim());
  return parts.join("\n\n");
}
