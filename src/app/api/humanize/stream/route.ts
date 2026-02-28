import { NextRequest } from "next/server";
import { generateWithFallback } from "@/app/services/model-fallback";
import { getModelFromSession } from "@/app/utils/model-helper";
import { parseJSONFromText, extractTailoredResumeFromText } from "@/app/utils/json-extractor";
import { executeParallel, callMCPTool, generateCacheKey } from "@/app/utils/mcp-tools";
import { getTailoringPrompt, formatMetricsGuidance } from "@/app/prompts";
import { getSummaryTailoringPrompt, getExperienceBulletsPrompt } from "@/app/prompts/tailoringSection";
import { buildUserInstructions } from "@/app/prompts/tailoringPresets";
import { reassembleResumeFromSections, buildContactFromOriginal } from "@/app/utils/resumeReassemble";
import { supabaseAdmin } from "@/app/lib/supabase/server";
import { obfuscateResume } from "@/app/utils/resumeObfuscator";
import { checkApiRateLimit, trackRateLimitHit, estimateTokens } from "@/app/utils/apiRateLimiter";
import { cleanJobDescription as cleanJobDescriptionUtil, trimJobDescriptionToRoleContent } from "@/app/utils/jobDescriptionCleaner";
import { sanitizeResumeForATS } from "@/app/utils/atsSanitizer";
import { looksLikeCompanyName } from "@/app/utils/companyNameValidator";
import { deduplicateResumeSections } from "@/app/utils/resumeSectionDedupe";
import { validateOrFixEducationBlock } from "@/app/utils/educationValidator";
import { rewriteParentheticalKeywords } from "@/app/utils/keywordParenthesesCleaner";
import { sanitizeContactBlock, replaceContactBlock } from "@/app/utils/contactBlockSanitizer";
import { trackEventServer } from "@/app/utils/umamiServer";
import type { KeywordGapSnapshot } from "@/app/types/humanize";

// Changed to nodejs runtime because Cerebras SDK requires Node.js modules
export const runtime = 'nodejs';
export const preferredRegion = 'auto';
export const maxDuration = 60;

const FOUND_KEYWORDS_CAP = 20;
const MISSING_KEYWORDS_CAP = 20;
const MISSING_KEYWORD_MIN_LENGTH = 5;

/** Terms that should never be suggested as "Consider adding" (EEO, application form, company/mission fluff, etc.). */
const MISSING_KEYWORDS_BLOCKLIST = new Set([
  "anduril", "your", "select", "military", "veteran", "disability", "clearance", "disorder",
  "compensation", "duty", "roles", "form", "self", "requires", "external", "voluntary",
  "identification", "protected", "federal", "government", "role", "applicant", "candidate",
  "employment", "equal", "veterans", "confidential", "industries", "environments", "health",
  "defense technology", "advanced technology", "defense industry", "military systems",
  "allied military capabilities", "innovative", "transform", "bring", "changing", "defense",
  "technology", "mission", "capabilities", "allied", "cutting-edge", "cutting edge",
]);

/**
 * Compute keyword gap against final resume text: which JD keywords appear (found) vs missing.
 */
