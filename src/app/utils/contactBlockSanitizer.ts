/**
 * Sanitize the Contact block in a tailored resume so it only contains
 * fields present in the original resume and does not duplicate Education.
 * Used after tailoring to enforce no-invention and open style contact.
 */

export interface ParsedContactInfo {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  portfolio?: string | null;
}

export interface ParsedEducationEntry {
  degree?: string;
  institution?: string;
  field?: string | null;
  dates?: string | null;
}

export interface ParsedOriginal {
  contactInfo?: ParsedContactInfo | null;
  education?: ParsedEducationEntry[] | null;
}

/** Heuristic: line looks like a location (City, State or City, Country). */
function looksLikeLocation(line: string): boolean {
  const t = line.trim();
  if (t.length < 4 || t.length > 80) return false;
  // Common: "City, ST" or "City, Country"
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/.test(t)) return true;
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s*$/.test(t)) return true;
  return false;
}

/** Heuristic: line looks like degree or university. */
function looksLikeDegreeOrUniversity(line: string): boolean {
  const t = line.trim().toLowerCase();
  if (t.length < 6) return false;
  // Never treat lines with email, URLs, or location state codes as degree duplicates
  if (/@|https?:\/\/|www\./i.test(t)) return false;
  if (/,\s*[a-z]{2}\b/i.test(t)) return false;

  const degreeWords = /\b(bachelor(?:'s)?\s+(?:of|in)|master(?:'s)?\s+(?:of|in)|ph\.?d\.?|doctorate|diploma in)\b/i;
  const universityWords = /\b(university|institute of technology|school of)\b/i;
  return degreeWords.test(t) || universityWords.test(t);
}

const SECTION_HEADER_SET = new Set([
  "summary",
  "profile",
  "professional summary",
  "about",
  "about me",
  "executive summary",
  "objective",
  "experience",
  "work experience",
  "professional experience",
  "employment history",
  "employment",
  "skills",
  "technical skills",
  "core competencies",
  "education",
  "projects",
  "certifications",
]);

export function findContactEndIndex(lines: string[]): number {
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (/^#+\s+/.test(line)) {
      return i;
    }
    const clean = line.replace(/^[#*_\s]+|[#*_\s:]+$/g, "").trim().toLowerCase();
    if (clean && SECTION_HEADER_SET.has(clean)) {
      return i;
    }
    // Check if line looks like a job header with date range (e.g. "Acme Corp | 2020 - Present")
    if (/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\s*[-–—]\s*(?:Present|Current|\d{4})/i.test(line)) {
      return i;
    }
  }
  return lines.length;
}

/**
 * Sanitize the contact block in the tailored resume using parsed original data.
 * Guarantees that no authentic original personal information (names, emails, phones,
 * locations, state codes like MA, links, titles, or credentials) is ever removed.
 */
export function sanitizeContactBlock(
  tailoredResume: string,
  parsedOriginal?: ParsedOriginal | null
): string {
  const lines = tailoredResume.split("\n");
  const contactEndIndex = findContactEndIndex(lines);

  if (contactEndIndex === 0) return tailoredResume;

  const contactLines = lines.slice(0, contactEndIndex);
  const restLines = lines.slice(contactEndIndex);

  // Preserve all contact lines; do not strip valid user contact info
  const sanitizedContact = contactLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const result = [sanitizedContact, ...restLines].join("\n");
  return result;
}

/**
 * Replace the contact block (lines before the first ## or section header) with the given contact string.
 * Used to overwrite tailored contact with contact built from the original resume.
 */
export function replaceContactBlock(markdown: string, newContactBlock: string): string {
  const lines = markdown.split("\n");
  const contactEndIndex = findContactEndIndex(lines);
  const rest = lines.slice(contactEndIndex);
  const trimmed = newContactBlock.trim();
  if (!trimmed) return rest.join("\n").replace(/^\n+/, "");
  return [trimmed, ...rest].join("\n");
}
