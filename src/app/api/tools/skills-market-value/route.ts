import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getSkillsMarketValuePrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, location, industry, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = getSkillsMarketValuePrompt(resume, location, industry);

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
        skillsAnalysis: parsedResponse.skillsAnalysis || [],
        marketPositioning: parsedResponse.marketPositioning || {},
        salaryPotential: parsedResponse.salaryPotential || {},
        careerPath: parsedResponse.careerPath || {},
        trends: parsedResponse.trends || {},
        recommendations: parsedResponse.recommendations || [],
        location: location || "Not specified",
        industry: industry || "Not specified",
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse skills market value response:', text);
      
      return NextResponse.json({
        skillsAnalysis: [],
        marketPositioning: {
          overallValue: 50,
          competitiveAdvantage: 50,
          marketFit: "average"
        },
        salaryPotential: {},
        careerPath: {},
        trends: {},
        recommendations: [],
        location: location || "Not specified",
        industry: industry || "Not specified",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Skills Market Value error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze skills market value",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

