/**
 * Keyword extraction prompt for LLM-based dynamic extraction.
 * Used by: /api/mcp-tools/keyword-extractor
 */

export function getKeywordExtractorPrompt(
  jobDescription: string,
  resume?: string,
  jobTitle?: string
): string {
  const resumeContext = resume
    ? `
When resume is provided, also identify which keywords from the job description are MISSING from the resume.
Mark those as higher importance (critical/high) since they should be added.
Keywords already present in the resume can be lower importance (medium/low).

Resume (for alignment check):
${resume.substring(0, 4000)}
`
    : "";

  return `
Extract keywords and role context from this job description for resume tailoring and job match optimization.
${jobTitle ? `Job title (use for role context; terms in the title or team name are highly important): ${jobTitle}` : ""}
${resumeContext}

STEP 1 – IDEAL CANDIDATE PROFILE (field-agnostic):
Extract what this role is looking for in the best candidate. Output as idealCandidateProfile:
- responsibilities: 3–8 key items from "What you'll do" / "Key responsibilities"
- mustHaves: required or minimum qualifications (skills, experience, education)
- preferred: preferred qualifications
- experienceLevel: e.g. "Senior", "Staff", "9+ years"
- coreCompetencies: 5–10 themes that define the role (e.g. distributed systems, observability, growth notifications, backend services)

STEP 2 – FULL JOB-SPECIFIC KEYWORDS:
Extract and categorize (prioritize role-logical importance—relevance to THIS role—not just frequency):
1. technical: programming languages, tools, frameworks, technologies
2. soft: communication, leadership, teamwork, etc.
3. industry: domain terms, methodologies, industry-specific phrases (include short phrases that define the role, e.g. "app push", "backend services", "distributed systems", "growth notifications")
4. certifications: any cert names (AWS, PMP, etc.)
5. actionVerbs: verbs like developed, implemented, led
6. powerWords: high-impact terms (senior, scalable, enterprise)

Include short phrases where they define the role. Use the job title to weight terms that appear in the role or team name (e.g. "Growth Notifications" → prioritize "notifications", "growth", "app push", "email", "sms"). Deprioritize generic filler (e.g. "experience", "team", "design" when used vaguely) to medium/low unless they appear in Required/Minimum Qualifications.
Extract only: Terms a candidate would realistically add to their resume (skills, tech, domain phrases). Do NOT extract: Company or mission marketing language, e.g. "transform," "innovative," "defense technology," or generic pitch phrases.

For each keyword: term, importance (critical|high|medium|low), importanceScore (0-100), frequency (count in JD). For technical: add synonyms[] and recommendedSections[].
${resume ? "Mark keywords missing from resume as critical or high importance." : ""}

STEP 3 – VALIDATED CRITICAL KEYWORDS:
criticalKeywords must contain ONLY terms that are directly aligned with the role and would increase the probability of the candidate being shortlisted. Include terms from Required/Minimum Qualifications and from "What you'll do." Exclude generic filler.

STEP 4 – AVOID TERMS (do not show to user; for tailoring prompt only):
Extract avoidTerms: terms or concepts that would misalign with the role or reduce fit—e.g. wrong seniority ("entry-level" for a Staff role), opposing focus ("frontend-only" for a backend-heavy role), wrong domain, or overused buzzwords that would hurt for this role. Do not include company/mission fluff. Output as an array of strings.

Return ONLY valid JSON, no markdown or explanation:
{
  "idealCandidateProfile": {
    "responsibilities": ["..."],
    "mustHaves": ["..."],
    "preferred": ["..."],
    "experienceLevel": "...",
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
  "criticalKeywords": ["validated terms only: directly aligned with role, from requirements or What you'll do"],
  "avoidTerms": ["entry-level", "wrong domain term", "harmful buzzword for this role"]
}

Job Description:
${jobDescription.substring(0, 8000)}
`;
}
