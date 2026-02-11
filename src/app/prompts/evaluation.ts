/**
 * CENTRALIZED PROMPTS - EVALUATION & VALIDATION
 * 
 * This file contains prompts for evaluating resumes, calculating scores, and validation.
 * Used by: /api/validate-resume/route.ts, /api/ai-detection/route.ts
 */

/**
 * Job relevancy scoring prompt
 * Used by: /api/validate-resume/route.ts, /api/ai-detection/route.ts
 */
export function getRelevancyScorePrompt(jobDescription: string, resume: string): string {
  return `
      You are an expert resume evaluator. Your task is to analyze how well a resume matches a job description for recruiter review.
      
      Job Description:
      """
      ${jobDescription}
      """
      
      Resume:
      """
      ${resume}
      """
      
      Evaluate how well this resume addresses the specific requirements, skills, and qualifications mentioned in the job description.
      Consider the following factors:
      1. Key skills and technologies mentioned in the job description that appear in the resume
      2. Required qualifications and how well they are addressed
      3. Relevant experience that matches job responsibilities
      4. Use of similar terminology and industry keywords
      5. Natural keyword integration and human readability—penalize keyword stuffing and robotic patterns (e.g., "Other Keywords" sections, bold keyword lists, repetitive unnatural phrasing)
      
      Return ONLY a numerical score from 0-100 representing the percentage match between the resume and job requirements.
      Do not include any explanation, just the number.
    `;
}

/**
 * Resume validation prompt (detect hallucinations/fabrications)
 * Used by: /api/validate-resume/route.ts
 */
export function getResumeValidationPrompt(originalResume: string, tailoredResume: string): string {
  return `You are a resume validation expert. Compare the tailored resume against the original resume and identify any hallucinations, fabrications, or information that doesn't appear in the original.

Original Resume:
${originalResume}

Tailored Resume:
${tailoredResume}

Check for:
1. Hallucinations: Information that doesn't exist in the original (e.g., fabricated achievements, skills, experiences)
2. Fabrications: Made-up metrics, numbers, or accomplishments
3. Unverifiable metrics: Numbers that seem unreasonable or can't be verified
4. Hallucinated technologies: Technologies or tools not mentioned in the original
5. Fabricated company names: Companies or projects not in the original

Return JSON with this structure:
{
  "isValid": boolean,
  "flaggedItems": [
    {
      "type": "hallucination" | "fabrication" | "metric" | "technology" | "company",
      "description": "string",
      "location": "string (section or approximate location)",
      "severity": "low" | "medium" | "high"
    }
  ],
  "summary": "string (overall validation summary)"
}

If the tailored resume is valid and all information can be traced to the original, return isValid: true with an empty flaggedItems array.`;
}

/**
 * AI detection prompt
 * Used by: /api/ai-detection/route.ts
 */
export function getAIDetectionPrompt(text: string): string {
  return `
      Analyze the following text and determine if it appears to be written by AI or a human.
      
      Consider these factors:
      1. Natural language patterns and flow
      2. Repetitive phrases or structures
      3. Overly formal or generic language
      4. Lack of personal voice or unique expressions
      5. Perfect grammar without natural variations
      6. Generic buzzwords or corporate speak
      
      Return ONLY a JSON object with this exact format:
      {
        "aiScore": <number 0-100, where 0 is definitely human and 100 is definitely AI>,
        "confidence": <number 0-100, how confident you are in this assessment>,
        "indicators": ["indicator1", "indicator2", ...],
        "humanScore": <number 0-100, inverse of aiScore>
      }
      
      Text to analyze:
      ${text.substring(0, 5000)}
    `;
}



