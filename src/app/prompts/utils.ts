/**
 * CENTRALIZED PROMPTS - UTILITY FUNCTIONS
 * 
 * This file contains utility prompts for various helper operations.
 * Used by: /api/tailor/job/title/route.ts, /api/research-company/route.ts
 */

/**
 * Job title extraction prompt
 * Used by: /api/tailor/job/title/route.ts
 */
export function getJobTitleExtractionPrompt(jobDescription: string): string {
  return `
      You are a job title analyzer. Given a job description, extract the most appropriate standardized job title.
      
      Rules:
      1. Return ONLY a JSON object with no additional text or explanation
      2. The JSON must be in this exact format: {"jobTitle": "string", "confidence": number}
      3. The job title should be standardized and widely recognized
      4. Confidence should be 1-100 based on clarity of the role
      5. Remove any level indicators (e.g., "Senior", "Lead") unless crucial to the role
      
      Job Description:
      ${jobDescription}
    `;
}

/**
 * Company name and job title extraction prompt
 * Used by: /api/research-company/route.ts
 */
export function getCompanyExtractionPrompt(jobDescription: string): string {
  return `Extract the company name and job title from this job description. Return JSON with "companyName" and "jobTitle" fields.

Job Description:
${jobDescription}`;
}

/**
 * Company research prompt
 * Used by: /api/research-company/route.ts
 */
export function getCompanyResearchPrompt(
  companyName: string,
  jobTitle: string,
  jobDescription: string
): string {
  return `Research and provide detailed information about the company "${companyName}" and the job role "${jobTitle}".

Based on the job description and general knowledge, provide:
1. Company information: industry, size, culture, values, and relevant keywords
2. Job-specific information: team structure, reporting relationships, growth opportunities, and key priorities

Return JSON with this structure:
{
  "companyInfo": {
    "industry": "string",
    "size": "string",
    "culture": "string",
    "values": ["string"],
    "keywords": ["string"]
  },
  "jobInfo": {
    "teamStructure": "string",
    "reporting": "string",
    "growth": "string",
    "priorities": ["string"]
  }
}

Job Description:
${jobDescription}`;
}

/**
 * Job description enhancement prompt
 * Used by: /api/research-company/route.ts
 */
export function getJobDescriptionEnhancementPrompt(
  jobDescription: string,
  companyInfo: {
    industry: string;
    size: string;
    culture: string;
    values: string[];
    keywords: string[];
  },
  jobInfo: {
    teamStructure: string;
    reporting: string;
    growth: string;
    priorities: string[];
  }
): string {
  return `Enhance the following job description with company-specific context and keywords. Include relevant company culture, values, and job-specific details naturally.

Original Job Description:
${jobDescription}

Company Information:
- Industry: ${companyInfo.industry}
- Size: ${companyInfo.size}
- Culture: ${companyInfo.culture}
- Values: ${companyInfo.values.join(', ')}
- Keywords: ${companyInfo.keywords.join(', ')}

Job Information:
- Team Structure: ${jobInfo.teamStructure}
- Reporting: ${jobInfo.reporting}
- Growth: ${jobInfo.growth}
- Priorities: ${jobInfo.priorities.join(', ')}

Return the enhanced job description as plain text (not JSON).`;
}

/**
 * Diff explanation prompt (explain why changes were made)
 * Used by: /api/humanize/diff/route.ts
 */
export function getDiffExplanationPrompt(
  changes: Array<{
    type: string;
    original: string;
    tailored: string;
    section?: string;
  }>,
  jobDescription: string
): string {
  const changesText = changes.map((change, idx) => {
    return `Change ${idx + 1}:
- Type: ${change.type}
- Original: "${change.original.substring(0, 200)}"
- Tailored: "${change.tailored.substring(0, 200)}"
- Section: ${change.section || 'Unknown'}`;
  }).join('\n\n');

  return `You are an expert resume optimizer. Analyze these resume changes and explain WHY each change was made, linking it to the job description requirements.

Job Description:
"""
${jobDescription.substring(0, 2000)}
"""

Resume Changes:
"""
${changesText}
"""

For each change, provide:
1. A clear explanation of WHY the change was made (be specific, not generic)
2. Link to specific keywords or requirements from the job description
3. Make it actionable and understandable

Return ONLY a JSON array with this exact structure:
[
  {
    "index": 0,
    "explanation": "Clear explanation of why this change was made, linking to job requirements",
    "jobReason": "Specific reason tied to job description (e.g., 'Job mentions React 5 times')"
  },
  ...
]

Be direct and authoritative. Users want clear authority, not humility.`;
}



