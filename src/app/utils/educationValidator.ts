/**
 * Validate and fix the Education section in tailored resume markdown.
 * If the content under ## Education looks like experience (bullets, job-style lines),
 * move it to Experience or replace with a placeholder so we don't show wrong content under Education.
 */

const EDUCATION_HEADER_ALIASES = [
  /^education\s*$/i,
  /^education\s+&\s+certifications?$/i,
  /^academic\s*$/i,
  /^education\s+and\s+training$/i,
];

function isEducationHeader(line: string): boolean {
  const title = line.replace(/^#+\s*/, "").trim();
  return EDUCATION_HEADER_ALIASES.some((re) => re.test(title));
}

/** Heuristic: body looks like education (degree, institution, short lines, dates). */
function looksLikeEducation(body: string): boolean {
  const trimmed = body.trim();
  if (trimmed.length > 800) return false;
  const degreePattern = /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?|Bachelor|Master|Associate|Certificate|Diploma)\b/i;
  const institutionPattern = /\b(University|College|Institute|School of|\.edu)\b/i;
  const hasDegree = degreePattern.test(trimmed);
  const hasInstitution = institutionPattern.test(trimmed);
  const bulletCount = (trimmed.match(/^[-*]\s+/gm) || []).length;
  const jobStyleDashes = (trimmed.match(/\s+[–—]\s+/g) || []).length;
  if (bulletCount > 3 || jobStyleDashes > 2) return false;
  return hasDegree || hasInstitution;
}

/** Heuristic: body looks like experience (many bullets, job title – company – dates). */
function looksLikeExperience(body: string): boolean {
  const bulletCount = (body.match(/^[-*]\s+/gm) || []).length;
  const jobStyleLines = (body.match(/^[^\n]*\s+[–—]\s+[^\n]*\s+[–—]\s+/gm) || []).length;
  return bulletCount >= 2 || jobStyleLines >= 1;
}

/**
 * Find the chunk that is the Education section (by header), return [headerLine, body] or null.
 */
function findEducationChunk(chunks: string[]): { header: string; body: string; index: number } | null {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i].trim();
    const firstLine = chunk.split("\n")[0];
    if (/^#+\s+/.test(firstLine) && isEducationHeader(firstLine)) {
      const rest = chunk.slice(firstLine.length).replace(/^\n+/, "");
      return { header: firstLine, body: rest, index: i };
    }
  }
  return null;
}

/**
 * Find the last Experience chunk so we can append misplaced content before it ends.
 */
function findLastExperienceChunk(chunks: string[]): number {
  const experienceAliases = [/^experience\s*$/i, /^work\s+experience$/i, /^professional\s+experience$/i];
  let lastIndex = -1;
  for (let i = 0; i < chunks.length; i++) {
    const firstLine = chunks[i].trim().split("\n")[0];
    const title = firstLine.replace(/^#+\s*/, "").trim();
    if (experienceAliases.some((re) => re.test(title))) lastIndex = i;
  }
  return lastIndex;
}

/**
 * Validate the Education block. If it looks like experience/summary content, move that content
 * into the Experience section (append to last Experience chunk) and replace Education with a placeholder.
 * Returns the modified markdown.
 */
export function validateOrFixEducationBlock(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  const chunks = normalized.split(/\n(?=##\s+)/);
  if (chunks.length === 0) return markdown;

  const edu = findEducationChunk(chunks);
  if (!edu) return markdown;

  if (looksLikeEducation(edu.body)) return markdown;

  if (!looksLikeExperience(edu.body)) return markdown;

  const experienceIndex = findLastExperienceChunk(chunks);
  if (experienceIndex >= 0 && edu.body.trim()) {
    chunks[experienceIndex] = chunks[experienceIndex].trimEnd() + "\n\n" + edu.body.trim();
  }
  chunks[edu.index] = edu.header + "\n\n";
  return chunks.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
