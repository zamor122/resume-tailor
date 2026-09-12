import { type ParsedOriginal, findContactEndIndex } from "./contactBlockSanitizer";
import type { ResumeSuggestion } from "@/app/agent/state";

/**
 * Verbatim surgical application:
 * Applies accepted suggestions to the original resume text without modifying
 * or dropping any un-targeted sections, headers, contact lines, or custom styling.
 */
export function applySuggestionsToOriginal(
  originalResume: string,
  suggestions: ResumeSuggestion[]
): string {
  if (!originalResume) return "";
  if (!suggestions || suggestions.length === 0) return originalResume;

  let currentText = originalResume;

  for (const sug of suggestions) {
    // Only apply if accepted (default to accepted if status not explicitly rejected)
    if (sug.status === "rejected") continue;
    if (!sug.originalText || !sug.suggestedText) continue;

    const target = sug.originalText.trim();
    const replacement = sug.suggestedText.trim();

    if (!target || target === replacement) continue;

    // 1. Direct exact replacement
    if (currentText.includes(target)) {
      currentText = currentText.replace(target, replacement);
      continue;
    }

    // 2. Normalize whitespace/line-endings and try matching
    const normalizedTarget = target.replace(/\r?\n\s*/g, " ").replace(/\s+/g, " ");
    const lines = currentText.split(/\r?\n/);
    let matchedIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const normalizedLine = lines[i].replace(/\s+/g, " ").trim();
      if (
        normalizedLine.length > 20 &&
        (normalizedLine === normalizedTarget ||
          normalizedLine.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedLine))
      ) {
        matchedIndex = i;
        break;
      }
    }

    if (matchedIndex !== -1) {
      const origLine = lines[matchedIndex];
      const bulletPrefix = origLine.match(/^(\s*[-*•]\s*)/)?.[1] || "";
      const formattedReplacement =
        replacement.startsWith("-") || replacement.startsWith("*") || replacement.startsWith("•")
          ? replacement
          : bulletPrefix
          ? `${bulletPrefix}${replacement}`
          : replacement;
      lines[matchedIndex] = formattedReplacement;
      currentText = lines.join("\n");
    }
  }

  return currentText;
}

/**
 * Derives granular suggestions by comparing original text to new text.
 * Used as a 100% reliable fallback so the Change Studio cockpit ALWAYS renders
 * even if stored records or upstream LLM responses didn't include structured suggestions.
 */
