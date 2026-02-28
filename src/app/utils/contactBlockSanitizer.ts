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
  const degreeWords = /\b(bachelor|master|phd|bs|ms|ba|ma|degree|diploma|certificate|associate)\b/;
  const universityWords = /\b(university|college|institute|school of)\b/;
  return degreeWords.test(t) || universityWords.test(t);
}

/**
 * Sanitize the contact block in the tailored resume using parsed original data.
 * - Removes location line if original had no location.
 * - Removes degree/university lines from contact when Education section exists.
 * - Keeps name, email, phone, links when present in original (no stripping of those here; we only remove invented/duplicate content).
 */
export function sanitizeContactBlock(
  tailoredResume: string,
  parsedOriginal?: ParsedOriginal | null
): string {
  const lines = tailoredResume.split("\n");
  let contactEndIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+/.test(line.trim())) {
      contactEndIndex = i;
      break;
    }
    contactEndIndex = i + 1;
  }

  if (contactEndIndex === 0) return tailoredResume;

  const contactLines = lines.slice(0, contactEndIndex);
  const restLines = lines.slice(contactEndIndex);
  const hasEducationSection = (parsedOriginal?.education?.length ?? 0) > 0;
  const hasLocationInOriginal = !!(parsedOriginal?.contactInfo?.location?.trim());

  const sanitizedContactLines = contactLines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (looksLikeLocation(trimmed) && !hasLocationInOriginal) return false;
    if (hasEducationSection && looksLikeDegreeOrUniversity(trimmed)) return false;
    return true;
  });

  const sanitizedContact = sanitizedContactLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const result = [sanitizedContact, ...restLines].join("\n");
  return result;
}

/**
 * Replace the contact block (lines before the first ##) with the given contact string.
 * Used to overwrite tailored contact with contact built from the original resume.
 */
export function replaceContactBlock(markdown: string, newContactBlock: string): string {
  const lines = markdown.split("\n");
  let contactEndIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s+/.test(lines[i].trim())) {
      contactEndIndex = i;
      break;
    }
    contactEndIndex = i + 1;
  }
  if (contactEndIndex === 0) return markdown;
  const rest = lines.slice(contactEndIndex);
  const trimmed = newContactBlock.trim();
  if (!trimmed) return rest.join("\n").replace(/^\n+/, "");
  return [trimmed, ...rest].join("\n");
}
