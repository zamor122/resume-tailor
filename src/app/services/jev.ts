// src/app/services/jev.ts
import { TypeSafeClient, choice, score, noul } from '@typesafe-ai/sdk';
import { traceHub } from '@/app/services/observability/traceHub';

export interface JevDiagnosticResult {
  matchedSkills: string[];
  missingSkills: string[];
  seniorityScore: number;
  enhancementFocus: 'elevate_ownership' | 'clarify_outcomes' | 'highlight_transferable_competencies' | 'showcase_scale';
  confidence: number;
}

export interface JevJudgeResult {
  isAuthentic: boolean;
  contentMatchScore: number;
  toneOfVoiceRating: 'strong_authentic' | 'neutral' | 'buzzword_heavy';
  isBetterThanOriginal: boolean;
  overallImpactScore: number;
  scoreDeltaPercent: number;
}

export interface JevAlignmentScoreResult {
  matchScore: number;
  confidence: number;
}

const DEFAULT_JEV_BASE_URL = 'https://api.typesafe.ai';
const JEV_TIMEOUT_MS = 1500;

function generateSpanId(prefix: string = "jev"): string {
  return `span-${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

function getJevBaseUrl(): string {
  const url = process.env.TYPESAFE_API_URL || process.env.TYPESAFE_BASE_URL;
  if (url && url !== 'undefined') {
    return url.replace(/\/v1\/systemone\/?$/, '');
  }
  return DEFAULT_JEV_BASE_URL;
}

function createClient(apiKey: string): TypeSafeClient {
  return new TypeSafeClient({
    apiKey,
    baseURL: getJevBaseUrl(),
    timeout: JEV_TIMEOUT_MS,
    retry: { maxRetries: 0 },
    dangerouslyAllowBrowser: true,
  });
}

/**
 * Diagnoses a work experience chunk against the job description using Jev.
 */
export async function diagnoseChunkWithJev(
  chunk: { title?: string; company?: string; bulletsText: string },
  jobDescription: string,
  targetTitle?: string,
  apiKey?: string,
  traceId?: string
): Promise<JevDiagnosticResult> {
  const startTime = performance.now();
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      console.log(`[Trace:${traceId || "untraced"}:jev:diagnoseChunk] calling TypeSafe AI System 1...`);
      const client = createClient(key);
      const { data: response, requestId } = await client.systemOne({
        state: {
          roleTitle: chunk.title || '',
          company: chunk.company || '',
          bullets: chunk.bulletsText,
          targetTitle: targetTitle || '',
          jobDescriptionSnippet: jobDescription.slice(0, 1500),
        },
        questions: {
          seniorityScore: score("Rate how closely this role matches the target seniority level:", [
            "No match / entry level task work",
            "Junior independent contributor",
            "Mid-level autonomous delivery",
            "Senior technical ownership and leadership",
            "Principal or executive level scope",
          ]),
          enhancementFocus: choice("What should be the primary enhancement focus when tailoring this role?", {
            elevate_ownership: "Emphasize technical ownership and leadership",
            clarify_outcomes: "Clarify tangible business outcomes and impact",
            highlight_transferable_competencies: "Highlight transferable competencies",
            showcase_scale: "Showcase operational scale and complexity",
          }),
        },
      }).withResponse();

      const seniority = Math.round(Number(response.answers.seniorityScore?.score) + 1) || 3;
      const focus = (response.answers.enhancementFocus?.choice as any) || 'elevate_ownership';
      const confidence = Number(response.answers.enhancementFocus?.confidence) || 0.9;
      const latencyMs = Math.round(performance.now() - startTime);

      console.log(`[Trace:${traceId || "untraced"}:jev:diagnoseChunk] succeeded in ${latencyMs}ms:`, {
        requestId,
        model: response.model,
        tokens: response.usage,
        seniorityScore: seniority,
        enhancementFocus: focus,
      });

      if (traceId) {
        traceHub.recordSpan(traceId, {
          id: generateSpanId("diag"),
          type: "jev",
          name: "diagnoseChunkWithJev",
          timestamp: new Date().toISOString(),
          durationMs: latencyMs,
          data: {
            operation: "diagnoseChunk",
            target: chunk.title ? `${chunk.title} (${chunk.company || "unknown"})` : "work_experience_chunk",
            mode: "live_api",
            latencyMs,
            requestId,
            model: response.model,
            tokens: response.usage ? {
              prompt: response.usage.input_tokens ?? (response.usage as any).prompt_tokens,
              completion: response.usage.output_tokens ?? (response.usage as any).completion_tokens,
              total: (response.usage.input_tokens !== undefined && response.usage.output_tokens !== undefined)
                ? response.usage.input_tokens + response.usage.output_tokens
                : (response.usage as any).total_tokens,
            } : undefined,
            scores: {
              overallImpactScore: seniority,
            },
            verdict: "accepted",
          },
        });
      }

      return {
        matchedSkills: [],
        missingSkills: [],
        seniorityScore: Math.min(5, Math.max(1, seniority)),
        enhancementFocus: focus,
        confidence,
      };
    } catch (err) {
      console.warn(`[Trace:${traceId || "untraced"}:jev:diagnoseChunk] API call failed, using graceful fallback:`, err);
    }
  } else {
    console.log(`[Trace:${traceId || "untraced"}:jev:diagnoseChunk] No TYPESAFE_API_KEY provided or configured, using local fallback`);
  }

  // Graceful deterministic fallback
  const isSenior = /senior|lead|head|principal|director/i.test(targetTitle || '') || /senior|lead/i.test(chunk.title || '');
  const latencyMs = Math.round(performance.now() - startTime);

  if (traceId) {
    traceHub.recordSpan(traceId, {
      id: generateSpanId("diag"),
      type: "jev",
      name: "diagnoseChunkWithJev",
      timestamp: new Date().toISOString(),
      durationMs: latencyMs,
      data: {
        operation: "diagnoseChunk",
        target: chunk.title ? `${chunk.title} (${chunk.company || "unknown"})` : "work_experience_chunk",
        mode: "local_fallback",
        latencyMs,
        scores: {
          overallImpactScore: isSenior ? 4 : 3,
        },
        verdict: "accepted",
      },
    });
  }

  return {
    matchedSkills: [],
    missingSkills: [],
    seniorityScore: isSenior ? 4 : 3,
    enhancementFocus: isSenior ? 'elevate_ownership' : 'clarify_outcomes',
    confidence: 0.8,
  };
}

/**
 * Evaluates a rewritten suggestion against the original text using Jev as a judge.
 */
export async function judgeSuggestionWithJev(
  originalText: string,
  suggestedText: string,
  jobDescription: string,
  apiKey?: string,
  traceId?: string
): Promise<JevJudgeResult> {
  const startTime = performance.now();
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      console.log(`[Trace:${traceId || "untraced"}:jev:judgeSuggestion] evaluating suggestion with TypeSafe AI...`);
      const client = createClient(key);
      const { data: response, requestId } = await client.systemOne({
        state: {
          originalText,
          suggestedText,
          jobDescriptionSnippet: jobDescription.slice(0, 1000),
        },
        questions: {
          isAuthentic: noul("Does this suggestion preserve truthful scope without fabricating unbacked numbers, false percentages, or unverified claims?"),
          isBetterThanOriginal: noul("Is this suggestion substantively more impactful and better aligned to the role than the original text?"),
          overallImpactScore: score("Rate the overall professional impact of this rewrite:", [
            "Worse or destructive edit",
            "Trivial or cosmetic change",
            "Minor polish with slight improvement",
            "Strong improvement with clear impact",
            "Exceptional accomplishment framing",
          ]),
          toneOfVoiceRating: choice("Evaluate the tone of voice of this suggested rewrite:", {
            strong_authentic: "Authoritative and authentic",
            neutral: "Standard phrasing",
            buzzword_heavy: "Excessive buzzwords",
          }),
        },
      }).withResponse();

      const authNoul = Number(response.answers.isAuthentic?.noul);
      const isAuthentic = Number.isFinite(authNoul) ? authNoul >= 0.35 : true;

      const betterNoul = Number(response.answers.isBetterThanOriginal?.noul);
      const isBetterThanOriginal = Number.isFinite(betterNoul) ? betterNoul >= 0.25 : true;

      const rawImpact = Number(response.answers.overallImpactScore?.score);
      const overallImpactScore = Number.isFinite(rawImpact) ? Math.min(5, Math.max(1, Math.round(rawImpact + 1))) : 4;

      const tone = (response.answers.toneOfVoiceRating?.choice as any) || 'strong_authentic';
      const scoreDeltaPercent = Math.round((betterNoul || 0.8) * 30);
      const latencyMs = Math.round(performance.now() - startTime);

      let verdict: "accepted" | "rejected" = "accepted";
      let rejectionReason: string | undefined = undefined;

      if (!isAuthentic) {
        verdict = "rejected";
        rejectionReason = "Rejected: suspected hallucination or lack of authenticity (isAuthentic=false)";
      } else if (!isBetterThanOriginal) {
        verdict = "rejected";
        rejectionReason = "Rejected: suggestion not better than original (isBetterThanOriginal=false)";
      }

      console.log(`[Trace:${traceId || "untraced"}:jev:judgeSuggestion] succeeded in ${latencyMs}ms:`, {
        requestId,
        model: response.model,
        tokens: response.usage,
        verdict,
        rejectionReason,
        authNoul,
        isAuthentic,
        betterNoul,
        isBetterThanOriginal,
        overallImpactScore,
        tone,
      });

      if (traceId) {
        traceHub.recordSpan(traceId, {
          id: generateSpanId("judge"),
          type: "jev",
          name: "judgeSuggestionWithJev",
          timestamp: new Date().toISOString(),
          durationMs: latencyMs,
          data: {
            operation: "judgeSuggestion",
            target: suggestedText.slice(0, 60),
            mode: "live_api",
            latencyMs,
            requestId,
            model: response.model,
            tokens: response.usage ? {
              prompt: response.usage.input_tokens ?? (response.usage as any).prompt_tokens,
              completion: response.usage.output_tokens ?? (response.usage as any).completion_tokens,
              total: (response.usage.input_tokens !== undefined && response.usage.output_tokens !== undefined)
                ? response.usage.input_tokens + response.usage.output_tokens
                : (response.usage as any).total_tokens,
            } : undefined,
            scores: {
              isAuthentic,
              isBetterThanOriginal,
              overallImpactScore,
              toneOfVoiceRating: tone,
              scoreDeltaPercent: Math.max(10, scoreDeltaPercent),
            },
            verdict,
            rejectionReason,
          },
        });
      }

      return {
        isAuthentic,
        contentMatchScore: overallImpactScore,
        toneOfVoiceRating: tone,
        isBetterThanOriginal,
        overallImpactScore,
        scoreDeltaPercent: Math.max(10, scoreDeltaPercent),
      };
    } catch (err) {
      console.warn(`[Trace:${traceId || "untraced"}:jev:judgeSuggestion] call failed, using graceful fallback:`, err);
    }
  } else {
    console.log(`[Trace:${traceId || "untraced"}:jev:judgeSuggestion] No TYPESAFE_API_KEY provided or configured, using local fallback`);
  }

  // Graceful deterministic fallback
  const cleanOrig = originalText.trim();
  const cleanSugg = suggestedText.trim();
  const isBetter = cleanSugg.length > 10 && cleanSugg !== cleanOrig;
  const verdict: "accepted" | "rejected" = isBetter ? "accepted" : "rejected";
  const rejectionReason = isBetter ? undefined : "Rejected: suggestion is identical or too short";
  const latencyMs = Math.round(performance.now() - startTime);

  if (traceId) {
    traceHub.recordSpan(traceId, {
      id: generateSpanId("judge"),
      type: "jev",
      name: "judgeSuggestionWithJev",
      timestamp: new Date().toISOString(),
      durationMs: latencyMs,
      data: {
        operation: "judgeSuggestion",
        target: suggestedText.slice(0, 60),
        mode: "local_fallback",
        latencyMs,
        scores: {
          isAuthentic: true,
          isBetterThanOriginal: isBetter,
          overallImpactScore: 4,
          toneOfVoiceRating: 'strong_authentic',
          scoreDeltaPercent: 20,
        },
        verdict,
        rejectionReason,
      },
    });
  }

  return {
    isAuthentic: true,
    contentMatchScore: 4,
    toneOfVoiceRating: 'strong_authentic',
    isBetterThanOriginal: isBetter,
    overallImpactScore: 4,
    scoreDeltaPercent: 20,
  };
}

/**
 * Computes semantic resume-to-JD alignment score using Jev.
 */
export async function evaluateResumeAlignmentWithJev(
  resumeText: string,
  jobDescription: string,
  apiKey?: string,
  traceId?: string
): Promise<JevAlignmentScoreResult> {
  const startTime = performance.now();
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      console.log(`[Trace:${traceId || "untraced"}:jev:evaluateAlignment] evaluating alignment with TypeSafe AI...`);
      const client = createClient(key);
      const { data: response, requestId } = await client.systemOne({
        state: {
          resumeSnippet: resumeText.slice(0, 3000),
          jobDescriptionSnippet: jobDescription.slice(0, 2000),
        },
        questions: {
          matchScore: score("Rate the candidate's qualification alignment for this job on a 0-4 scale:", [
            "Unqualified / completely disjoint domain",
            "Marginal match with major capability gaps",
            "Moderate match meeting baseline requirements",
            "Strong match with direct relevant experience",
            "Exceptional top-tier candidate alignment",
          ]),
        },
      }).withResponse();

      const rawScore = Number(response.answers.matchScore?.score);
      const confidence = Number(response.answers.matchScore?.confidence) || 0.85;
      const matchScore = Number.isFinite(rawScore)
        ? Math.min(98, Math.max(20, Math.round((rawScore / 4) * 100)))
        : 60;
      const latencyMs = Math.round(performance.now() - startTime);

      console.log(`[Trace:${traceId || "untraced"}:jev:evaluateAlignment] succeeded in ${latencyMs}ms:`, {
        requestId,
        model: response.model,
        tokens: response.usage,
        matchScore,
        confidence,
      });

      if (traceId) {
        traceHub.recordSpan(traceId, {
          id: generateSpanId("align"),
          type: "jev",
          name: "evaluateResumeAlignmentWithJev",
          timestamp: new Date().toISOString(),
          durationMs: latencyMs,
          data: {
            operation: "evaluateAlignment",
            target: "resume-alignment",
            mode: "live_api",
            latencyMs,
            requestId,
            model: response.model,
            tokens: response.usage ? {
              prompt: response.usage.input_tokens ?? (response.usage as any).prompt_tokens,
              completion: response.usage.output_tokens ?? (response.usage as any).completion_tokens,
              total: (response.usage.input_tokens !== undefined && response.usage.output_tokens !== undefined)
                ? response.usage.input_tokens + response.usage.output_tokens
                : (response.usage as any).total_tokens,
            } : undefined,
            scores: {
              overallImpactScore: matchScore,
            },
            verdict: "accepted",
          },
        });
      }

      return { matchScore, confidence };
    } catch (err) {
      console.warn(`[Trace:${traceId || "untraced"}:jev:evaluateAlignment] failed, using fallback:`, err);
    }
  } else {
    console.log(`[Trace:${traceId || "untraced"}:jev:evaluateAlignment] No TYPESAFE_API_KEY provided or configured, using local fallback`);
  }

  // Deterministic token overlap fallback
  const wordsJD = new Set(jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const wordsResume = new Set(resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  let scoreVal = 60;
  let confVal = 0.5;

  if (wordsJD.size > 0) {
    let matchCount = 0;
    wordsJD.forEach((w) => {
      if (wordsResume.has(w)) matchCount++;
    });
    const ratio = matchCount / Math.min(wordsJD.size, 50);
    scoreVal = Math.min(95, Math.max(40, Math.round(ratio * 100)));
    confVal = 0.7;
  }

  const latencyMs = Math.round(performance.now() - startTime);

  if (traceId) {
    traceHub.recordSpan(traceId, {
      id: generateSpanId("align"),
      type: "jev",
      name: "evaluateResumeAlignmentWithJev",
      timestamp: new Date().toISOString(),
      durationMs: latencyMs,
      data: {
        operation: "evaluateAlignment",
        target: "resume-alignment",
        mode: "local_fallback",
        latencyMs,
        scores: {
          overallImpactScore: scoreVal,
        },
        verdict: "accepted",
      },
    });
  }

  return { matchScore: scoreVal, confidence: confVal };
}
