import { NextRequest, NextResponse } from "next/server";
import {
  computeResumeMetrics,
  computeCompositeScore,
  extractRequirements,
  extractCriticalKeywords,
} from "@/app/utils/resume-metrics";
import { callMCPTool, generateCacheKey } from "@/app/utils/mcp-tools";

export const runtime = "edge";
export const preferredRegion = "auto";
export const maxDuration = 30;

interface KeywordExtractorResult {
  criticalKeywords?: string[];
  keywords?: {
    technical?: Array<{ term: string }>;
  };
}

export async function POST(req: NextRequest) {
  try {
    const { originalResume, tailoredResume, jobDescription, keywords: providedKeywords } =
      await req.json();

    if (!jobDescription || jobDescription.length < 50) {
      return NextResponse.json(
        { error: "Invalid Input", message: "Job description is required" },
        { status: 400 }
      );
    }

    if (!originalResume && !tailoredResume) {
      return NextResponse.json(
        { error: "Invalid Input", message: "At least one resume is required" },
        { status: 400 }
      );
    }

    const resumeForKeywords = originalResume || tailoredResume;
    let criticalKeywords: string[] = [];
    let technicalTerms: string[] = [];

    if (providedKeywords && typeof providedKeywords === "object") {
      criticalKeywords = providedKeywords.criticalKeywords ?? [];
      technicalTerms =
        providedKeywords.keywords?.technical?.map((t: { term: string }) => t.term) ?? [];
    }

    if (criticalKeywords.length === 0 || technicalTerms.length === 0) {
      try {
        const baseUrl = req.nextUrl.origin;
        const cacheKey = generateCacheKey(
          "relevancy-keywords",
          `${jobDescription}:${resumeForKeywords}`
        );
        const keywordResult = await callMCPTool<KeywordExtractorResult>(
          baseUrl,
          "/api/mcp-tools/keyword-extractor",
          { jobDescription, resume: resumeForKeywords },
          { cacheKey, cacheTTL: 5 * 60 * 1000 }
        );
        criticalKeywords = keywordResult?.criticalKeywords ?? criticalKeywords;
        technicalTerms =
          keywordResult?.keywords?.technical?.map((t) => t.term) ?? technicalTerms;
      } catch (err) {
        console.warn("[relevancy-scorer] Keyword extractor failed, using frequency-based fallback:", err);
      }
    }

    if (criticalKeywords.length === 0) {
      criticalKeywords = extractCriticalKeywords(jobDescription);
    }
    if (technicalTerms.length === 0) {
      technicalTerms = extractCriticalKeywords(jobDescription);
    }

    const reqs = extractRequirements(jobDescription);
    const options = {
      requirements: reqs.requirements,
      criticalKeywords,
      technicalTerms,
    };

    const beforeMetrics = originalResume
      ? computeResumeMetrics(originalResume, jobDescription, options)
      : computeResumeMetrics(tailoredResume || "", jobDescription, options);

    const afterMetrics = tailoredResume
      ? computeResumeMetrics(tailoredResume, jobDescription, options)
      : beforeMetrics;

    const beforeScore = computeCompositeScore(beforeMetrics);
    const afterScore = computeCompositeScore(afterMetrics);

    const improvement =
      afterScore > beforeScore
        ? `+${afterScore - beforeScore}%`
        : afterScore < beforeScore
          ? `-${beforeScore - afterScore}%`
          : "0%";

    const result = {
      before: beforeScore,
      after: afterScore,
      beforeMetrics,
      afterMetrics,
      beforeScore,
      afterScore,
      improvement,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Relevancy Scorer error:", error);
    return NextResponse.json(
      {
        error: "Server Error",
        message: "Failed to calculate relevancy",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