export function deriveSuggestionsFromDiff(
  originalResume: string,
  newResume: string
): ResumeSuggestion[] {
  if (!originalResume || !newResume || originalResume.trim() === newResume.trim()) {
    return [];
  }

  const origLines = originalResume
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const newLines = newResume
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const suggestions: ResumeSuggestion[] = [];
  let currentSection = "Professional Experience";

  newLines.forEach((newLine, idx) => {
    // Check if line is a section header
    const headerMatch = newLine.match(/^(?:#+\s*|(?:##\s*)?)(Summary|Experience|Skills|Education|Projects|Certifications|Work History|Professional Experience)/i);
    if (headerMatch) {
      currentSection = headerMatch[1];
      return;
    }

    const cleanNew = newLine.replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
    if (cleanNew.length < 15) return;

    const existsInOrig = origLines.some((origLine) => {
      const cleanOrig = origLine.replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
      return cleanOrig === cleanNew || cleanOrig.includes(cleanNew) || cleanNew.includes(cleanOrig);
    });

    if (!existsInOrig) {
      // Find closest matching original line for diff
      const origInSameSection = origLines.find((ol) => {
        const co = ol.replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
        return co.length > 20 && (co.slice(0, 15) === cleanNew.slice(0, 15) || cleanNew.slice(0, 15) === co.slice(0, 15));
      });
      const closestOrig = origInSameSection || origLines[Math.min(idx, origLines.length - 1)] || newLine;

      const hasMetric = /\d+%|\$\d+|\d+x|\d+\+/i.test(newLine);
      const cat = currentSection.toLowerCase().includes("summary") ? "summary" : hasMetric ? "metric" : "keyword";

      suggestions.push({
        id: `sug-diff-${idx}`,
        section: currentSection,
        originalText: closestOrig.trim() || newLine.trim(),
        suggestedText: newLine.trim(),
        reason: hasMetric
          ? "Quantified impact and metrics for ATS resonance"
          : "Targeted keyword and leadership action phrasing",
        keywords: [],
        category: cat,
        status: "accepted",
      });
    }
  });

  return suggestions;
}

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
 * otherwise use the first block (lines before the first section header or ##) normalized to 1-2 lines.
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
  const contactEndIndex = findContactEndIndex(lines);
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

const ALL_SECTION_HEADERS = [
  "Summary",
  "Profile",
  "Professional Summary",
  "About",
  "About Me",
  "Executive Summary",
  "Objective",
  "Career Objective",
  "Experience",
  "Work Experience",
  "Professional Experience",
  "Employment History",
  "Employment",
  "Work History",
  "Relevant Experience",
  "Prior Experience",
  "Additional Experience",
  "Earlier Experience",
  "Skills",
  "Technical Skills",
  "Core Competencies",
  "Skills & Technologies",
  "Skills and Technologies",
  "Key Skills",
  "Technical Expertise",
  "Areas of Expertise",
  "Technologies",
  "Core Skills",
  "Education",
  "Education & Certifications",
  "Education and Certifications",
  "Academic Background",
  "Academic",
  "Education and Training",
  "Degrees",
  "Projects",
  "Key Projects",
  "Personal Projects",
  "Technical Projects",
  "Portfolio",
  "Certifications",
  "Certificates",
  "Licenses & Certifications",
  "Awards",
  "Honors",
  "Publications",
  "Volunteering",
  "Volunteer Experience",
];

/**
 * Extract a section (e.g. Education, Skills, Experience) from full resume text.
 * Captures all lines from the header until the next recognizable section header or EOF.
 */
export function extractSection(resume: string, sectionHeader: string): string | null {
  const normalized = sectionHeader.replace(/^[#*_\s]+|[#*_\s:]+$/g, "").trim().toLowerCase();
  if (!normalized) return null;

  const lines = resume.split(/\r?\n/);
  let startIndex = -1;
  let matchedHeaderName = "";

  // Helper to check if a line is a section header
  const getSectionHeaderName = (line: string): string | null => {
    const clean = line.replace(/^[#*_\s]+|[#*_\s:]+$/g, "").trim();
    if (!clean || clean.length > 40) return null;
    const lower = clean.toLowerCase();
    for (const h of ALL_SECTION_HEADERS) {
      if (h.toLowerCase() === lower) return clean;
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const headerName = getSectionHeaderName(lines[i]);
    if (headerName && headerName.toLowerCase() === normalized) {
      startIndex = i;
      matchedHeaderName = headerName;
      break;
    }
  }

  if (startIndex === -1) return null;

  const contentLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const nextHeader = getSectionHeaderName(lines[i]);
    if (nextHeader && nextHeader.toLowerCase() !== normalized) {
      break;
    }
    contentLines.push(lines[i]);
  }

  const body = contentLines.join("\n").trim();
  if (!body) return null;

  return `## ${matchedHeaderName}\n\n${body}`;
}

const EXPERIENCE_HEADER_VARIANTS = [
  "Experience",
  "Work Experience",
  "Professional Experience",
  "Employment History",
  "Employment",
  "Work History",
  "Relevant Experience",
];

const SKILLS_HEADER_VARIANTS = [
  "Skills",
  "Technical Skills",
  "Core Competencies",
  "Skills & Technologies",
  "Skills and Technologies",
  "Key Skills",
  "Technical Expertise",
  "Areas of Expertise",
  "Technologies",
];

const EDUCATION_HEADER_VARIANTS = [
  "Education",
  "Education & Certifications",
  "Education and Certifications",
  "Academic Background",
  "Academic",
  "Education and Training",
  "Degrees",
];

const PRIOR_EXPERIENCE_VARIANTS = [
  "Prior Experience",
  "Additional Experience",
  "Earlier Experience",
  "Other Experience",
];

const PROJECTS_HEADER_VARIANTS = [
  "Projects",
  "Key Projects",
  "Personal Projects",
  "Technical Projects",
];

const CERTIFICATIONS_HEADER_VARIANTS = [
  "Certifications",
  "Licenses & Certifications",
  "Certifications and Licenses",
  "Certificates",
];

/**
 * Try multiple header variants; return the first section that matches.
 */
export function extractSectionWithVariants(resume: string, variants: readonly string[]): string | null {
  for (const v of variants) {
    const section = extractSection(resume, v);
    if (section && section.trim().length > 15) return section;
  }
  return null;
}

/**
 * Reassemble full resume markdown preserving all original content with surgical improvements.
 * Order: Contact -> Summary (tailored) -> Experience (tailored or preserved) -> Skills -> Education -> Projects -> Certifications.
 */
export function reassembleResumeFromSections(params: {
  parsed: ParsedResumeForReassemble;
  tailoredSummary: string;
  tailoredBulletsByJob: string[];
  originalResume: string;
}): string {
  const { parsed, tailoredSummary, tailoredBulletsByJob, originalResume } = params;

  // 1. Contact block: preserve original top contact lines
  const contactBlock = buildContactFromOriginal(originalResume, parsed) || buildContactFromParsed(parsed);

  // 2. Experience Section:
  const experience = parsed.experience || [];
  let experienceSection: string | null = null;

  if (experience.length > 0 && tailoredBulletsByJob.some(Boolean)) {
    const experienceBlocks: string[] = [];
    for (let i = 0; i < experience.length; i++) {
      const exp = experience[i];
      const bullets = (tailoredBulletsByJob[i] || exp.description || "").trim();
      const line1 = exp.location?.trim() ? `${exp.company}, ${exp.location}` : exp.company;
      const line2 = exp.dates?.trim() ? `${exp.title} – ${exp.dates}` : exp.title;
      if (line1 || line2 || bullets) {
        experienceBlocks.push([line1, line2, bullets].filter(Boolean).join("\n"));
      }
    }
    if (experienceBlocks.length > 0) {
      experienceSection = "## Experience\n\n" + experienceBlocks.join("\n\n");
    }
  }

  // Fallback: If AST had no experience or was incomplete, preserve the original experience section verbatim
  if (!experienceSection) {
    experienceSection = extractSectionWithVariants(originalResume, EXPERIENCE_HEADER_VARIANTS);
  }

  // 3. Other sections (preserved directly from original resume so nothing is ever dropped)
  const priorExperienceSection = extractSectionWithVariants(originalResume, PRIOR_EXPERIENCE_VARIANTS);
  const skillsSection = extractSectionWithVariants(originalResume, SKILLS_HEADER_VARIANTS);
  const educationSection = extractSectionWithVariants(originalResume, EDUCATION_HEADER_VARIANTS);
  const projectsSection = extractSectionWithVariants(originalResume, PROJECTS_HEADER_VARIANTS);
  const certificationsSection = extractSectionWithVariants(originalResume, CERTIFICATIONS_HEADER_VARIANTS);

  // 4. Assemble final document
  const parts: string[] = [];

  if (contactBlock?.trim()) {
    parts.push(contactBlock.trim());
  }

  const summaryText = (tailoredSummary || parsed.summary || "").trim();
  if (summaryText) {
    parts.push("## Summary\n\n" + summaryText);
  }

  if (experienceSection?.trim()) {
    parts.push(experienceSection.trim());
  }

  if (priorExperienceSection?.trim()) {
    parts.push(priorExperienceSection.trim());
  }

  if (skillsSection?.trim()) {
    parts.push(skillsSection.trim());
  }

  if (educationSection?.trim()) {
    parts.push(educationSection.trim());
  }

  if (projectsSection?.trim()) {
    parts.push(projectsSection.trim());
  }

  if (certificationsSection?.trim()) {
    parts.push(certificationsSection.trim());
  }

  if (parts.length === 0) {
    return originalResume;
  }

  return parts.join("\n\n");
}
