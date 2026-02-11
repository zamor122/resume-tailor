import { NextRequest, NextResponse } from "next/server";
import { getPipeline, type PipelineId } from "@/app/config/pipelines";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 120;

async function runHumanizeStream(
  baseUrl: string,
  params: {
    resume: string;
    jobDescription: string;
    sessionId?: string;
    userId?: string;
  }
): Promise<{
  tailoredResume: string;
  originalResume: string;
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
    originalResume: params.resume,
    matchScore: completeData.matchScore as { before: number; after: number } | undefined,
    improvementMetrics: completeData.improvementMetrics as Record<string, number> | undefined,
    validationResult: completeData.validationResult,
    resumeId: completeData.resumeId as string | undefined,
    contentMap: completeData.contentMap as Record<string, string> | undefined,
    freeReveal: completeData.freeReveal,
    formatSpec: completeData.formatSpec,
  };
}

async function callTool(
  baseUrl: string,
  endpoint: string,
  body: Record<string, unknown>,
  sessionId?: string
): Promise<unknown> {
  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || `Tool ${endpoint} failed: ${res.statusText}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pipelineId,
      resume,
      jobDescription,
      sessionId,
      userId,
    } = body as {
      pipelineId: PipelineId;
      resume: string;
      jobDescription: string;
      sessionId?: string;
      userId?: string;
    };

    if (!pipelineId || !resume) {
      return NextResponse.json(
        { error: "Missing pipelineId or resume" },
        { status: 400 }
      );
    }

    const config = getPipeline(pipelineId);

    // Auth required when pipeline includes tailor step - first 3 resumes free for signed-in users
    const hasTailorStep = config.steps.some((s) => s.internalStep === "tailor");
    if (hasTailorStep && !userId) {
      return NextResponse.json(
        { error: "Sign in to tailor your resume. Your first 3 are free.", requireAuth: true },
        { status: 401 }
      );
    }

    if (config.requiresResume && resume.trim().length < 100) {
      return NextResponse.json(
        { error: "Resume must be at least 100 characters" },
        { status: 400 }
      );
    }

    if (config.requiresJobDescription && (!jobDescription || jobDescription.trim().length < 100)) {
      return NextResponse.json(
        { error: "Job description must be at least 100 characters" },
        { status: 400 }
      );
    }

    const baseUrl = req.nextUrl.origin;
    const results: Record<string, unknown> = {};
    let currentResume = resume.trim();

    for (const step of config.steps) {
      if (step.internalStep === "tailor") {
        const tailorResult = await runHumanizeStream(baseUrl, {
          resume: currentResume,
          jobDescription: jobDescription?.trim() ?? "",
          sessionId,
          userId,
        });
        results.tailor = tailorResult;
        currentResume = tailorResult.tailoredResume;
      } else if (step.endpoint) {
        let toolBody: Record<string, unknown> = {};

        if (step.id === "resume_validator") {
          toolBody = {
            originalResume: resume.trim(),
            tailoredResume: currentResume,
          };
        } else if (
          step.id === "format_validator" ||
          step.id === "ats_simulator"
        ) {
          toolBody = { resume: currentResume };
        } else if (step.id === "skills_gap" || step.id === "interview_prep") {
          toolBody = {
            resume: currentResume,
            jobDescription: jobDescription?.trim() ?? "",
          };
        }

        const toolResult = await callTool(baseUrl, step.endpoint, toolBody, sessionId);
        results[step.id] = toolResult;
      }
    }

    return NextResponse.json({
      success: true,
      pipelineId,
      results,
      tailoredResume: results.tailor
        ? (results.tailor as { tailoredResume: string }).tailoredResume
        : undefined,
    });
  } catch (error) {
    console.error("[Pipeline] Error:", error);
    return NextResponse.json(
      {
        error: "Pipeline failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
