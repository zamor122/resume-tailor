import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getRelevancyScorePrompt } from "@/app/prompts";

async function evaluateResumeRelevancy(
  resume: string,
  jobDescription: string,
  modelKey?: string,
  sessionApiKeys?: Record<string, string>
): Promise<number> {
  try {
    const prompt = getRelevancyScorePrompt(jobDescription, resume);

    if (!modelKey) {
      throw new Error('Model selection is required for relevancy evaluation.');
    }
    const result = await generateWithFallback(
      prompt,
      modelKey,
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
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );
    
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