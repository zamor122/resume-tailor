import { NextRequest } from "next/server";
import { getModelFromSession } from "@/app/utils/model-helper";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { obfuscateResume } from "@/app/utils/resumeObfuscator";
import { checkApiRateLimit, trackRateLimitHit, estimateTokens } from "@/app/utils/apiRateLimiter";
import { trackEventServer } from "@/app/utils/umamiServer";
import { requireAuth, verifyUserIdMatch } from "@/app/utils/auth";
import { checkAndRecordAnonymousTailor } from "@/app/utils/anonymousTailorAllowance";
import { buildResumeAgentGraph } from "@/app/agent/graph";
import type { TailoringPreferences } from "@/app/types/tailoringPreferences";
import { DEFAULT_PREFERENCES } from "@/app/types/tailoringPreferences";

export const runtime = "nodejs";
export const preferredRegion = "auto";
export const maxDuration = 60;

/**
 * Send SSE event to client
 */
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: any): boolean {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  try {
    controller.enqueue(new TextEncoder().encode(message));
    return true;
  } catch {
    return false;
  }
}

/**
 * Stream resume tailoring process using LangGraph Agentic Engine
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    resume,
    jobDescription,
    sessionId,
    modelKey,
    userId,
    accessToken,
    jobTitle: clientJobTitle,
    parentResumeId,
    preferences: incomingPreferences,
  } = body;

  const preferences: TailoringPreferences = incomingPreferences || DEFAULT_PREFERENCES;

  if (!resume || resume.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: "Missing resume content (minimum 50 characters)" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let authenticatedUserId: string | null = null;

  if (userId) {
    const authResult = await requireAuth(req, { accessToken });
    if ("error" in authResult) {
      return new Response(
        JSON.stringify({ error: "Sign in to tailor your resume. Your first 3 are free.", requireAuth: true }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    const verifyResult = verifyUserIdMatch(authResult.userId, userId);
    if ("error" in verifyResult) return verifyResult.error;
    authenticatedUserId = authResult.userId;
  } else {
    const { allowed } = await checkAndRecordAnonymousTailor(req);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: "You've used your free preview. Create a free account to get 3 full tailors.",
          requireAuth: true,
          anonymousLimitExceeded: true,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // Check rate limits
  const estimatedTokens = estimateTokens(resume + (jobDescription || ""));
  const modelToUse = modelKey || undefined;
  const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
    sessionId,
    modelToUse,
    req.nextUrl.origin
  );

  const rateLimitCheck = await checkApiRateLimit(req, "humanize-stream", selectedModel, estimatedTokens);
  if (!rateLimitCheck.allowed) {
    await trackRateLimitHit(req, "humanize-stream", rateLimitCheck, selectedModel, authenticatedUserId ?? undefined);
    return new Response(
      JSON.stringify({
        error: "Service temporarily busy",
        retryAfter: rateLimitCheck.retryAfter,
        quotaExceeded: true,
      }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;

      req.signal?.addEventListener?.("abort", () => {
        streamClosed = true;
        try {
          controller.close();
        } catch {}
      });

      try {
        console.log(`[Stream API] ▶ Starting tailoring pipeline`, {
          model: selectedModel,
          resumeLength: resume.length,
          jobDescLength: jobDescription?.length || 0,
          intensity: preferences.intensity,
          userId: authenticatedUserId || "anonymous",
          jobTitle: clientJobTitle,
        });

        // Step 1: Initial event
        streamClosed = !sendSSE(controller, "status", {
          stage: "preprocessing",
          message: "Analyzing your career experience and target role...",
          progress: 15,
        });
        if (streamClosed) return;

        // Build and execute LangGraph Agent
        const startTime = Date.now();
        const graph = buildResumeAgentGraph();

        streamClosed = !sendSSE(controller, "agent_step", {
          step: "analyzing",
          message: "Reviewing career milestones, skills, and key accomplishments...",
          progress: 25,
        });
        if (streamClosed) return;

        // Execute graph with initial state
        const agentResult = await graph.invoke({
          rawResume: resume,
          rawJobDescription: jobDescription,
          sessionId,
          userId: authenticatedUserId ?? undefined,
          parentResumeId,
          preferences,
          modelKey: selectedModel,
          sessionApiKeys,
          jobTitle: clientJobTitle,
        });

        const elapsedMs = Date.now() - startTime;
        console.log(`[Stream API] ✔ Agent graph completed in ${elapsedMs}ms`, {
          scoreBefore: agentResult.beforeScore,
          scoreAfter: agentResult.afterScore,
          outputLength: agentResult.finalResumeText?.length,
          agentSteps: agentResult.logs?.length || 0,
          errors: agentResult.errors?.length ? agentResult.errors : undefined,
        });

        // Check if jobs were discovered and emit
        if (agentResult.discoveredJobs && agentResult.discoveredJobs.length > 0) {
          sendSSE(controller, "jobs_found", { jobs: agentResult.discoveredJobs });
        }

        streamClosed = !sendSSE(controller, "agent_step", {
          step: "tailoring",
          message: "Elevating accomplishment bullets and verifying authenticity with Jev AI...",
          progress: 75,
        });
        if (streamClosed) return;

        const tailoredResume = agentResult.finalResumeText || resume;

        // Stream sections (best-effort progressive rendering)
        try {
          const sections = tailoredResume.split(/\n(?=#|\n)/);
          sections.forEach((section: string, index: number) => {
            if (section.trim() && !streamClosed) {
              sendSSE(controller, "section", {
                index: index + 1,
                total: sections.length,
                content: section.trim(),
                sectionName: section.split("\n")[0].replace(/^#+\s*/, ""),
              });
            }
          });
        } catch (e) {
          console.warn("[Stream API] Section progressive streaming error (continuing to complete payload):", e);
        }

        // Obfuscate for unauthorized / teaser view
        const obfuscationResult = obfuscateResume(resume, tailoredResume);

        // Store in Supabase if authenticated
        let storedResumeId: string | null = null;
        if (authenticatedUserId) {
          try {
            let versionNumber = 1;
            let parentResumeIdVal: string | null = null;
            let rootResumeIdVal: string | null = null;
            let originalContent = resume;
            let jobDescriptionForInsert = agentResult.selectedJobDescription || jobDescription || "";

            if (parentResumeId) {
              const { data: parentRow } = await supabaseAdmin
                .from("resumes")
                .select("id, user_id, version_number, root_resume_id, original_content, job_description")
                .eq("id", parentResumeId)
                .single();
              if (parentRow && parentRow.user_id === authenticatedUserId) {
                parentResumeIdVal = parentResumeId;
                versionNumber = (parentRow.version_number ?? 1) + 1;
                rootResumeIdVal = parentRow.root_resume_id ?? parentRow.id;
                originalContent = parentRow.original_content ?? resume;
                jobDescriptionForInsert = parentRow.job_description ?? jobDescriptionForInsert;
              }
            }

            const insertData: any = {
              original_content: originalContent,
              tailored_content: tailoredResume,
              obfuscated_content: obfuscationResult.obfuscatedResume,
              content_map: obfuscationResult.contentMap,
              job_description: jobDescriptionForInsert,
              match_score: {
                before: agentResult.beforeScore ?? 50,
                after: agentResult.afterScore ?? 85,
                keywordGap: agentResult.keywordGap,
              },
              improvement_metrics: {
                ...agentResult.improvementMetrics,
                suggestions: agentResult.suggestions,
              },
              format_spec: {
                suggestions: agentResult.suggestions,
              },
              free_reveal: obfuscationResult.freeReveal,
              job_title: agentResult.jobTitle || clientJobTitle || null,
              company_name: null,
              parent_resume_id: parentResumeIdVal,
              version_number: versionNumber,
              root_resume_id: rootResumeIdVal,
              user_id: authenticatedUserId,
            };

            if (sessionId) {
              insertData.session_id = sessionId;
            }

            const { data: resumeData } = await supabaseAdmin
              .from("resumes")
              .insert(insertData)
              .select("id")
              .single();

            if (resumeData) {
              storedResumeId = resumeData.id;
              if (!parentResumeIdVal && !rootResumeIdVal) {
                await supabaseAdmin
                  .from("resumes")
                  .update({ root_resume_id: storedResumeId })
                  .eq("id", storedResumeId);
              }
            }
          } catch (err) {
            console.error("[Stream API] Error storing resume in Supabase:", err);
          }
        }

        console.log(`[Stream API] 📦 Emitting final completion payload`, {
          storedResumeId,
          tailoredLength: tailoredResume.length,
          contentMapEntries: obfuscationResult.contentMap?.length || 0,
          hasFreeReveal: !!obfuscationResult.freeReveal,
          suggestionCount: agentResult.suggestions?.length || 0,
          suggestionIds: agentResult.suggestions?.map((s: any) => s.id) || [],
          sectionGroupsCount: agentResult.sectionGroups?.length || 0,
          sectionGroupDetails: agentResult.sectionGroups?.map((g: any) => ({
            id: g.id,
            title: g.title,
            suggestionsCount: g.suggestions?.length || 0,
            hasChanges: g.hasChanges,
            status: g.status,
          })),
        });

        // Final completion event
        streamClosed = !sendSSE(controller, "complete", {
          tailoredResume,
          suggestions: agentResult.suggestions || [],
          sectionGroups: agentResult.sectionGroups,
          resumeAST: agentResult.resumeAST,
          improvementMetrics: agentResult.improvementMetrics,
          matchScore: agentResult.afterScore ?? 85,
          beforeScore: agentResult.beforeScore ?? 50,
          keywordGap: agentResult.keywordGap,
          validationResult: null,
          contentMap: obfuscationResult.contentMap,
          freeReveal: obfuscationResult.freeReveal,
          resumeId: storedResumeId,
          tailoringPreferences: preferences,
          discoveredJobs: agentResult.discoveredJobs,
          agentSteps: agentResult.logs,
          progress: 100,
        });

        if (streamClosed) return;
        controller.close();
      } catch (error: any) {
        console.error("[Stream API] ❌ Agent Graph Execution Error:", {
          message: error?.message,
          status: error?.status,
          stack: error?.stack,
        });
        if (!streamClosed) {
          sendSSE(controller, "error", {
            error: error.message || "An error occurred during agent execution",
            canRetry: error?.status === 429,
          });
          controller.close();
        }
        await trackEventServer("resume_tailor_error", {
          endpoint: "humanize/stream/agent",
          error: error?.message || "Unknown error",
          canRetry: error?.status === 429,
          userId: authenticatedUserId ?? "anonymous",
        });
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
