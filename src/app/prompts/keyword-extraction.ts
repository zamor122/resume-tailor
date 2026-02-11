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
Extract keywords from this job description for resume tailoring and job match optimization.
${jobTitle ? `Job title: ${jobTitle}` : ""}
${resumeContext}

Extract and categorize:
1. technical: programming languages, tools, frameworks, technologies
2. soft: communication, leadership, teamwork, etc.
3. industry: domain terms, methodologies, industry-specific phrases
4. certifications: any cert names (AWS, PMP, etc.)
5. actionVerbs: verbs like developed, implemented, led
6. powerWords: high-impact terms (senior, scalable, enterprise)

For each keyword provide: term, importance (critical|high|medium|low), importanceScore (0-100), frequency (count in JD).
For technical: add synonyms[] and recommendedSections[].
${resume ? "Mark keywords missing from resume as critical or high importance." : ""}

Return ONLY valid JSON, no markdown or explanation:
{
  "keywords": {
    "technical": [{"term":"...","importance":"critical|high|medium|low","importanceScore":0-100,"frequency":1,"synonyms":[],"recommendedSections":["Skills","Experience"]}],
    "soft": [{"term":"...","importance":"...","importanceScore":0-100,"frequency":1}],
    "industry": [{"term":"...","importance":"...","frequency":1}],
    "certifications": [{"term":"...","importance":"high","frequency":1}],
    "actionVerbs": [{"term":"...","frequency":1}],
    "powerWords": [{"term":"...","frequency":1}]
  },
  "keywordDensity": {"totalKeywords":0,"criticalKeywords":0,"averageFrequency":0,"mostFrequent":[{"keyword":"...","count":0}]},
  "criticalKeywords": ["list of critical/high importance term strings"]
}

Job Description:
${jobDescription.substring(0, 8000)}
`;
}
