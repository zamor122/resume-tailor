import { NextRequest, NextResponse } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getJDInterpreterPrompt } from "@/app/prompts";
import { parseJSONFromText } from "@/app/utils/json-extractor";
import {
  normalizeJDInterpreterResponse,
  extractKeywordsFrequencyBased,
  type JDInterpreterResult,
} from "@/app/utils/keyword-extraction";
import { cleanJobDescription } from "@/app/utils/jobDescriptionCleaner";
import { generateCacheKey, getCached, setCache } from "@/app/utils/mcp-tools";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resume, jobTitle } = await req.json();

    if (!jobDescription || jobDescription.length < 50) {
      return NextResponse.json(
        {
          error: "Invalid Input",
          message: "Job description is required (minimum 50 characters)",
        },
        { status: 400 }
      );
    }

    const cacheKey = generateCacheKey(
      "keywords",
      `${jobDescription}:${resume || ""}:${jobTitle || ""}`
    );
    const cached = getCached<JDInterpreterResult & { timestamp: string }>(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        timestamp: new Date().toISOString(),
      });
    }

    let result: JDInterpreterResult;
    try {
      const prompt = getJDInterpreterPrompt(
        jobDescription,
        resume || undefined,
        jobTitle || undefined
      );
      const genResult = await generateWithFallback(prompt);
      const text = genResult.text?.trim() || "";

      const parsed = parseJSONFromText<Record<string, unknown>>(text);
      if (parsed) {
        result = normalizeJDInterpreterResponse(parsed, jobDescription);
      } else {
        const fallbackKeywords = extractKeywordsFrequencyBased(jobDescription);
        result = {
          ...fallbackKeywords,
          cleanedJobDescription: cleanJobDescription(jobDescription, { maxLength: 8000 }),
          jobTitle: undefined,
        };
      }
    } catch (llmError) {
      console.warn("[keyword-extractor] LLM failed, using frequency fallback:", llmError);
      const fallbackKeywords = extractKeywordsFrequencyBased(jobDescription);
      result = {
        ...fallbackKeywords,
        cleanedJobDescription: cleanJobDescription(jobDescription, { maxLength: 8000 }),
        jobTitle: undefined,
      };
    }

    setCache(cacheKey, result, 5 * 60 * 1000);

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Keyword Extractor error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to extract keywords",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
