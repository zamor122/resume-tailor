import { type ParsedOriginal, findContactEndIndex } from "./contactBlockSanitizer";
import type { ResumeSuggestion, ResumeSectionGroup, SectionGroupType, SectionTailorStatus } from "@/app/agent/state";
import { parseResume } from "./resumeParser";

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
    // Only apply if explicitly accepted by the user
    if (sug.status !== "accepted") continue;
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

function cleanBulletLine(line: string): string {
  return line.replace(/^([-*•–—]|\d+\.)\s*/, "").trim();
}

function computeWordSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const wordsB = b.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let common = 0;
  setA.forEach((w) => {
    if (setB.has(w)) common++;
  });
  return (common * 2) / (setA.size + setB.size);
}

function isBulletLine(line: string): boolean {
  const trimmed = line.trim();
  return /^([-*•–—]|\d+\.)\s+/.test(trimmed) || /^[-*•–—]/.test(trimmed);
}

function getBulletsList(text: string): string[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter(isBulletLine);
  if (bulletLines.length > 0) return bulletLines;
  return lines;
}

/**
 * Derives granular suggestions by comparing original text to new text.
 * Strictly scopes bullet comparisons 1-to-1 within matching sections/jobs.
 * Guarantees that originalText never contains whole-document bleed or mismatched lines.
 */
