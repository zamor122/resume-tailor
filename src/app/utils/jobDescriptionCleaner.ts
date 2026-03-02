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

/**
 * Phrases that typically start the role/requirements section (after company intro).
 * If any of these appear, we keep from that point onward and drop the intro.
 */
const ROLE_CONTENT_START_SENTINELS = [
  "ABOUT THE TEAM",
  "ABOUT THE ROLE",
  "Key Responsibilities",
  "REQUIRED QUALIFICATIONS",
  "PREFERRED QUALIFICATIONS",
  "Responsibilities",
  "Qualifications",
  "THE ROLE",
  "What you'll do",
  "What you will do",
];

/**
 * Sentinel phrases that typically start application form, EEO, benefits, or salary sections.
 * Used to trim pasted job descriptions to role/requirements content only (best-effort).
 */
const ROLE_CONTENT_END_SENTINELS = [
  "US Salary Range",
  "Salary Range",
  "Voluntary Self-Identification",
  "Equal Employment Opportunity",
  "Create a Job Alert",
  "Apply for this job",
  "First Name*",
  "indicates a required field",
  "Resume/CV*",
  "Attach",
  "No file chosen",
  "Powered by",
  "PUBLIC BURDEN STATEMENT",
  "OMB Control Number",
  "Why are you being asked",
  "Candidate data privacy",
  "applicant-privacy",
  "applicant privacy",
];

/**
 * Trim job description to role content only. First tries to keep from the first "role"
 * section (e.g. ABOUT THE ROLE, Key Responsibilities) onward, dropping company intro.
 * If no role-start sentinel is found, trims at end sentinels (salary, application, EEO).
 */
export function trimJobDescriptionToRoleContent(jobDescription: string): string {
  const lower = jobDescription.toLowerCase();
  let startMinIndex = jobDescription.length;
  for (const sentinel of ROLE_CONTENT_START_SENTINELS) {
    const idx = lower.indexOf(sentinel.toLowerCase());
    if (idx >= 0 && idx < startMinIndex) startMinIndex = idx;
  }
  if (startMinIndex < jobDescription.length) {
    const fromRole = jobDescription.slice(startMinIndex).trim();
    let endMinIndex = fromRole.length;
    for (const sentinel of ROLE_CONTENT_END_SENTINELS) {
      const idx = fromRole.toLowerCase().indexOf(sentinel.toLowerCase());
      if (idx >= 0 && idx < endMinIndex) endMinIndex = idx;
    }
    if (endMinIndex < fromRole.length) {
      return fromRole.slice(0, endMinIndex).trim();
    }
    return fromRole;
  }
  let minIndex = jobDescription.length;
  for (const sentinel of ROLE_CONTENT_END_SENTINELS) {
    const idx = lower.indexOf(sentinel.toLowerCase());
    if (idx >= 0 && idx < minIndex) minIndex = idx;
  }
  if (minIndex === 0) return jobDescription;
  if (minIndex < jobDescription.length) {
    return jobDescription.slice(0, minIndex).trim();
  }
  return jobDescription;
}
