import { NextRequest, NextResponse } from "next/server";
import { extractKeywordsFrequencyBased } from "@/app/utils/keyword-extraction";

export const runtime = 'edge';
export const preferredRegion = 'auto';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, industry } = await req.json();
    if (!jobDescription || jobDescription.length < 100) {
      return NextResponse.json({ error: "Invalid Input", message: "Please provide a job description with at least 100 characters" }, { status: 400 });
    }

    // Deterministic frequency-based keyword extraction (no LLM).
    const result = extractKeywordsFrequencyBased(jobDescription);

    return NextResponse.json({
      keywords: result.keywords,
      keywordDensity: result.keywordDensity,
      missingFromResume: [],
      recommendations: [],
      industryBenchmark: {},
      industry: industry || "Technology",
      experienceLevel: "mid",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Server Error", message: "Failed to analyze keywords", details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
