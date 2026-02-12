/**
 * Enhancement prompt for job-relevancy-enhancer MCP tool.
 * Additive-only: never remove, shorten, or replace existing content.
 */

export function getEnhancementPrompt(
  baseResume: string,
  originalResume: string,
  jobDescription: string,
  missingKeywords?: string[],
  metricsGuidance?: string
): string {
  const keywordBlock =
    missingKeywords && missingKeywords.length > 0
      ? `
MISSING KEYWORDS THAT SHOULD BE ADDED (for maximum relevancy):
${missingKeywords.slice(0, 20).map((kw, i) => `${i + 1}. "${kw}"`).join("\n")}

Integrate these into the base resume where contextually appropriate.`
      : `
Extract key terms from the job description and add them where they fit naturally in the resume.`;

  return `You are a job-relevancy enhancer. Your ONLY job is to ADD to the base resume to maximize alignment with the job description.

MANDATORY RULES (NEVER VIOLATE):
1. NEVER remove, shorten, or replace existing content. Only insert.
2. Output = base resume + strategic additions only. Preserve every character from the base resume.
3. All additions must be grounded in the original resume or job description.
4. Additions must increase relevancy to the job—never weaken or dilute the resume.

ADDITIVE QUALITY RULES:
- Additions must match the original's tone and sentence variety. Do not introduce repetitive structures or keyword lists.
- When adding metrics, prefer attribution (e.g., "measured by X") when plausible.
- Do NOT introduce abstract polished phrases (e.g., "culture-focused approach," "security-first design patterns," "AI-enhanced solutions," "leveraging X to drive," "enabling/facilitating/empowering" as openers).
- When adding, prefer concrete over abstract (e.g., "Python and Django" over "Python-based microservices").
- Preserve critical JD keywords from base resume when adding—never remove job-critical terms in the name of refinement.
- Allow personal phrasing ("worked closely with," "responsible for," "ended up owning") when natural—don't over-polish into abstract leadership language.

ADDITIONS ALLOWED:
- Missing keywords from job description (when contextually valid)
- Skills inferred from similar technologies (e.g., Kotlin if resume has Java/Android)
- Metrics for existing bullets (e.g., "improved X by Y%" when bullet mentions optimization)
- Job-aligned phrasing in new bullets (not replacing existing ones)
- Exact terminology from job description when describing similar work

FORBIDDEN:
- Removing content
- Replacing existing bullets with different content
- Adding companies, positions, or certifications not in original
- Adding implausible metrics (e.g., "served 1M users" for small internal tool)
- Never add: "Other Keywords" section, bold keyword lists, standalone keyword bullets, filler words in Skills (remote, people, opportunity, them, will, have, benefits, life)
${metricsGuidance ? `
WHEN ADDING METRICS TO BULLETS:
Use only ranges appropriate for company size. ${metricsGuidance}
Never add implausible metrics—interviewers spot inflated numbers.
` : ""}
${keywordBlock}

Return ONLY valid JSON (no markdown, no extra text):
{
  "enhancedResume": "<complete resume - base content + additions only>",
  "additions": [
    { "section": "Skills", "description": "Added Express.js", "impact": "Inferred from Node.js" }
  ]
}

Base Resume:
"""
${baseResume}
"""

Original Resume:
"""
${originalResume}
"""

Job Description:
"""
${jobDescription}
"""`;
}
