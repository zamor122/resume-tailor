import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getATSOptimizerPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, currentScore, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = getATSOptimizerPrompt(resume, jobDescription, currentScore);

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    const result = await generateWithFallback(
      prompt,
      selectedModel,
      undefined,
      sessionApiKeys
    );
    const text = result.text.trim();

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      // Calculate total potential improvement
      const totalImpact = parsedResponse.quickWins?.reduce((sum: number, win: any) => sum + (win.impact || 0), 0) || 0;
      const projectedScore = Math.min(100, (parsedResponse.currentScore || 0) + totalImpact);
      
      return NextResponse.json({
        currentScore: parsedResponse.currentScore || currentScore || 0,
        projectedScore: parsedResponse.projectedScore || projectedScore,
        quickWins: parsedResponse.quickWins || [],
        keywordOptimization: parsedResponse.keywordOptimization || {},
        formatting: parsedResponse.formatting || {},
        structure: parsedResponse.structure || {},
        content: parsedResponse.content || {},
        implementationPlan: parsedResponse.implementationPlan || [],
        priorityMatrix: parsedResponse.priorityMatrix || {},
        potentialImprovement: projectedScore - (parsedResponse.currentScore || currentScore || 0),
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse ATS optimizer response:', text);
      
      return NextResponse.json({
        currentScore: currentScore || 0,
        projectedScore: currentScore || 0,
        quickWins: [],
        keywordOptimization: {},
        formatting: {},
        structure: {},
        content: {},
        implementationPlan: [],
        potentialImprovement: 0,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('ATS Optimizer error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to optimize ATS score",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

