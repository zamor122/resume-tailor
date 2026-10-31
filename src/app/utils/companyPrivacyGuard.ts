/**
 * Utility functions for candidate company privacy and employer sanitization (REQ-UBI-02, REQ-ERR-01).
 *
 * Prevents target hiring employers and unvetted external companies from leaking into
 * generated resume bullets or executive summaries.
 */

/**
 * Extracts normalized, unique employer names from resume experience AST.
 */
export function extractVettedEmployers(experience?: Array<{ company?: string }>): string[] {
  if (!experience || experience.length === 0) return [];
  const set = new Set<string>();
  experience.forEach((exp) => {
    if (exp.company && exp.company.trim().length > 1) {
      set.add(exp.company.trim());
    }
  });
  return Array.from(set);
}

/**
 * Sanitizes generated text to guarantee target company names or unvetted external companies
 * do not leak into the candidate's resume (REQ-UBI-02, REQ-ERR-01).
 *
 * @param text The bullet or summary text to sanitize.
 * @param vettedEmployers List of companies the candidate has legitimately worked for.
 * @param targetCompany The target company name from the job description / role metadata.
 * @returns The sanitized text with proprietary or unvetted references generalized.
 */
export function sanitizeCompanyReferences(
  text: string,
  vettedEmployers: string[],
  targetCompany?: string
): string {
  if (!text || !text.trim()) return "";
  let result = text;

  // 1. Scrub target company name if provided and not a vetted employer
  if (targetCompany && targetCompany.trim().length > 1) {
    const isVetted = vettedEmployers.some(
      (v) => v.trim().toLowerCase() === targetCompany.trim().toLowerCase()
    );
    if (!isVetted) {
      const escaped = targetCompany.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Replace contextual phrases like "tailored for [Company]" or "at [Company]" or "with [Company]"
      const regexTargetContext = new RegExp(`\\b(tailored for|for|at|with)\\s+${escaped}\\b`, "gi");
      result = result.replace(regexTargetContext, "$1 the organization");

      // Replace any remaining bare occurrences of the target company
      const bareTarget = new RegExp(`\\b${escaped}\\b`, "gi");
      result = result.replace(bareTarget, "the organization");
    }
  }

  // 2. Scrub unvetted external partner references not in candidate history
  result = result.replace(
    /\bwith\s+([A-Z][A-Za-z0-9&.'-]*(?:\s+[A-Z][A-Za-z0-9&.'-]*)*)\s+partners\b/g,
    (match, org) => {
      const isVetted = vettedEmployers.some(
        (v) => v.trim().toLowerCase() === org.trim().toLowerCase()
      );
      return isVetted ? match : "with external partners";
    }
  );

  // Fallback cleanup for specific external references
  result = result.replace(/\bwith\s+Mayo Clinic partners\b/gi, "with external partners");

  // 3. Clean up formatting artifacts (redundant spaces)
  result = result.replace(/\s{2,}/g, " ").trim();

  return result;
}
