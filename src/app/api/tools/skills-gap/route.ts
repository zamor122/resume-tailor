import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getSkillsGapPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, sessionId, modelKey } = await req.json();
    
    if (!resume || !jobDescription) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Both resume and job description are required"
      }, { status: 400 });
    }

    const prompt = getSkillsGapPrompt(resume, jobDescription);

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
      
      return NextResponse.json({
        matchScore: Math.min(100, Math.max(0, parsedResponse.matchScore || 0)),
        matchBreakdown: parsedResponse.matchBreakdown || {},
        skills: parsedResponse.skills || { matched: [], missing: [], extra: [] },
        experience: parsedResponse.experience || {},
        education: parsedResponse.education || {},
        certifications: parsedResponse.certifications || {},
        actionPlan: parsedResponse.actionPlan || [],
        strengths: parsedResponse.strengths || [],
        weaknesses: parsedResponse.weaknesses || [],
        estimatedTimeToCloseGaps: parsedResponse.estimatedTimeToCloseGaps || "Unknown",
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse skills gap response:', text);
      
      return NextResponse.json({
        matchScore: 50,
        skills: { matched: [], missing: [], extra: [] },
        experience: {},
        education: {},
        certifications: {},
        actionPlan: [],
        strengths: [],
        weaknesses: [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Skills Gap Analyzer error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze skills gap",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

