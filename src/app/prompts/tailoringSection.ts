/**
 * Section-level tailoring prompts for summary and experience bullets only.
 * Used when section-based tailoring is enabled: title/company/dates are copy-pasted; only bullets and summary are AI-tailored.
 */

/**
 * Prompt to tailor only the Summary section. No contact, no experience structure—just the summary prose.
 */
export function getSummaryTailoringPrompt(params: {
  resume: string;
  jobDescription: string;
  jobTitle?: string;
  userInstructions?: string;
  userRequestedKeywords?: string[];
}): string {
  const { resume, jobDescription, jobTitle, userInstructions, userRequestedKeywords } = params;
  const jobTitleLine = jobTitle ? `\nTarget job title for the summary: "${jobTitle}". Use only in the summary (e.g. "${jobTitle} with X years...").` : "";
  const userBlock = userInstructions
    ? `\nUSER-SPECIFIC INSTRUCTIONS (follow these):\n${userInstructions}\n`
    : "";
  const keywordsBlock =
    userRequestedKeywords && userRequestedKeywords.length > 0
      ? `\nUSER-REQUESTED KEYWORDS TO WEAVE: ${userRequestedKeywords.join(", ")}\n`
      : "";
  const hasUserRequests = !!(userInstructions || (userRequestedKeywords && userRequestedKeywords.length > 0));
  const topUserBlock = hasUserRequests
    ? `

HIGHEST PRIORITY – USER REQUESTS (follow these first):
${userBlock}${keywordsBlock}`
    : "";
  return `You are an expert resume writer. Tailor ONLY the Summary/Objective section for the job below.${topUserBlock}

RULES:
- Output ONLY the summary text (3–4 sentences or 3–4 bullets). No headers, no "## Summary", no contact, no other sections.
- Derive every claim from the resume. Do not add location, company name from the job posting, or domain concepts not in the resume.
- Omit articles (a, the, an). Use present participles (e.g. ", improving..." not "to improve").
- No "passionate about", "results-driven", or reader-addressing phrases. Factual, declarative only.
- Weave in 3–5 job-relevant keywords from the job description naturally. Do not list keywords. Never put keywords in parentheses (e.g. use "Python and Django" not "(Python, Django)").${jobTitleLine}

Resume:
"""
${resume}
"""

Job description:
"""
${jobDescription}
"""

Output only the summary text, nothing else.`;
}

/**
 * Prompt to tailor only the bullets for one job. Title, company, and dates are fixed and must not appear in your output.
 */
export function getExperienceBulletsPrompt(params: {
  jobTitle: string;
  company: string;
  dates: string | null;
  bulletsText: string;
  jobDescription: string;
  resumeContext: string;
  userInstructions?: string;
  userRequestedKeywords?: string[];
}): string {
  const { jobTitle, company, dates, bulletsText, jobDescription, resumeContext, userInstructions, userRequestedKeywords } = params;
  const userBlock = userInstructions
    ? `\nUSER-SPECIFIC INSTRUCTIONS (follow these):\n${userInstructions}\n`
    : "";
  const keywordsBlock =
    userRequestedKeywords && userRequestedKeywords.length > 0
      ? `\nUSER-REQUESTED KEYWORDS TO WEAVE: ${userRequestedKeywords.join(", ")}\n`
      : "";
  const hasUserRequests = !!(userInstructions || (userRequestedKeywords && userRequestedKeywords.length > 0));
  const topUserBlock = hasUserRequests
    ? `

HIGHEST PRIORITY – USER REQUESTS (follow these first):
${userBlock}${keywordsBlock}`
    : "";
  return `You are an expert resume writer. Tailor ONLY the bullet points for this job. Do NOT output the job title, company name, or dates—those are fixed.${topUserBlock}

JOB CONTEXT (do not repeat in output):
- Title: ${jobTitle}
- Company: ${company}
- Dates: ${dates || "—"}

RULES:
- First bullet must be an overview: responsibilities, team size, tech stack, type of product (dashboard, data viz, etc.), methodology, scope.
- Remaining bullets: Action (strong past-tense verb) → Ingredients (technologies, tools, metrics) → Impact (result). 2 lines per bullet when possible.
- Use only content from the original resume; rephrase and add job-relevant keywords from the job description that describe work the candidate actually did. Never put keywords in parentheses (e.g. "REST APIs and microservices" not "(REST APIs, microservices)").
- Omit articles. Use present participles. Resume speak.
- Output ONLY the bullet list (each line starting with "- "). No headers, no title/company/dates.

Original bullets for this job:
"""
${bulletsText}
"""

Job description (weave relevant keywords into bullets):
"""
${jobDescription.slice(0, 3000)}
"""

Full resume (for context only):
"""
${resumeContext.slice(0, 4000)}
"""

Output only the tailored bullets, one per line, each starting with "- ".`;
}
