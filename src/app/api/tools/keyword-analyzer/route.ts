import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { getKeywordAnalyzerPrompt } from "@/app/prompts";
import { extractKeywordsFrequencyBased } from "@/app/utils/keyword-extraction";
import { parseJSONFromText } from "@/app/utils/json-extractor";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, industry, sessionId, modelKey } = await req.json();
    
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({
        error: "Invalid Input",
        message: "Please provide a job description with at least 100 characters"
      }, { status: 400 });
    }

    const prompt = getKeywordAnalyzerPrompt(jobDescription, industry);

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
    const text = result.text?.trim() || "";

    const parsedResponse = parseJSONFromText<Record<string, unknown>>(text);
    if (parsedResponse) {
      return NextResponse.json({
        keywords: parsedResponse.keywords || {},
        keywordDensity: parsedResponse.keywordDensity || {},
        missingFromResume: parsedResponse.missingFromResume || [],
        recommendations: parsedResponse.recommendations || [],
        industryBenchmark: parsedResponse.industryBenchmark || {},
        industry: parsedResponse.industry || industry || "Unknown",
        experienceLevel: parsedResponse.experienceLevel || "mid",
        timestamp: new Date().toISOString(),
      });
    }

    // Fallback: frequency-based extraction (no hardcoded tech list)
    console.warn("Keyword analyzer: LLM parse failed, using frequency-based fallback");
    const fallback = extractKeywordsFrequencyBased(jobDescription);
    return NextResponse.json({
      keywords: fallback.keywords,
      keywordDensity: fallback.keywordDensity,
      missingFromResume: [],
      recommendations: [],
      industryBenchmark: {},
      industry: industry || "Technology",
      experienceLevel: "mid",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Keyword Analyzer error:', error);
    return NextResponse.json({
      error: "Server Error",
      message: "Failed to analyze keywords",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

