import { NextRequest } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { parseJSONFromText, extractTailoredResumeFromText } from "@/app/utils/json-extractor";
import { executeParallel, callMCPTool, generateCacheKey } from "@/app/utils/mcp-tools";
import { getTailoringPrompt, formatMetricsGuidance } from "@/app/prompts";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { obfuscateResume } from "@/app/utils/resumeObfuscator";
import { checkApiRateLimit, trackRateLimitHit, estimateTokens } from "@/app/utils/apiRateLimiter";
import { cleanJobDescription as cleanJobDescriptionUtil } from "@/app/utils/jobDescriptionCleaner";
import { sanitizeResumeForATS } from "@/app/utils/atsSanitizer";
import { looksLikeCompanyName } from "@/app/utils/companyNameValidator";
import { deduplicateResumeSections } from "@/app/utils/resumeSectionDedupe";
import { trackEventServer } from "@/app/utils/umamiServer";

// Changed to nodejs runtime because Cerebras SDK requires Node.js modules
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60;

/**
 * Send SSE event to client
 */
function sendSSE(controller: ReadableStreamDefaultController, event: string, data: any): boolean {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  try {
    controller.enqueue(new TextEncoder().encode(message));
    return true;
  } catch (e: any) {
    // Most common when client disconnects and the controller is already closed.
    // Swallow to avoid crashing the route (which surfaces as "network error" on the client).
    return false;
  }
}

/**
 * Stream resume tailoring process with progressive updates
 */
