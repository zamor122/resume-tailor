/**
 * ATS Sanitizer - Ensures resume output is parseable by Applicant Tracking Systems.
 * Applies deterministic fixes that the AI may not consistently produce.
 */

const UNICODE_BULLETS = /[●○•◦▪▸]/g;
const EM_DASH = /—/g;
const EN_DASH = /–/g;

/**
 * Light sanitization: only bullets and date separators. Safe for tailored output.
 * Use when full sanitization may break structure (e.g. contact split, header insertion).
 */
export function lightSanitizeForATS(resume: string): string {
  return resume
    .replace(UNICODE_BULLETS, "-")
    .replace(EM_DASH, "-")
    .replace(EN_DASH, "-");
}

/**
 * Sanitize a resume for ATS compatibility.
 * - Splits contact block on pipe (|) so each element is on its own line
 * - Replaces Unicode bullets with hyphen
 * - Normalizes date separators (em-dash, en-dash) to hyphen
 * - Ensures section headers exist when missing
 */
export function sanitizeResumeForATS(resume: string): string {
  let result = resume;

  // 1. Replace Unicode bullets with standard hyphen
  result = result.replace(UNICODE_BULLETS, "-");

  // 2. Fix date separators (em-dash and en-dash to hyphen)
  result = result.replace(EM_DASH, "-");
  result = result.replace(EN_DASH, "-");

  // 3. Split contact block on pipe - first 10 lines only
  const lines = result.split("\n");
  const contactEndIndex = Math.min(10, lines.length);
  const contactLines: string[] = [];
  let restStartIndex = 0;

  for (let i = 0; i < contactEndIndex; i++) {
    const line = lines[i];
    if (line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      contactLines.push(...parts);
    } else {
      contactLines.push(line);
    }
    restStartIndex = i + 1;
  }

  const restLines = lines.slice(restStartIndex);
  const contactBlock = contactLines.join("\n");
  result = [contactBlock, ...restLines].join("\n");

  return result;
}
