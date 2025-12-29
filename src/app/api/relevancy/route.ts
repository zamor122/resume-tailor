import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { DEFAULT_MODEL } from "@/app/config/models";

async function evaluateResumeRelevancy(
  resume: string,
  jobDescription: string,
  modelKey?: string,
  sessionApiKeys?: Record<string, string>
): Promise<number> {
  try {
    const prompt = `
      You are an expert ATS (Applicant Tracking System) evaluator. Your task is to analyze how well a resume matches a job description.
      
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
      
      Return ONLY a numerical score from 0-100 representing the percentage match between the resume and job requirements.
      Do not include any explanation, just the number.
    `;

    const result = await generateWithFallback(
      prompt,
      modelKey || DEFAULT_MODEL,
      undefined,
      sessionApiKeys
    );
    const text = result.text.trim();
    
    // Extract just the number from the response
    const score = parseInt(text.replace(/\D/g, ''));
    
    // Validate the score is within range
    if (isNaN(score) || score < 0 || score > 100) {
      console.error('Invalid score returned:', text);
      return 50; // Default fallback
    }
    
    return score;
  } catch (error) {
    console.error("Error evaluating resume relevancy:", error);
    throw error;
  }
}

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  console.log('=== Starting new relevancy calculation ===');
  try {
    const { originalResume, tailoredResume, jobDescription, sessionId, modelKey } = await req.json();
    
    // Get session preferences for model selection
    let sessionApiKeys: Record<string, string> | undefined;
    let selectedModel = modelKey || DEFAULT_MODEL;
    
    if (sessionId) {
      try {
        const sessionResponse = await fetch(`${req.nextUrl.origin}/api/mcp/session-manager`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', sessionId }),
        });
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.session?.preferences?.modelPreferences?.defaultModel) {
            selectedModel = sessionData.session.preferences.modelPreferences.defaultModel;
          }
          if (sessionData.session?.preferences?.apiKeys) {
            sessionApiKeys = sessionData.session.preferences.apiKeys;
          }
        }
      } catch (e) {
        console.warn('Failed to fetch session preferences:', e);
      }
    }
    
    // Clean and validate texts
    const cleanText = (text: string) => {
      return text.trim();
    };

    const cleanedJob = cleanText(jobDescription);
    const cleanedOriginal = cleanText(originalResume);
    const cleanedTailored = cleanText(tailoredResume);

    console.log('Text lengths:', {
      job: cleanedJob.length,
      original: cleanedOriginal.length,
      tailored: cleanedTailored.length
    });

    // Evaluate both resumes against the job description
    console.log('Evaluating original resume...');
    const beforeScore = await evaluateResumeRelevancy(cleanedOriginal, cleanedJob, selectedModel, sessionApiKeys);
    
    console.log('Evaluating tailored resume...');
    const afterScore = await evaluateResumeRelevancy(cleanedTailored, cleanedJob, selectedModel, sessionApiKeys);

    console.log('Scores:', { before: beforeScore, after: afterScore });

    // Format the improvement
    const improvement = afterScore > beforeScore 
      ? `+${afterScore - beforeScore}%`
      : `-${beforeScore - afterScore}%`;

    return NextResponse.json({
      before: beforeScore,
      after: afterScore,
      improvement
    });

  } catch (error) {
    console.error('=== Relevancy calculation failed ===');
    console.error('Error details:', error);
    return NextResponse.json({
      error: "Failed to calculate relevancy scores",
      message: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}  