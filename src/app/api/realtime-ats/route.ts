import { NextRequest, NextResponse } from "next/server";
import { callMCPTool, generateCacheKey } from "@/app/utils/mcp-tools";

export const runtime = "edge";
export const preferredRegion = "auto";
export const maxDuration = 10;

/**
 * Real-time ATS metrics calculation endpoint
 * Debounced on client side, calculates defensible metrics from resume and job description
 */
export async function POST(req: NextRequest) {
  try {
    const { resume, jobDescription } = await req.json();

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "Missing resume or job description" },
        { status: 400 }
      );
    }

    const baseUrl = req.nextUrl.origin;

    try {
      const result = await callMCPTool(
        baseUrl,
        "/api/mcp-tools/relevancy-scorer",
        {
          originalResume: resume,
          tailoredResume: resume,
          jobDescription,
        },
        {
          cacheKey: generateCacheKey("realtime-ats", `${resume}:${jobDescription}`),
          cacheTTL: 2 * 60 * 1000,
        }
      );

      if (!result || typeof result !== "object") {
        throw new Error("Invalid response from relevancy scorer");
      }

      const r = result as {
        before?: number;
        after?: number;
        beforeScore?: number;
        afterScore?: number;
        beforeMetrics?: { jdCoverage?: { percentage?: number }; criticalKeywords?: { matched?: number; total?: number } };
        afterMetrics?: { jdCoverage?: { percentage?: number }; criticalKeywords?: { matched?: number; total?: number } };
      };

      const score = r.before ?? r.after ?? r.beforeScore ?? r.afterScore ?? 50;
      const metrics = r.beforeMetrics ?? r.afterMetrics;
      const criticalKw = metrics?.criticalKeywords;
      const matched = criticalKw?.matched ?? 0;
      const total = criticalKw?.total ?? 0;

      return NextResponse.json({
        score: Math.round(score),
        metrics: r.beforeMetrics ?? r.afterMetrics,
        jdCoverage: metrics?.jdCoverage?.percentage ?? 0,
        criticalKeywords: { matched, total, percentage: total > 0 ? Math.round((matched / total) * 100) : 0 },
        keywordMatches: {
          matched,
          total,
          percentage: total > 0 ? Math.round((matched / total) * 100) : 0,
        },
        details: {},
      });
    } catch (error) {
      console.error("[Realtime ATS] Error calculating metrics:", error);

      const resumeLower = resume.toLowerCase();
      const jobLower = jobDescription.toLowerCase();
      const stopwords = /^(the|and|or|but|for|with|from|that|this|these|those)$/i;
      const jobWords = jobLower
        .split(/\W+/)
        .filter((w: string) => w.length > 3 && !stopwords.test(w));
      const uniqueJobWords = Array.from(new Set(jobWords));
      const matchedWords = uniqueJobWords.filter((w) => resumeLower.includes(w));
      const score = Math.min(100, Math.round((matchedWords.length / Math.max(uniqueJobWords.length, 1)) * 100));

      return NextResponse.json({
        score,
        keywordMatches: {
          matched: matchedWords.length,
          total: uniqueJobWords.length,
          percentage: uniqueJobWords.length > 0 ? Math.round((matchedWords.length / uniqueJobWords.length) * 100) : 0,
        },
        details: { matchedWords: matchedWords.slice(0, 10) },
      });
    }
  } catch (error) {
    console.error("Error in realtime-ats API:", error);
    return NextResponse.json(
      {
        error: "Processing Error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