export function deriveSuggestionsFromDiff(
  originalResume: string,
  newResume: string
): ResumeSuggestion[] {
  if (!originalResume || !newResume || originalResume.trim() === newResume.trim()) {
    return [];
  }

  const suggestions: ResumeSuggestion[] = [];

  let origAST: ParsedResumeForReassemble | null = null;
  let newAST: ParsedResumeForReassemble | null = null;

  try {
    const pOrig = parseResume(originalResume);
    origAST = {
      contactInfo: pOrig.contactInfo,
      education: pOrig.education,
      experience: pOrig.experience,
      sections: pOrig.sections,
      skills: pOrig.skills,
      summary: pOrig.summary,
    };
  } catch {
    // fallback
  }

  try {
    const pNew = parseResume(newResume);
    newAST = {
      contactInfo: pNew.contactInfo,
      education: pNew.education,
      experience: pNew.experience,
      sections: pNew.sections,
      skills: pNew.skills,
      summary: pNew.summary,
    };
  } catch {
    // fallback
  }

  // 1. AST-based structural diff (when experience entries exist)
  if (newAST?.experience && newAST.experience.length > 0) {
    const origExperiences = origAST?.experience || [];

    // Summary diff
    if (newAST.summary && newAST.summary.trim() !== (origAST?.summary || "").trim()) {
      suggestions.push({
        id: "sug-diff-summary",
        section: "Professional Summary",
        originalText: origAST?.summary?.trim() || "(New summary section added)",
        suggestedText: newAST.summary.trim(),
        reason: "Holistic career alignment and leadership scope",
        keywords: [],
        category: "summary",
        status: "pending",
      });
    }

    // Experiences diff
    newAST.experience.forEach((newJob, jobIdx) => {
      // Find matching original experience by company name, or by index
      const origJob =
        origExperiences.find(
          (oe) => oe.company && newJob.company && oe.company.toLowerCase() === newJob.company.toLowerCase()
        ) || origExperiences[jobIdx];

      const origBullets = origJob ? getBulletsList(origJob.description) : [];
      const newBullets = getBulletsList(newJob.description);

      const usedOrigIndices = new Set<number>();

      // First pass: mark identical bullets as used
      newBullets.forEach((nb) => {
        const cleanN = cleanBulletLine(nb);
        origBullets.forEach((ob, oi) => {
          if (!usedOrigIndices.has(oi) && cleanBulletLine(ob) === cleanN) {
            usedOrigIndices.add(oi);
          }
        });
      });

      // Second pass: pair modified and identify new bullets
      newBullets.forEach((nb, bulletIdx) => {
        const cleanN = cleanBulletLine(nb);
        if (!cleanN) return;

        // If identical to an original bullet, skip
        const isIdentical = origBullets.some((ob) => cleanBulletLine(ob) === cleanN);
        if (isIdentical) return;

        // Find best unused matching original bullet
        let bestOrigIdx = -1;
        let bestSim = 0;

        origBullets.forEach((ob, oi) => {
          if (usedOrigIndices.has(oi)) return;
          const cleanO = cleanBulletLine(ob);
          const sim = computeWordSimilarity(cleanN, cleanO);
          const prefixMatch =
            cleanO.length > 15 &&
            cleanN.length > 15 &&
            cleanO.slice(0, 15).toLowerCase() === cleanN.slice(0, 15).toLowerCase();
          const score = prefixMatch ? Math.max(sim, 0.7) : sim;

          if (score > bestSim) {
            bestSim = score;
            bestOrigIdx = oi;
          }
        });

        // If no strong similarity match, check if 1:1 index alignment works (same bullet position)
        if (bestOrigIdx === -1 && bulletIdx < origBullets.length && !usedOrigIndices.has(bulletIdx)) {
          const directMatch = cleanBulletLine(origBullets[bulletIdx]);
          if (directMatch) {
            bestOrigIdx = bulletIdx;
            bestSim = 0.3;
          }
        }

        let pairedOrigText: string;
        if (bestOrigIdx !== -1 && bestSim >= 0.25) {
          usedOrigIndices.add(bestOrigIdx);
          pairedOrigText = cleanBulletLine(origBullets[bestOrigIdx]);
        } else {
          // It's a completely new bullet! Never steal an arbitrary original bullet
          pairedOrigText = "(New bullet added for target role keywords)";
        }

        const hasMetric = /\d+%|\$\d+|\d+x|\d+\+/i.test(cleanN);
        suggestions.push({
          id: `sug-diff-job-${jobIdx}-b-${bulletIdx}`,
          section: `${newJob.company || "Experience"} – ${newJob.title || "Role"}`,
          originalText: pairedOrigText,
          suggestedText: cleanN,
          reason: hasMetric
            ? "Quantified operational metrics and impact for ATS resonance"
            : "Targeted keyword and leadership action phrasing",
          keywords: [],
          category: hasMetric ? "metric" : "keyword",
          status: "pending",
          jobIndex: jobIdx,
          bulletIndex: bulletIdx,
        });
      });
    });

    if (suggestions.length > 0) {
      return suggestions;
    }
  }

  // 2. Line-by-line fallback with strict section bounds
  // (Used if AST parsing didn't detect experience entries)
  const origLines = originalResume.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const newLines = newResume.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let currentSection = "Experience";
  const usedLineIndices = new Set<number>();

  newLines.forEach((newLine, idx) => {
    const headerMatch = newLine.match(
      /^(?:#+\s*|(?:##\s*)?)(Summary|Experience|Skills|Education|Projects|Certifications|Work History|Professional Experience)/i
    );
    if (headerMatch) {
      currentSection = headerMatch[1];
      return;
    }

    const cleanN = cleanBulletLine(newLine);
    if (cleanN.length < 15) return;

    // Check if line exists in orig
    const existsInOrig = origLines.some((ol) => cleanBulletLine(ol) === cleanN);
    if (existsInOrig) return;

    // Find best matching unused line in same section
    let bestOrigIdx = -1;
    let bestSim = 0;

    origLines.forEach((ol, oi) => {
      if (usedLineIndices.has(oi)) return;
      const cleanO = cleanBulletLine(ol);
      const sim = computeWordSimilarity(cleanN, cleanO);
      if (sim > bestSim) {
        bestSim = sim;
        bestOrigIdx = oi;
      }
    });

    let pairedText: string;
    if (bestOrigIdx !== -1 && bestSim >= 0.3) {
      usedLineIndices.add(bestOrigIdx);
      pairedText = cleanBulletLine(origLines[bestOrigIdx]);
    } else {
      pairedText = "(New line added for target role)";
    }

    const hasMetric = /\d+%|\$\d+|\d+x|\d+\+/i.test(newLine);
    suggestions.push({
      id: `sug-diff-${idx}`,
      section: currentSection,
      originalText: pairedText,
      suggestedText: cleanN,
      reason: hasMetric
        ? "Quantified impact and metrics for ATS resonance"
        : "Targeted keyword and leadership action phrasing",
      keywords: [],
      category: currentSection.toLowerCase().includes("summary") ? "summary" : hasMetric ? "metric" : "keyword",
      status: "pending",
    });
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
  skills?: { technical?: string[]; soft?: string[] } | string | null;
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

/**
 * Groups suggestions by resume section in bottom-to-top sequence:
 * 1. Earliest work experience (N-1) -> ... -> Most recent (0)
 * 2. Skills section
 * 3. Professional Summary (finale at top)
 */
export function groupSuggestionsBySection(
  suggestions: ResumeSuggestion[] = [],
  resumeAST?: ParsedResumeForReassemble,
  rawResume?: string
): ResumeSectionGroup[] {
  let effectiveAST = resumeAST;
  if (!effectiveAST && rawResume) {
    try {
      const parsed = parseResume(rawResume);
      effectiveAST = {
        contactInfo: parsed.contactInfo,
        education: parsed.education,
        experience: parsed.experience,
        sections: parsed.sections,
        skills: {
          technical: parsed.skills?.technical || [],
          soft: parsed.skills?.soft || [],
        },
        summary: parsed.summary,
      };
    } catch {
      // fallback
    }
  }

  const groups: ResumeSectionGroup[] = [];
  const experiences = effectiveAST?.experience || [];

  // 1. Experiences in reverse chronological order (earliest at index 0 of sequence)
  // Experiences in AST are typically top-to-bottom (0 = most recent, N-1 = earliest)
  for (let i = experiences.length - 1; i >= 0; i--) {
    const exp = experiences[i];
    const matchingSugs = suggestions.filter(
      (s) =>
        s.jobIndex === i ||
        (s.jobIndex === undefined &&
          Boolean(s.section && exp.company && s.section.toLowerCase().includes(exp.company.toLowerCase())))
    );

    groups.push({
      id: `section-exp-${i}`,
      sectionType: "experience",
      title: `${exp.company} – ${exp.title}`,
      subtitle: [exp.dates, exp.location].filter(Boolean).join(" • "),
      jobIndex: i,
      orderIndex: groups.length,
      status: matchingSugs.length > 0 ? "ready" : "unchanged",
      auditRationale: matchingSugs.length > 0
        ? `Targeted keyword and metric enhancements for ${exp.company}`
        : "Preserved authentic original tenure without edits",
      suggestions: matchingSugs,
      originalContent: exp.description || "",
      tailoredContent: matchingSugs.length > 0 ? undefined : exp.description,
      hasChanges: matchingSugs.length > 0,
    });
  }

  // 2. Skills section (if present)
  if (effectiveAST?.skills) {
    const skillsSugs = suggestions.filter(
      (s) =>
        (s.category === "keyword" && s.jobIndex === undefined && s.section?.toLowerCase().includes("skill")) ||
        (s.section && s.section.toLowerCase().includes("skill"))
    );
    const skillsContent =
      typeof effectiveAST.skills === "string"
        ? effectiveAST.skills
        : [...(effectiveAST.skills.technical || []), ...(effectiveAST.skills.soft || [])].join(", ");

    groups.push({
      id: "section-skills",
      sectionType: "skills",
      title: "Skills & Core Competencies",
      subtitle: "Technical Proficiencies & Tools",
      orderIndex: groups.length,
      status: skillsSugs.length > 0 ? "ready" : "unchanged",
      auditRationale: skillsSugs.length > 0
        ? "Woven missing target role keywords into competency categories"
        : "Preserved existing skills matrix",
      suggestions: skillsSugs,
      originalContent: skillsContent,
      tailoredContent: skillsSugs.length > 0 ? undefined : skillsContent,
      hasChanges: skillsSugs.length > 0,
    });
  }

  // 3. Professional Summary (grand finale at the top)
  const summarySugs = suggestions.filter(
    (s) => s.category === "summary" || (s.section && s.section.toLowerCase().includes("summary"))
  );
  groups.push({
    id: "section-summary",
    sectionType: "summary",
    title: "Professional Summary Synthesis",
    subtitle: "Holistic Career Overview",
    orderIndex: groups.length,
    status: summarySugs.length > 0 ? "ready" : "pending",
    auditRationale: "Holistic executive synthesis aligning entire career arc with target role",
    suggestions: summarySugs,
    originalContent: effectiveAST?.summary || "",
    tailoredContent: summarySugs.length > 0 ? summarySugs[0].suggestedText : undefined,
    hasChanges: summarySugs.length > 0,
  });

  return groups;
}