export async function POST(req: NextRequest) {
  const { resume, jobDescription, sessionId, modelKey, userId, quickDraft = false, jobTitle: clientJobTitle } = await req.json();

  if (!resume || !jobDescription) {
    return new Response(
      JSON.stringify({ error: "Missing resume or job description" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Auth required before tailoring - first 3 resumes free for signed-in users
  if (!userId) {
    return new Response(
      JSON.stringify({ error: "Sign in to tailor your resume. Your first 3 are free.", requireAuth: true }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check rate limits before processing
  const estimatedTokens = estimateTokens(resume + jobDescription);
  const modelToUse = modelKey || undefined;
  const { modelKey: selectedModel } = await getModelFromSession(
    sessionId,
    modelToUse,
    req.nextUrl.origin
  );
  
  const rateLimitCheck = await checkApiRateLimit(req, 'humanize-stream', selectedModel, estimatedTokens);
  
  if (!rateLimitCheck.allowed) {
    // Track rate limit hit
    await trackRateLimitHit(req, 'humanize-stream', rateLimitCheck, selectedModel, userId);
    
    return new Response(
      JSON.stringify({
        error: 'Service temporarily busy',
        retryAfter: rateLimitCheck.retryAfter,
        quotaExceeded: true,
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;
      try {
        // Close the stream if the client disconnects/aborts.
        req.signal?.addEventListener?.('abort', () => {
          streamClosed = true;
          try {
            controller.close();
          } catch {}
        });

        // Get model (defaults to cerebras:gpt-oss-120b if not specified)
        const { modelKey: selectedModel, sessionApiKeys } = await getModelFromSession(
          sessionId,
          modelToUse,
          req.nextUrl.origin
        );

        // Step 1: Pre-Generation - Use MCP Tools (Parallel, Deterministic, No AI Calls)
        streamClosed = !sendSSE(controller, "status", {
          stage: "preprocessing",
          message: "Starting analysis...",
          progress: 10,
        });
        if (streamClosed) return;

        const baseUrl = req.nextUrl.origin;
        let keywords: any = { keywords: {}, keywordDensity: {} };
        let parsedResume: any = { sections: [], experience: [], education: [], skills: {} };
        let companyResearch: any = null;
        let metricsContext: any = null;

        try {
          streamClosed = !sendSSE(controller, "status", {
            stage: "preprocessing",
            message: "Extracting keywords...",
            progress: 20,
          });
          if (streamClosed) return;

          const preGenResults = await executeParallel([
            {
              key: "keywords",
              fn: () =>
                callMCPTool(baseUrl, "/api/mcp-tools/keyword-extractor", {
                  jobDescription,
                  resume,
                }),
            },
            {
              key: "parsedResume",
              fn: () =>
                callMCPTool(baseUrl, "/api/mcp-tools/resume-parser", { resume }),
            },
            {
              key: "companyResearch",
              fn: () =>
                callMCPTool(baseUrl, "/api/mcp-tools/company-research", {
                  jobDescription,
                }),
            },
            {
              key: "metricsContext",
              fn: () =>
                callMCPTool(baseUrl, "/api/mcp-tools/metrics-context", {
                  jobDescription,
                }),
            },
          ]);

          keywords = preGenResults.keywords || keywords;
          parsedResume = preGenResults.parsedResume || parsedResume;
          companyResearch = preGenResults.companyResearch || null;
          if (companyResearch?.companyName && !looksLikeCompanyName(companyResearch.companyName)) {
            companyResearch = { ...companyResearch, companyName: '' };
          }
          metricsContext = preGenResults.metricsContext || null;
        } catch (error) {
          console.warn("[Stream] MCP tools failed, continuing without enhanced context:", error);
        }

        // Strip HTML/CSS from job description (common when pasting from web pages)
        const cleanJobDescription = cleanJobDescriptionUtil(jobDescription, { maxLength: 8000 });

        // Identify missing keywords by comparing job description keywords with resume
        // Align with relevancy-scorer: criticalKeywords drive the score, so prioritize them in sortedMissing
        const resumeLower = resume.toLowerCase();
        const criticalKeywords = keywords.criticalKeywords || [];
        const missingKeywords: string[] = [];
        const allJobKeywords = [
          ...(keywords.keywords?.technical || []),
          ...(keywords.keywords?.industry || []),
        ];

        // Missing critical keywords (used by relevancy-scorer for scoring—prioritize these)
        const missingCritical = criticalKeywords.filter((kw: string): boolean => {
          const term = (kw || "").toLowerCase();
          if (term.length < 3) return false;
          const variations = [term, term.replace(/\s+/g, ""), term.replace(/\s+/g, "-"), term.replace(/\s+/g, "_")];
          return !variations.some((v) => resumeLower.includes(v));
        });

        // Find other keywords from job description that are NOT in resume
        allJobKeywords.forEach((keyword: any) => {
          const term = keyword.term?.toLowerCase() || "";
          const keywordVariations = [
            term,
            term.replace(/\s+/g, ""),
            term.replace(/\s+/g, "-"),
            term.replace(/\s+/g, "_"),
          ];
          const foundInResume = keywordVariations.some((v) => resumeLower.includes(v));
          if (!foundInResume && term.length > 2) {
            missingKeywords.push(keyword.term || term);
          }
        });

        // Merge: critical keywords first (align with what relevancy-scorer uses), then rest by importance
        const criticalSet = new Set(missingCritical.map((k: string) => k.toLowerCase()));
        const restMissing = missingKeywords.filter((t) => !criticalSet.has(t.toLowerCase()));
        const sortedRest = restMissing
          .map((term) => {
            const keywordData = allJobKeywords.find((k: any) => k.term?.toLowerCase() === term.toLowerCase());
            return {
              term,
              importance: keywordData?.importance || "medium",
              importanceScore: keywordData?.importanceScore || 50,
              frequency: keywordData?.frequency || 1,
            };
          })
          .sort((a, b) => {
            const importanceOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const aImp = importanceOrder[a.importance as keyof typeof importanceOrder] || 2;
            const bImp = importanceOrder[b.importance as keyof typeof importanceOrder] || 2;
            if (aImp !== bImp) return bImp - aImp;
            return b.frequency - a.frequency;
          })
          .map((k: { term: string }) => k.term);
        const sortedMissing = [...missingCritical, ...sortedRest].slice(0, 20);

        // Build concise context (don't duplicate job description)
        const keywordContext =
          keywords.keywords?.technical?.slice(0, 15).map((k: any) => k.term).join(", ") || "";
        const companyContext = companyResearch?.companyInfo
          ? (companyResearch.companyName?.trim()
              ? `${companyResearch.companyName.trim()} (${companyResearch.companyInfo.industry})`
              : companyResearch.companyInfo.industry || "")
          : "";
        const jobTitle = clientJobTitle?.trim() || companyResearch?.jobTitle || undefined;

        // Calculate baseline ATS score before generation
        streamClosed = !sendSSE(controller, "status", {
          stage: "preprocessing",
          message: "Calculating baseline job match score...",
          progress: 35,
        });
        if (streamClosed) return;

        let baselineScore = 50; // Default fallback
        try {
          const relevancyResponse = await callMCPTool(
            baseUrl,
            "/api/mcp-tools/relevancy-scorer",
            {
              originalResume: resume,
              tailoredResume: resume, // Same as original for baseline
              jobDescription: cleanJobDescription,
            },
            {
              cacheKey: generateCacheKey("baseline-ats", `${resume}:${cleanJobDescription}`),
            }
          );
          
          if (relevancyResponse && typeof relevancyResponse === 'object' && 'before' in relevancyResponse) {
            baselineScore = (relevancyResponse as any).before;
          }
        } catch (error) {
          console.warn("[Stream] Error calculating baseline score:", error);
          // Continue with default score
        }

        streamClosed = !sendSSE(controller, "status", {
          stage: "generating",
          message: "Tailoring your resume...",
          progress: 40,
        });
        if (streamClosed) return;

        // Calculate target score (baseline + aggressive improvement: 15-20 points, or to 90+ if baseline is high)
        const scoreGap = 100 - baselineScore;
        const targetImprovement = scoreGap > 20 ? 20 : (scoreGap > 15 ? 15 : Math.max(15, scoreGap));
        const targetScore = Math.min(100, baselineScore + targetImprovement);

        // Use centralized prompt (strict base tailor only)
        const metricsGuidance = formatMetricsGuidance(metricsContext);
        const prompt = getTailoringPrompt({
          baselineScore,
          targetScore,
          targetImprovement,
          sortedMissing,
          keywordContext,
          companyContext,
          jobTitle,
          metricsGuidance,
          resume,
          cleanJobDescription,
        });


        // Generate tailored resume
        streamClosed = !sendSSE(controller, "status", {
          stage: "generating",
          message: "Optimizing content...",
          progress: 60,
        });
        if (streamClosed) return;

        const result = await generateWithFallback(
          prompt,
          selectedModel,
          undefined,
          sessionApiKeys
        );

        streamClosed = !sendSSE(controller, "status", {
          stage: "processing",
          message: "Processing results...",
          progress: 80,
        });
        if (streamClosed) return;

        // Extract JSON from response
        const jsonData = parseJSONFromText<{
          tailoredResume?: string;
          improvementMetrics?: {
            quantifiedBulletsAdded?: number;
            atsKeywordsMatched?: number;
            activeVoiceConversions?: number;
            sectionsOptimized?: number;
          };
        }>(result.text);

        let tailoredResume: string;
        let improvementMetrics: {
          quantifiedBulletsAdded: number;
          atsKeywordsMatched: number;
          activeVoiceConversions: number;
          sectionsOptimized: number;
        };

        if (jsonData && jsonData.tailoredResume) {
          tailoredResume = jsonData.tailoredResume;
          improvementMetrics = {
            quantifiedBulletsAdded: jsonData.improvementMetrics?.quantifiedBulletsAdded ?? 0,
            atsKeywordsMatched: jsonData.improvementMetrics?.atsKeywordsMatched ?? 0,
            activeVoiceConversions: jsonData.improvementMetrics?.activeVoiceConversions ?? 0,
            sectionsOptimized: jsonData.improvementMetrics?.sectionsOptimized ?? 0,
          };
        } else {
          // Fallback: extract tailoredResume from malformed JSON to avoid passing raw JSON to obfuscation
          const extracted = extractTailoredResumeFromText(result.text);
          tailoredResume =
            extracted ??
            (result.text.includes("improvementMetrics") ? resume : result.text);
          improvementMetrics = {
            quantifiedBulletsAdded: 0,
            atsKeywordsMatched: 0,
            activeVoiceConversions: 0,
            sectionsOptimized: 0,
          };
        }

        tailoredResume = sanitizeResumeForATS(tailoredResume);
        tailoredResume = deduplicateResumeSections(tailoredResume);

        // Stream sections as they're processed
        const sections = tailoredResume.split(/\n(?=#|\n)/);
        sections.forEach((section, index) => {
          if (section.trim()) {
            if (streamClosed) return;
            streamClosed = !sendSSE(controller, "section", {
              index: index + 1,
              total: sections.length,
              content: section.trim(),
              sectionName: section.split("\n")[0].replace(/^#+\s*/, ""),
            });
          }
        });
        if (streamClosed) return;

        // Step 3: Post-Generation - Use MCP Tools (Parallel, Deterministic, No AI Calls)
        streamClosed = !sendSSE(controller, "status", {
          stage: "scoring",
          message: "Calculating job match score...",
          progress: 90,
        });
        if (streamClosed) return;

        let beforeScore = 50;
        let afterScore = 50;
        let beforeMetrics: Record<string, unknown> | null = null;
        let afterMetrics: Record<string, unknown> | null = null;
        let validationResult: any = null;

        try {
          const postGenResults = await executeParallel([
            {
              key: "relevancy",
              fn: () =>
                callMCPTool(baseUrl, "/api/mcp-tools/relevancy-scorer", {
                  originalResume: resume,
                  tailoredResume,
                  jobDescription: cleanJobDescription,
                  keywords,
                }),
              cacheKey: generateCacheKey(
                "relevancy",
                `${resume}:${tailoredResume}:${cleanJobDescription}`
              ),
            },
            {
              key: "validation",
              fn: () =>
                callMCPTool(baseUrl, "/api/mcp-tools/resume-validator", {
                  originalResume: resume,
                  tailoredResume,
                }),
              cacheKey: generateCacheKey("validation", `${resume}:${tailoredResume}`),
            },
          ]);

          if (postGenResults.relevancy) {
            const rel = postGenResults.relevancy as {
              before?: number;
              after?: number;
              beforeMetrics?: { criticalKeywords?: { matched?: number }; concreteEvidence?: { withEvidence?: number } };
              afterMetrics?: { criticalKeywords?: { matched?: number }; concreteEvidence?: { withEvidence?: number } };
            };
            beforeScore = rel.before ?? rel.after ?? 50;
            afterScore = rel.after ?? rel.before ?? beforeScore;
            const beforeM = rel.beforeMetrics;
            const afterM = rel.afterMetrics;
            if (beforeM && afterM) {
              beforeMetrics = rel.beforeMetrics as Record<string, unknown>;
              afterMetrics = rel.afterMetrics as Record<string, unknown>;
              const kwDelta = (afterM.criticalKeywords?.matched ?? 0) - (beforeM.criticalKeywords?.matched ?? 0);
              const evidenceDelta = (afterM.concreteEvidence?.withEvidence ?? 0) - (beforeM.concreteEvidence?.withEvidence ?? 0);
              improvementMetrics = {
                quantifiedBulletsAdded: Math.max(0, evidenceDelta),
                atsKeywordsMatched: Math.max(0, kwDelta),
                activeVoiceConversions: 0,
                sectionsOptimized: 0,
              };
            }
          }

          validationResult = postGenResults.validation || null;
        } catch (error) {
          console.warn("[Stream] MCP post-processing failed:", error);
        }

        // Step 4: Format Recommender (last step - recommend best format for industry)
        let formatSpec: any = null;
        try {
          formatSpec = await callMCPTool(baseUrl, "/api/mcp-tools/format-recommender", {
            jobDescription: cleanJobDescription,
            industry: companyResearch?.companyInfo?.industry ?? "Technology",
            jobTitle: companyResearch?.jobTitle ?? "",
            tailoredResume,
          });
        } catch (error) {
          console.warn("[Stream] Format recommender failed, using defaults:", error);
        }

        // Obfuscate the tailored resume
        const obfuscationResult = obfuscateResume(resume, tailoredResume);

        // Store resume data in Supabase immediately
        let storedResumeId: string | null = null;
        try {
          const insertData: any = {
            original_content: resume,
            tailored_content: tailoredResume,
            obfuscated_content: obfuscationResult.obfuscatedResume,
            content_map: obfuscationResult.contentMap,
            job_description: cleanJobDescription,
            match_score: {
              before: beforeScore,
              after: afterScore,
              beforeMetrics: beforeMetrics ?? undefined,
              afterMetrics: afterMetrics ?? undefined,
            },
            improvement_metrics: improvementMetrics,
            free_reveal: obfuscationResult.freeReveal,
            // format_spec omitted from insert until column exists (run: ALTER TABLE resumes ADD COLUMN IF NOT EXISTS format_spec JSONB)
            job_title: (clientJobTitle?.trim() || companyResearch?.jobTitle) || null,
            company_name: (companyResearch?.companyName?.trim() && companyResearch.companyName !== "Unknown Company") ? companyResearch.companyName.trim() : null,
          };

          if (sessionId) {
            insertData.session_id = sessionId;
          }
          if (userId) {
            insertData.user_id = userId;
          }

          // Every completed tailor gets a new row (job completed, job stored)
          const { data: resumeData, error: resumeError } = await supabaseAdmin
            .from('resumes')
            .insert(insertData)
            .select('id')
            .single();

          if (resumeError) {
            console.error("[Stream] Error storing resume:", resumeError);
          } else if (resumeData) {
            storedResumeId = resumeData.id;
          }
        } catch (error) {
          console.error("[Stream] Error saving resume to DB:", error);
          // Continue - resume will be saved later via save endpoint or checkout
        }

        // Send final completion event with resumeId
        streamClosed = !sendSSE(controller, "complete", {
          tailoredResume,
          improvementMetrics,
          matchScore: afterScore,
          metrics: afterMetrics ?? undefined,
          validationResult,
          contentMap: obfuscationResult.contentMap,
          freeReveal: obfuscationResult.freeReveal,
          formatSpec,
          resumeId: storedResumeId,
          progress: 100,
        });
        if (streamClosed) return;

        controller.close();
      } catch (error: any) {
        console.error("[Stream] Error:", error);
        if (!streamClosed) {
          sendSSE(controller, "error", {
            error: error.message || "An error occurred",
            canRetry: error?.status === 429,
          });
          controller.close();
        }
        await trackEventServer("resume_tailor_error", {
          endpoint: "humanize/stream",
          error: error?.message || "Unknown error",
          canRetry: error?.status === 429,
          userId: userId ?? "anonymous",
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