function computeKeywordGap(keywords: any, text: string): KeywordGapSnapshot {
  const textLower = text.toLowerCase();
  const criticalList = keywords?.criticalKeywords || [];
  const allJobKeywords = [
    ...(keywords?.keywords?.technical || []),
    ...(keywords?.keywords?.industry || []),
  ];
  const variations = (term: string) => {
    const t = (term || "").toLowerCase();
    return [t, t.replace(/\s+/g, ""), t.replace(/\s+/g, "-"), t.replace(/\s+/g, "_")];
  };
  const appearsIn = (term: string) => variations(term).some((v) => v.length >= 3 && textLower.includes(v));

  const found: string[] = [];
  const missing: string[] = [];
  const seenLower = new Set<string>();

  for (const kw of criticalList) {
    const term = (typeof kw === "string" ? kw : (kw as any)?.term ?? "").trim();
    if (term.length < 3) continue;
    const key = term.toLowerCase();
    if (seenLower.has(key)) continue;
    seenLower.add(key);
    if (appearsIn(term)) found.push(term);
    else missing.push(term);
  }

  const importanceOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const sorted = [...allJobKeywords].sort((a: any, b: any) => {
    const aImp = importanceOrder[a?.importance] ?? 2;
    const bImp = importanceOrder[b?.importance] ?? 2;
    if (bImp !== aImp) return bImp - aImp;
    return (b?.frequency ?? 1) - (a?.frequency ?? 1);
  });
  for (const k of sorted) {
    const term = (k?.term ?? "").trim();
    if (term.length < 3) continue;
    const key = term.toLowerCase();
    if (seenLower.has(key)) continue;
    seenLower.add(key);
    if (appearsIn(term)) found.push(term);
    else missing.push(term);
  }

  const filteredMissing = missing.filter(
    (term) =>
      term.length >= MISSING_KEYWORD_MIN_LENGTH && !MISSING_KEYWORDS_BLOCKLIST.has(term.toLowerCase())
  );

  return {
    foundInResume: found.slice(0, FOUND_KEYWORDS_CAP),
    missingKeywords: filteredMissing.slice(0, MISSING_KEYWORDS_CAP),
  };
}

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
  const {
    resume,
    jobDescription,
    sessionId,
    modelKey,
    userId,
    quickDraft = false,
    jobTitle: clientJobTitle,
    parentResumeId,
    customInstructions,
    keywordsToWeave,
    promptPresetIds,
  } = await req.json();

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

        const jobDescriptionForKeywords = trimJobDescriptionToRoleContent(
          cleanJobDescriptionUtil(jobDescription, { maxLength: 12000 })
        );
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
                  jobDescription: jobDescriptionForKeywords,
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

        const metricsGuidance = formatMetricsGuidance(metricsContext);
        const userInstructions = buildUserInstructions(
          Array.isArray(promptPresetIds) ? promptPresetIds : undefined,
          typeof customInstructions === "string" ? customInstructions.trim() : undefined
        );
        const userRequestedKeywords = Array.isArray(keywordsToWeave)
          ? keywordsToWeave.filter((k): k is string => typeof k === "string").slice(0, 30)
          : [];
        let tailoredResume: string | undefined;
        let improvementMetrics: {
          quantifiedBulletsAdded: number;
          atsKeywordsMatched: number;
          activeVoiceConversions: number;
          sectionsOptimized: number;
        } = {
          quantifiedBulletsAdded: 0,
          atsKeywordsMatched: 0,
          activeVoiceConversions: 0,
          sectionsOptimized: 0,
        };

        const experience = parsedResume?.experience ?? [];
        const useSectionBased =
          experience.length >= 1 &&
          !!parsedResume?.contactInfo &&
          !!parsedResume?.summary;

        if (useSectionBased) {
          streamClosed = !sendSSE(controller, "status", {
            stage: "generating",
            message: "Tailoring by section...",
            progress: 55,
          });
          if (streamClosed) return;
          try {
            const summaryPrompt = getSummaryTailoringPrompt({
              resume,
              jobDescription: cleanJobDescription,
              jobTitle: jobTitle ?? undefined,
              userInstructions: userInstructions || undefined,
              userRequestedKeywords: userRequestedKeywords.length > 0 ? userRequestedKeywords : undefined,
            });
            const summaryRes = await generateWithFallback(
              summaryPrompt,
              selectedModel,
              undefined,
              sessionApiKeys
            );
            const expPrompts = experience.map((exp: { title: string; company: string; dates: string | null; description: string }) =>
              getExperienceBulletsPrompt({
                jobTitle: exp.title,
                company: exp.company,
                dates: exp.dates,
                bulletsText: exp.description,
                jobDescription: cleanJobDescription,
                resumeContext: resume,
                userInstructions: userInstructions || undefined,
                userRequestedKeywords: userRequestedKeywords.length > 0 ? userRequestedKeywords : undefined,
              })
            );
            const expResults = await Promise.all(
              expPrompts.map((p: string) =>
                generateWithFallback(p, selectedModel, undefined, sessionApiKeys)
              )
            );
            const tailoredSummary = summaryRes.text.trim();
            const tailoredBulletsByJob = expResults.map((r: { text: string }) => r.text.trim());
            tailoredResume = reassembleResumeFromSections({
              parsed: parsedResume as Parameters<typeof reassembleResumeFromSections>[0]["parsed"],
              tailoredSummary,
              tailoredBulletsByJob,
              originalResume: resume,
            });
          } catch (sectionErr) {
            console.warn("[Stream] Section-based tailor failed, falling back to single-doc:", sectionErr);
          }
        }

        if (!tailoredResume) {
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
            userInstructions: userInstructions || undefined,
            userRequestedKeywords: userRequestedKeywords.length > 0 ? userRequestedKeywords : undefined,
          });
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

          const jsonData = parseJSONFromText<{
            tailoredResume?: string;
            improvementMetrics?: {
              quantifiedBulletsAdded?: number;
              atsKeywordsMatched?: number;
              activeVoiceConversions?: number;
              sectionsOptimized?: number;
            };
          }>(result.text);

          if (jsonData && jsonData.tailoredResume) {
            tailoredResume = jsonData.tailoredResume;
            improvementMetrics = {
              quantifiedBulletsAdded: jsonData.improvementMetrics?.quantifiedBulletsAdded ?? 0,
              atsKeywordsMatched: jsonData.improvementMetrics?.atsKeywordsMatched ?? 0,
              activeVoiceConversions: jsonData.improvementMetrics?.activeVoiceConversions ?? 0,
              sectionsOptimized: jsonData.improvementMetrics?.sectionsOptimized ?? 0,
            };
          } else {
            const extracted = extractTailoredResumeFromText(result.text);
            tailoredResume =
              extracted ??
              (result.text.includes("improvementMetrics") ? resume : result.text);
          }
        }

        streamClosed = !sendSSE(controller, "status", {
          stage: "processing",
          message: "Processing results...",
          progress: 80,
        });
        if (streamClosed) return;

        tailoredResume = sanitizeResumeForATS(tailoredResume ?? resume);
        tailoredResume = deduplicateResumeSections(tailoredResume);
        tailoredResume = rewriteParentheticalKeywords(tailoredResume);
        tailoredResume = validateOrFixEducationBlock(tailoredResume);
        tailoredResume = sanitizeContactBlock(tailoredResume, parsedResume);
        const contactFromOriginal = buildContactFromOriginal(resume, parsedResume);
        if (contactFromOriginal) {
          tailoredResume = replaceContactBlock(tailoredResume, contactFromOriginal);
          tailoredResume = sanitizeContactBlock(tailoredResume, parsedResume);
        }

        const keywordGap = computeKeywordGap(keywords, tailoredResume);

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
          let versionNumber = 1;
          let parentResumeIdVal: string | null = null;
          let rootResumeIdVal: string | null = null;
          let originalContent = resume;
          let jobDescriptionForInsert = cleanJobDescription;

          if (parentResumeId) {
            const { data: parentRow } = await supabaseAdmin
              .from('resumes')
              .select('id, version_number, root_resume_id, original_content, job_description')
              .eq('id', parentResumeId)
              .single();
            if (parentRow) {
              parentResumeIdVal = parentResumeId;
              versionNumber = (parentRow.version_number ?? 1) + 1;
              rootResumeIdVal = parentRow.root_resume_id ?? parentRow.id;
              originalContent = parentRow.original_content ?? resume;
              jobDescriptionForInsert = parentRow.job_description ?? cleanJobDescription;
            }
          }

          const insertData: any = {
            original_content: originalContent,
            tailored_content: tailoredResume,
            obfuscated_content: obfuscationResult.obfuscatedResume,
            content_map: obfuscationResult.contentMap,
            job_description: jobDescriptionForInsert,
            match_score: {
              before: beforeScore,
              after: afterScore,
              beforeMetrics: beforeMetrics ?? undefined,
              afterMetrics: afterMetrics ?? undefined,
              keywordGap,
            },
            improvement_metrics: improvementMetrics,
            free_reveal: obfuscationResult.freeReveal,
            job_title: (clientJobTitle?.trim() || companyResearch?.jobTitle) || null,
            company_name: (companyResearch?.companyName?.trim() && companyResearch.companyName !== "Unknown Company") ? companyResearch.companyName.trim() : null,
            parent_resume_id: parentResumeIdVal,
            version_number: versionNumber,
            root_resume_id: rootResumeIdVal,
          };

          if (sessionId) {
            insertData.session_id = sessionId;
          }
          if (userId) {
            insertData.user_id = userId;
          }

          const { data: resumeData, error: resumeError } = await supabaseAdmin
            .from('resumes')
            .insert(insertData)
            .select('id')
            .single();

          if (resumeError) {
            console.error("[Stream] Error storing resume:", resumeError);
          } else if (resumeData) {
            storedResumeId = resumeData.id;
            if (!parentResumeIdVal && !rootResumeIdVal) {
              await supabaseAdmin
                .from('resumes')
                .update({ root_resume_id: storedResumeId })
                .eq('id', storedResumeId);
            }
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
          keywordGap,
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

