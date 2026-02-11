import { NextRequest, NextResponse } from "next/server";
import { isRateLimitError } from "@/app/services/ai-provider";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 60;

async function runHumanizeStream(
  baseUrl: string,
  params: {
    resume: string;
    jobDescription: string;
    sessionId?: string;
    modelKey?: string;
    userId?: string;
  }
): Promise<{
  tailoredResume: string;
  matchScore?: { before: number; after: number };
  improvementMetrics?: Record<string, number>;
  validationResult?: unknown;
  resumeId?: string;
  contentMap?: Record<string, string>;
  freeReveal?: unknown;
  formatSpec?: unknown;
}> {
  const response = await fetch(`${baseUrl}/api/humanize/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resume: params.resume,
      jobDescription: params.jobDescription,
      sessionId: params.sessionId,
      modelKey: params.modelKey,
      userId: params.userId,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Humanize stream failed");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";
  let completeData: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(line.slice(6).trim());
          if (parsed.tailoredResume) {
            completeData = parsed;
          }
          if (parsed.error) {
            throw new Error(parsed.error);
          }
        } catch (e) {
          if (e instanceof Error && e.message !== "Humanize stream failed") {
            if (completeData) break;
            throw e;
          }
        }
      }
    }
  }

  if (!completeData) throw new Error("No result from humanize stream");

  return {
    tailoredResume: completeData.tailoredResume as string,
    matchScore: completeData.matchScore as { before: number; after: number } | undefined,
    improvementMetrics: completeData.improvementMetrics as Record<string, number> | undefined,
    validationResult: completeData.validationResult,
    resumeId: completeData.resumeId as string | undefined,
    contentMap: completeData.contentMap as Record<string, string> | undefined,
    freeReveal: completeData.freeReveal,
    formatSpec: completeData.formatSpec,
  };
}

function improvementMetricsToChanges(metrics?: Record<string, number>): Array<{ changeDescription: string; changeDetails: string }> {
  if (!metrics) return [];
  const changes: Array<{ changeDescription: string; changeDetails: string }> = [];
  if (metrics.quantifiedBulletsAdded && metrics.quantifiedBulletsAdded > 0) {
    changes.push({
      changeDescription: "Quantified bullet points added",
      changeDetails: `Added ${metrics.quantifiedBulletsAdded} achievement-focused bullet points with measurable impact.`,
    });
  }
  if (metrics.atsKeywordsMatched && metrics.atsKeywordsMatched > 0) {
    changes.push({
      changeDescription: "Keywords matched",
      changeDetails: `Incorporated ${metrics.atsKeywordsMatched} relevant keywords from the job description to improve job match.`,
    });
  }
  if (metrics.activeVoiceConversions && metrics.activeVoiceConversions > 0) {
    changes.push({
      changeDescription: "Active voice conversions",
      changeDetails: `Converted ${metrics.activeVoiceConversions} passive phrases to strong, action-oriented language.`,
    });
  }
  if (metrics.sectionsOptimized && metrics.sectionsOptimized > 0) {
    changes.push({
      changeDescription: "Sections optimized",
      changeDetails: `Reorganized and enhanced ${metrics.sectionsOptimized} sections for better impact and clarity.`,
    });
  }
  return changes;
}

export async function POST(req: NextRequest) {
  let resume = "";
  let jobDescription = "";
  let sessionId: string | undefined;
  let modelKey: string | undefined;
  let userId: string | undefined;

  try {
    const body = await req.json();
    resume = body.resume || "";
    jobDescription = body.jobDescription || "";
    sessionId = body.sessionId;
    modelKey = body.modelKey;
    userId = body.userId;
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid JSON", message: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!resume || !jobDescription) {
    return NextResponse.json(
      { error: "Missing resume or job description" },
      { status: 400 }
    );
  }

  try {
    const baseUrl = req.nextUrl.origin;
    const result = await runHumanizeStream(baseUrl, {
      resume: resume.trim(),
      jobDescription: jobDescription.trim(),
      sessionId,
      modelKey,
      userId,
    });

    const changes = improvementMetricsToChanges(result.improvementMetrics);

    return NextResponse.json({
      tailoredResume: result.tailoredResume,
      matchScore: result.matchScore,
      improvementMetrics: result.improvementMetrics,
      resumeId: result.resumeId,
      contentMap: result.contentMap,
      freeReveal: result.freeReveal,
      formatSpec: result.formatSpec,
      changes,
    });
  } catch (error) {
    if (isRateLimitError(error)) {
      const apiError = error as any;
      const retrySeconds = apiError.retryAfter || 30;

      return NextResponse.json(
        {
          tailoredResume: resume || "",
          changes: [
            {
              changeDescription: "⚠️ API Quota Exceeded",
              changeDetails: `Unable to optimize resume due to API quota limits. You can retry immediately or wait ${retrySeconds} seconds for better results. Your original resume is preserved.`,
            },
          ],
          quotaExceeded: true,
          retryAfter: retrySeconds,
          canRetryImmediately: true,
          message: `API quota exceeded. You can retry now or wait ${retrySeconds} seconds for optimal results.`,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: "Processing Error",
        message: error instanceof Error ? error.message : "An unknown error occurred",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
