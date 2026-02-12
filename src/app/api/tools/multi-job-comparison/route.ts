import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getMultiJobComparisonPrompt } from "@/app/prompts";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescriptions, jobDescription, sessionId, modelKey } = await req.json();
    
    // Handle both single jobDescription and array of jobDescriptions
    let jobDescs: any[] = [];
    if (jobDescriptions && Array.isArray(jobDescriptions)) {
      jobDescs = jobDescriptions;
    } else if (jobDescription) {
      // If single job description provided, allow comparison with just one
      // But suggest they add more for better comparison
      jobDescs = [jobDescription];
    }
    
    if (!resume || jobDescs.length === 0) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Resume and at least 1 job description are required. For best results, provide 2 or more job descriptions."
      }, { status: 400 });
    }
    
    if (jobDescs.length > 10) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Maximum 10 job descriptions allowed"
      }, { status: 400 });
    }

    const prompt = getMultiJobComparisonPrompt(
      resume,
      jobDescs.map((job: any) => typeof job === 'string' ? job : (job.description || job.title || JSON.stringify(job)))
    );

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
        overallAnalysis: parsedResponse.overallAnalysis || {},
        jobComparisons: parsedResponse.jobComparisons || [],
        commonThemes: parsedResponse.commonThemes || {},
        optimizationStrategy: parsedResponse.optimizationStrategy || {},
        insights: parsedResponse.insights || {},
        recommendations: parsedResponse.recommendations || [],
        totalJobs: jobDescs.length,
        singleJobMode: jobDescs.length === 1,
        message: jobDescs.length === 1 
          ? "Only one job description provided. Add more job descriptions for better multi-job comparison insights."
          : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (parseError) {
      console.error('Failed to parse multi-job comparison response:', text);
      
      // Fallback: basic comparison
      return NextResponse.json({
        overallAnalysis: {
          bestMatch: 0,
          worstMatch: jobDescs.length - 1,
          averageMatch: 50,
          versatility: jobDescs.length === 1 ? 0 : 50
        },
        jobComparisons: jobDescs.map((_: any, index: number) => ({
          jobIndex: index,
          matchScore: 50,
          strengths: [],
          gaps: [],
          recommendations: []
        })),
        commonThemes: {},
        optimizationStrategy: {},
        insights: {},
        recommendations: [],
        totalJobs: jobDescs.length,
        singleJobMode: jobDescs.length === 1,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Multi-Job Comparison error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to compare resume against multiple jobs",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

