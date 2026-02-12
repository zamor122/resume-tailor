import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getResumeStorytellerPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription, sessionId, modelKey } = await req.json();
    
    if (!resume || resume.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume is required"
      }, { status: 400 });
    }

    const prompt = getResumeStorytellerPrompt(resume, jobDescription);

    // Get session preferences for model selection
    const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
      sessionId,
      modelKey,
      req.nextUrl.origin
    );

    let text;
    try {
      const result = await generateWithFallback(
        prompt,
        selectedModel,
        undefined,
        sessionApiKeys
      );
      text = result.text.trim();
    } catch (apiError: any) {
      // Handle quota/rate limit errors
      if (apiError?.status === 429 || apiError?.message?.includes('429') || apiError?.message?.includes('quota')) {
        console.error('Gemini API quota exceeded in resume storyteller:', apiError);
        
        // Return fallback response with basic narrative analysis
        return NextResponse.json({
          narrativeScore: 50,
          currentNarrative: {
            theme: "Professional career progression",
            strengths: ["Experience in relevant field", "Quantifiable achievements"],
            weaknesses: ["Could enhance storytelling", "Add more narrative flow"],
            flow: "structured"
          },
          enhancedSections: [],
          narrativeArc: {
            beginning: "Career start",
            middle: "Growth and development",
            climax: "Key achievements",
            resolution: "Current value proposition"
          },
          storytellingTechniques: [
            {
              technique: "Quantifiable Achievements",
              description: "Use numbers and metrics to show impact",
              example: "Increased revenue by 25%",
              impact: "Makes achievements more concrete and memorable"
            }
          ],
          quantifiableAchievements: [],
          valueProposition: {
            current: "Experienced professional",
            enhanced: "Results-driven professional with proven track record",
            differentiators: []
          },
          recommendations: [
            {
              priority: "high",
              suggestion: "Add quantifiable metrics to achievements",
              expectedImpact: "Improves narrative credibility"
            }
          ],
          quotaExceeded: true,
          message: "⚠️ API quota exceeded - using fallback analysis. Please wait and try again for full analysis.",
          timestamp: new Date().toISOString(),
        });
      }
      throw apiError;
    }

    try {
      const cleanedText = text
        .replace(/```(?:json)?\n?/g, '')
        .replace(/```\n?$/g, '')
        .trim();
      
      const parsedResponse = JSON.parse(cleanedText);
      
      return NextResponse.json({
        narrativeScore: Math.min(100, Math.max(0, parsedResponse.narrativeScore || 0)),
        currentNarrative: parsedResponse.currentNarrative || {},
        enhancedSections: parsedResponse.enhancedSections || [],
        narrativeArc: parsedResponse.narrativeArc || {},
        storytellingTechniques: parsedResponse.storytellingTechniques || [],
        quantifiableAchievements: parsedResponse.quantifiableAchievements || [],
        valueProposition: parsedResponse.valueProposition || {},
        recommendations: parsedResponse.recommendations || [],
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse storyteller response:', text);
      
      return NextResponse.json({
        narrativeScore: 50,
        currentNarrative: {},
        enhancedSections: [],
        narrativeArc: {},
        storytellingTechniques: [],
        quantifiableAchievements: [],
        valueProposition: {},
        recommendations: [],
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Resume Storyteller error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to enhance resume storytelling",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

