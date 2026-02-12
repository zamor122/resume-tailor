/**
 * Shared job description cleaning utility.
 * Strips HTML, normalizes whitespace, and optionally truncates for context limits.
 * Used by: humanize/stream, resume/save, and anywhere else that processes job descriptions.
 */

const DEFAULT_MAX_LENGTH = 4000;

/**
 * Clean a job description: strip HTML/CSS, decode entities, normalize whitespace.
 */
export function cleanJobDescription(
  jobDescription: string,
  options?: { maxLength?: number }
): string {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_LENGTH;

  let cleaned = jobDescription
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();

  if (maxLength > 0 && cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength) + "...";
  }

  return cleaned;
}
