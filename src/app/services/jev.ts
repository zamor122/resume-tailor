// src/app/services/jev.ts

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

const DEFAULT_JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';
const JEV_TIMEOUT_MS = 1200;

function getJevApiUrl(): string {
  const url = process.env.TYPESAFE_API_URL;
  return url && url !== 'undefined' ? url : DEFAULT_JEV_API_URL;
}

async function postJevWithTimeout(endpoint: string, payload: any, apiKey: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), JEV_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Jev API returned HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Diagnoses a work experience chunk against the job description using Jev.
 */
export async function diagnoseChunkWithJev(
  chunk: { title?: string; company?: string; bulletsText: string },
  jobDescription: string,
  targetTitle?: string,
  apiKey?: string
): Promise<JevDiagnosticResult> {
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      const payload = {
        state: {
          roleTitle: chunk.title || '',
          company: chunk.company || '',
          bullets: chunk.bulletsText,
          targetTitle: targetTitle || '',
          jobDescriptionSnippet: jobDescription.slice(0, 1500),
        },
        task: 'diagnose_experience_chunk',
        questions: {
          seniorityScore: { type: 'score', range: [1, 5] },
          enhancementFocus: {
            type: 'choice',
            options: ['elevate_ownership', 'clarify_outcomes', 'highlight_transferable_competencies', 'showcase_scale'],
          },
        },
      };
      const response = await postJevWithTimeout(getJevApiUrl(), payload, key);
      return {
        matchedSkills: response.matchedSkills || [],
        missingSkills: response.missingSkills || [],
        seniorityScore: Number(response.seniorityScore) || 3,
        enhancementFocus: response.enhancementFocus || 'elevate_ownership',
        confidence: response.confidence || 0.9,
      };
    } catch (err) {
      console.warn('[jev] diagnoseChunkWithJev API call failed, using graceful fallback:', err);
    }
  }

  // Graceful deterministic fallback
  const isSenior = /senior|lead|head|principal|director/i.test(targetTitle || '') || /senior|lead/i.test(chunk.title || '');

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
  apiKey?: string
): Promise<JevJudgeResult> {
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      const payload = {
        state: {
          originalText,
          suggestedText,
          jobDescriptionSnippet: jobDescription.slice(0, 1000),
        },
        task: 'judge_suggestion_quality',
        questions: {
          isAuthentic: { type: 'noul' },
          isBetterThanOriginal: { type: 'noul' },
          overallImpactScore: { type: 'score', range: [1, 5] },
          toneOfVoiceRating: {
            type: 'choice',
            options: ['strong_authentic', 'neutral', 'buzzword_heavy'],
          },
        },
      };
      const response = await postJevWithTimeout(getJevApiUrl(), payload, key);
        const parsedContentMatch = Number(response.contentMatchScore);
        const parsedImpact = Number(response.overallImpactScore);
        const parsedDelta = Number(response.scoreDeltaPercent);
        return {
          isAuthentic: response.isAuthentic !== false,
          contentMatchScore: Number.isFinite(parsedContentMatch) ? parsedContentMatch : 4,
          toneOfVoiceRating: response.toneOfVoiceRating || 'strong_authentic',
          isBetterThanOriginal: response.isBetterThanOriginal !== false,
          overallImpactScore: Number.isFinite(parsedImpact) ? parsedImpact : 4,
          scoreDeltaPercent: Number.isFinite(parsedDelta) ? parsedDelta : 25,
        };
    } catch (err) {
      console.warn('[jev] judgeSuggestionWithJev call failed, using graceful fallback:', err);
    }
  }

  // Graceful deterministic fallback
  const cleanOrig = originalText.trim();
  const cleanSugg = suggestedText.trim();
  const isBetter = cleanSugg.length > 10 && cleanSugg !== cleanOrig;

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
  apiKey?: string
): Promise<JevAlignmentScoreResult> {
  const key = apiKey || process.env.TYPESAFE_API_KEY;

  if (key) {
    try {
      const payload = {
        state: {
          resumeSnippet: resumeText.slice(0, 3000),
          jobDescriptionSnippet: jobDescription.slice(0, 2000),
        },
        task: 'evaluate_overall_alignment',
        questions: {
          matchScore: { type: 'score', range: [0, 100] },
        },
      };
      const response = await postJevWithTimeout(getJevApiUrl(), payload, key);
      const parsedMatch = Number(response.matchScore);
      return {
        matchScore: Number.isFinite(parsedMatch) ? Math.min(100, Math.max(0, parsedMatch)) : 60,
        confidence: Number(response.confidence) || 0.9,
      };
    } catch (err) {
      console.warn('[jev] evaluateResumeAlignmentWithJev failed, using fallback:', err);
    }
  }

  // Deterministic token overlap fallback
  const wordsJD = new Set(jobDescription.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  const wordsResume = new Set(resumeText.toLowerCase().match(/\b[a-z]{4,}\b/g) || []);
  if (wordsJD.size === 0) return { matchScore: 60, confidence: 0.5 };

  let matchCount = 0;
  wordsJD.forEach((w) => {
    if (wordsResume.has(w)) matchCount++;
  });
  const ratio = matchCount / Math.min(wordsJD.size, 50);
  const score = Math.min(95, Math.max(40, Math.round(ratio * 100)));

  return { matchScore: score, confidence: 0.7 };
}
