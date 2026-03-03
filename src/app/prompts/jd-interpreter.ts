/**
 * JD Interpreter prompt: single LLM call to understand the job description,
 * produce a cleaned role-only description, and extract meaningful keywords.
 * Used by: /api/mcp-tools/keyword-extractor (evolved to interpreter).
 */

const MAX_JD_INPUT_LENGTH = 16000;
const CLEANED_JD_MAX_CHARS = 8000;

export function getJDInterpreterPrompt(
  rawJobDescription: string,
  resume?: string,
  clientJobTitle?: string
): string {
  const jdForPrompt = rawJobDescription.length > MAX_JD_INPUT_LENGTH
    ? rawJobDescription.substring(0, MAX_JD_INPUT_LENGTH) + "\n[... truncated]"
    : rawJobDescription;

  const resumeContext = resume
    ? `
When resume is provided, mark keywords that are MISSING from the resume as higher importance (critical/high). Keywords already in the resume can be lower importance (medium/low).

Resume (for alignment check):
${resume.substring(0, 4000)}
`
    : "";

  return `You are a job description analyst. Your task is to read a pasted job posting (which may include company intro, EEO, benefits, salary, application form, and legal text) and produce (1) a cleaned, role-only description and (2) structured keywords that carry real weight for the role.

${clientJobTitle ? `Client-provided job title (use for disambiguation): ${clientJobTitle}` : ""}
${resumeContext}

---

1. CLEANED JOB DESCRIPTION (cleanedJobDescription)
Output a single string containing ONLY content that describes the role and what the employer wants: job/team context, "What you'll do" / responsibilities, required and preferred qualifications, experience level, and role-relevant competencies. Limit to about ${CLEANED_JD_MAX_CHARS} characters.
EXCLUDE in full: Company story or mission, EEO/EEOC/diversity/benefits text, salary/compensation, application instructions ("Apply for this job," "Resume/CV*," etc.), privacy/legal ("Candidate data privacy," "applicant privacy," "OMB Control Number"), policy blurbs ("Default Together," "work in office 4+ days"), and any marketing fluff. Do not include purely navigational headers ("Similar Jobs," "Read More").
Preserve useful structure (bullet lists, "Minimum Qualifications," "Preferred Qualifications"). If the entire paste is irrelevant (e.g. only EEO), return: "Role description not found in the provided text."

2. JOB TITLE (jobTitle)
Infer and output the job title (e.g. "Staff Software Engineer, Growth Notifications, Level 6") if clearly stated; otherwise omit or use empty string.

3. IDEAL CANDIDATE PROFILE (idealCandidateProfile)
From the cleaned role content only: responsibilities (3–8 items), mustHaves, preferred, experienceLevel (e.g. "9+ years"), coreCompetencies (5–10 themes). Field-agnostic.

4. KEYWORDS THAT CARRY WEIGHT
Include ONLY terms a hiring manager or recruiter would treat as real qualifications or skills: technologies, tools, methodologies, domain concepts, level-relevant language. Prefer terms from "What you'll do," "Requirements," or "Qualifications."
INCLUDE: Short phrases that define the role (e.g. "app push," "backend services," "distributed systems," "growth notifications"). Weight terms from the job title or team name highly.
EXCLUDE: Words that only appear in company intro, EEO, benefits, legal, or application instructions; generic filler ("experience," "team," "communication" unless clearly required); single words with no standalone meaning for fit ("years," "field," "information," "need," "post," "together," "default," "mental," "gender," "community," "believe," "applicable," "qualifications" as standalone, "long," "term," "grad" alone). No company or mission fluff.
Categories: technical (with synonyms, recommendedSections), soft, industry, certifications, actionVerbs, powerWords. Per keyword: term, importance (critical|high|medium|low), importanceScore (0-100), frequency.
criticalKeywords: subset directly aligned with the role, from requirements / "What you'll do"; exclude generic filler.
${resume ? "Mark keywords missing from resume as critical or high importance." : ""}

5. AVOID TERMS (avoidTerms)
Terms or concepts that would misalign: wrong seniority, opposing focus, wrong domain, overused buzzwords that would hurt for this role. Array of strings. Not company/mission fluff.

6. OUTPUT FORMAT
Return ONLY valid JSON, no markdown or commentary. Schema exactly as below.

Return ONLY valid JSON, no markdown or explanation:
{
  "cleanedJobDescription": "Full text of role-only description, no EEO/benefits/legal...",
  "jobTitle": "Staff Software Engineer, Growth Notifications, Level 6",
  "idealCandidateProfile": {
    "responsibilities": ["..."],
    "mustHaves": ["..."],
    "preferred": ["..."],
    "experienceLevel": "9+ years",
    "coreCompetencies": ["..."]
  },
  "keywords": {
    "technical": [{"term":"...","importance":"critical|high|medium|low","importanceScore":0-100,"frequency":1,"synonyms":[],"recommendedSections":["Skills","Experience"]}],
    "soft": [{"term":"...","importance":"...","importanceScore":0-100,"frequency":1}],
    "industry": [{"term":"...","importance":"...","frequency":1}],
    "certifications": [{"term":"...","importance":"high","frequency":1}],
    "actionVerbs": [{"term":"...","frequency":1}],
    "powerWords": [{"term":"...","frequency":1}]
  },
  "keywordDensity": {"totalKeywords":0,"criticalKeywords":0,"averageFrequency":0,"mostFrequent":[{"keyword":"...","count":0}]},
  "criticalKeywords": ["validated term 1", "validated term 2"],
  "avoidTerms": ["entry-level", "..."]
}

Pasted job posting (may include EEO, benefits, application form, etc.):
"""
${jdForPrompt}
"""`;
}
