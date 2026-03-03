/**
 * Shared types and normalizer for LLM keyword extraction.
 * Used by keyword-extractor MCP tool and keyword-analyzer.
 */

import { cleanJobDescription as cleanJobDescriptionUtil } from "@/app/utils/jobDescriptionCleaner";

/** Ideal candidate profile extracted from the JD (field-agnostic); used for validation and tailoring tone. */
export interface IdealCandidateProfile {
  responsibilities?: string[];
  mustHaves?: string[];
  preferred?: string[];
  experienceLevel?: string;
  coreCompetencies?: string[];
}

export interface KeywordResult {
  criticalKeywords?: string[];
  /** Optional; from enhanced extractor. Never shown in UI; used for tailoring tone only. */
  idealCandidateProfile?: IdealCandidateProfile;
  /** Optional; terms/concepts to avoid in resume. Never shown in UI; passed only to tailoring prompt. */
  avoidTerms?: string[];
  keywords: {
    technical: Array<{
      term: string;
      importance: "critical" | "high" | "medium" | "low";
      importanceScore: number;
      frequency: number;
      synonyms: string[];
      recommendedSections: string[];
    }>;
    soft: Array<{
      term: string;
      importance: "critical" | "high" | "medium" | "low";
      importanceScore: number;
      frequency: number;
    }>;
    industry: Array<{
      term: string;
      importance: "critical" | "high" | "medium" | "low";
      frequency: number;
    }>;
    certifications: Array<{
      term: string;
      importance: "critical" | "high" | "medium" | "low";
      frequency: number;
    }>;
    actionVerbs: Array<{
      term: string;
      frequency: number;
    }>;
    powerWords: Array<{
      term: string;
      frequency: number;
    }>;
  };
  keywordDensity: {
    totalKeywords: number;
    criticalKeywords: number;
    averageFrequency: number;
    mostFrequent: Array<{ keyword: string; count: number }>;
  };
}

/** Result of JD interpreter: KeywordResult plus cleaned JD and inferred job title. */
export interface JDInterpreterResult extends KeywordResult {
  cleanedJobDescription: string;
  jobTitle?: string;
}

const CLEANED_JD_MAX_LENGTH = 8000;

/**
 * Normalize raw LLM output from the JD interpreter (cleaned JD + keywords).
 * If cleanedJobDescription is missing or empty, falls back to cleanJobDescriptionUtil(original, 8000).
 * Caps cleanedJobDescription at CLEANED_JD_MAX_LENGTH.
 */
export function normalizeJDInterpreterResponse(
  raw: unknown,
  originalJobDescription: string
): JDInterpreterResult {
  const base = normalizeKeywordResponse(raw);
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  let cleanedJobDescription = typeof o.cleanedJobDescription === "string" ? o.cleanedJobDescription.trim() : "";
  if (!cleanedJobDescription) {
    cleanedJobDescription = cleanJobDescriptionUtil(originalJobDescription, { maxLength: CLEANED_JD_MAX_LENGTH });
  }
  if (cleanedJobDescription.length > CLEANED_JD_MAX_LENGTH) {
    cleanedJobDescription = cleanedJobDescription.substring(0, CLEANED_JD_MAX_LENGTH) + "...";
  }
  const jobTitle = typeof o.jobTitle === "string" ? o.jobTitle.trim() || undefined : undefined;
  // #region agent log
  const ROLE_NOT_FOUND = "Role description not found in the provided text.";
  fetch('http://127.0.0.1:7244/ingest/99fdcdcf-6af5-4738-8645-d0c7076b1a2a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'keyword-extraction.ts:normalizeJDInterpreterResponse',message:'cleanedJobDescription from interpreter',data:{len:cleanedJobDescription.length,isSentinel:cleanedJobDescription===ROLE_NOT_FOUND},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return {
    ...base,
    cleanedJobDescription,
    ...(jobTitle ? { jobTitle } : {}),
  };
}

const EMPTY_KEYWORDS: KeywordResult["keywords"] = {
  technical: [],
  soft: [],
  industry: [],
  certifications: [],
  actionVerbs: [],
  powerWords: [],
};

const EMPTY_DENSITY: KeywordResult["keywordDensity"] = {
  totalKeywords: 0,
  criticalKeywords: 0,
  averageFrequency: 0,
  mostFrequent: [],
};

function ensureImportance(
  s: unknown
): "critical" | "high" | "medium" | "low" {
  const v = String(s || "medium").toLowerCase();
  if (["critical", "high", "medium", "low"].includes(v)) {
    return v as "critical" | "high" | "medium" | "low";
  }
  return "medium";
}

function ensureNumber(n: unknown, def: number): number {
  if (typeof n === "number" && !Number.isNaN(n)) return Math.max(0, n);
  const parsed = Number(n);
  return Number.isNaN(parsed) ? def : Math.max(0, parsed);
}

function ensureString(s: unknown): string {
  return typeof s === "string" && s.trim() ? s.trim() : "";
}

function normalizeTechnical(arr: unknown[]): KeywordResult["keywords"]["technical"] {
  return arr
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      term: ensureString(x.term) || ensureString(x.keyword),
      importance: ensureImportance(x.importance),
      importanceScore: ensureNumber(x.importanceScore, 70),
      frequency: ensureNumber(x.frequency, 1),
      synonyms: Array.isArray(x.synonyms)
        ? x.synonyms.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      recommendedSections: Array.isArray(x.recommendedSections)
        ? x.recommendedSections.map((s: unknown) => String(s).trim()).filter(Boolean)
        : ["Skills", "Experience", "Projects"],
    }))
    .filter((x) => x.term.length > 0);
}

function normalizeSoft(arr: unknown[]): KeywordResult["keywords"]["soft"] {
  return arr
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      term: ensureString(x.term) || ensureString(x.keyword),
      importance: ensureImportance(x.importance),
      importanceScore: ensureNumber(x.importanceScore, 60),
      frequency: ensureNumber(x.frequency, 1),
    }))
    .filter((x) => x.term.length > 0);
}

function normalizeIndustry(arr: unknown[]): KeywordResult["keywords"]["industry"] {
  return arr
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      term: ensureString(x.term) || ensureString(x.keyword),
      importance: ensureImportance(x.importance),
      frequency: ensureNumber(x.frequency, 1),
    }))
    .filter((x) => x.term.length > 0);
}

function normalizeCertifications(
  arr: unknown[]
): KeywordResult["keywords"]["certifications"] {
  return arr
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      term: ensureString(x.term) || ensureString(x.keyword),
      importance: ensureImportance(x.importance),
      frequency: ensureNumber(x.frequency, 1),
    }))
    .filter((x) => x.term.length > 0);
}

function normalizeActionVerbs(
  arr: unknown[]
): KeywordResult["keywords"]["actionVerbs"] {
  return arr
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      term: ensureString(x.term) || ensureString(x.keyword),
      frequency: ensureNumber(x.frequency, 1),
    }))
    .filter((x) => x.term.length > 0);
}

function normalizePowerWords(
  arr: unknown[]
): KeywordResult["keywords"]["powerWords"] {
  return arr
    .filter((x) => x && typeof x === "object")
    .map((x: any) => ({
      term: ensureString(x.term) || ensureString(x.keyword),
      frequency: ensureNumber(x.frequency, 1),
    }))
    .filter((x) => x.term.length > 0);
}

/**
 * Normalize raw LLM output to canonical KeywordResult shape.
 */
export function normalizeKeywordResponse(raw: unknown): KeywordResult {
  if (!raw || typeof raw !== "object") {
    return {
      criticalKeywords: [],
      keywords: { ...EMPTY_KEYWORDS },
      keywordDensity: { ...EMPTY_DENSITY },
    };
  }

  const o = raw as Record<string, unknown>;
  const kw = o.keywords && typeof o.keywords === "object" ? (o.keywords as Record<string, unknown>) : {};
  const density = o.keywordDensity && typeof o.keywordDensity === "object"
    ? (o.keywordDensity as Record<string, unknown>)
    : {};

  const technical = normalizeTechnical(Array.isArray(kw.technical) ? kw.technical : []);
  const soft = normalizeSoft(Array.isArray(kw.soft) ? kw.soft : []);
  const industry = normalizeIndustry(Array.isArray(kw.industry) ? kw.industry : []);
  const certifications = normalizeCertifications(Array.isArray(kw.certifications) ? kw.certifications : []);
  const actionVerbs = normalizeActionVerbs(Array.isArray(kw.actionVerbs) ? kw.actionVerbs : []);
  const powerWords = normalizePowerWords(Array.isArray(kw.powerWords) ? kw.powerWords : []);

  const allKeywords = [...technical, ...soft, ...industry, ...certifications];
  const criticalCount = allKeywords.filter(
    (k) => k.importance === "critical" || k.importance === "high"
  ).length;
  const totalFreq = allKeywords.reduce((sum, k) => sum + (k.frequency ?? 1), 0);

  let criticalKeywords: string[] = [];
  if (Array.isArray(o.validatedCriticalKeywords) && o.validatedCriticalKeywords.length > 0) {
    criticalKeywords = (o.validatedCriticalKeywords as unknown[])
      .map((s: unknown) => String(s).trim())
      .filter(Boolean);
  }
  if (criticalKeywords.length === 0 && Array.isArray(o.criticalKeywords)) {
    criticalKeywords = o.criticalKeywords
      .map((s: unknown) => String(s).trim())
      .filter(Boolean);
  }
  if (criticalKeywords.length === 0) {
    criticalKeywords = [
      ...technical.filter((k) => k.importance === "critical" || k.importance === "high").map((k) => k.term),
      ...industry.filter((k) => k.importance === "critical" || k.importance === "high").map((k) => k.term),
    ];
    criticalKeywords = [...new Set(criticalKeywords)];
  }

  let idealCandidateProfile: IdealCandidateProfile | undefined;
  if (o.idealCandidateProfile && typeof o.idealCandidateProfile === "object") {
    const p = o.idealCandidateProfile as Record<string, unknown>;
    idealCandidateProfile = {
      responsibilities: Array.isArray(p.responsibilities) ? p.responsibilities.map((s: unknown) => String(s).trim()).filter(Boolean) : [],
      mustHaves: Array.isArray(p.mustHaves) ? p.mustHaves.map((s: unknown) => String(s).trim()).filter(Boolean) : [],
      preferred: Array.isArray(p.preferred) ? p.preferred.map((s: unknown) => String(s).trim()).filter(Boolean) : [],
      experienceLevel: typeof p.experienceLevel === "string" ? p.experienceLevel.trim() : undefined,
      coreCompetencies: Array.isArray(p.coreCompetencies) ? p.coreCompetencies.map((s: unknown) => String(s).trim()).filter(Boolean) : [],
    };
  }

  let avoidTerms: string[] = [];
  if (Array.isArray(o.avoidTerms)) {
    avoidTerms = [...new Set((o.avoidTerms as unknown[]).map((s: unknown) => String(s).trim()).filter(Boolean))];
  }

  const mostFrequent = Array.isArray(density.mostFrequent)
    ? density.mostFrequent
        .filter((x: any) => x && typeof x === "object")
        .map((x: any) => ({
          keyword: ensureString(x.keyword) || ensureString(x.term),
          count: ensureNumber(x.count, ensureNumber(x.frequency, 1)),
        }))
        .filter((x) => x.keyword.length > 0)
        .slice(0, 10)
    : allKeywords
        .sort((a, b) => (b.frequency ?? 0) - (a.frequency ?? 0))
        .slice(0, 10)
        .map((k) => ({ keyword: k.term, count: k.frequency ?? 1 }));

  return {
    criticalKeywords,
    ...(idealCandidateProfile ? { idealCandidateProfile } : {}),
    ...(avoidTerms.length > 0 ? { avoidTerms } : {}),
    keywords: {
      technical,
      soft,
      industry,
      certifications,
      actionVerbs,
      powerWords,
    },
    keywordDensity: {
      totalKeywords: ensureNumber(density.totalKeywords, allKeywords.length),
      criticalKeywords: ensureNumber(density.criticalKeywords, criticalCount),
      averageFrequency:
        allKeywords.length > 0 ? totalFreq / allKeywords.length : 0,
      mostFrequent,
    },
  };
}

/** Common English stopwords and application/EEO/benefits vocabulary (excluded from frequency-based keyword extraction). */
const STOPWORDS = new Set([
  "the", "and", "or", "but", "for", "with", "from", "that", "this", "these", "those",
  "have", "has", "had", "will", "would", "could", "should", "may", "might", "must",
  "can", "been", "being", "into", "through", "during", "before", "after", "above",
  "below", "between", "under", "again", "further", "then", "once", "here", "there",
  "when", "where", "why", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "only", "own", "same", "than", "too", "very",
  "just", "also", "now", "about", "what", "which", "who", "whom", "their", "them",
  "remote", "people", "opportunity", "benefits", "life",
  "your", "select", "role", "roles", "form", "required", "requires", "self", "duty",
  "external", "internal", "applicant", "candidate", "employment", "equal", "veteran",
  "veterans", "military", "disability", "disorder", "health", "compensation", "confidential",
  "voluntary", "identification", "protected", "government", "federal", "industries",
  "environments", "clearance",
  "defense", "technology", "innovative", "transform", "changing", "bring", "allied",
  "capabilities", "mission", "industry", "advanced",
  "experience", "design", "building", "team", "including", "strong", "technical",
]);

/**
 * Zero-hardcoding fallback: extract keywords by frequency (4+ chars, 2+ occurrences).
 */
export function extractKeywordsFrequencyBased(jobDescription: string): KeywordResult {
  const lower = jobDescription.toLowerCase();
  const words = lower.match(/\b\w{4,}\b/g) || [];
  const freq = new Map<string, number>();
  words.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1));

  const terms = [...freq.entries()]
    .filter(([word]) => !STOPWORDS.has(word))
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  const technical = terms.map(([term, count], i) => ({
    term,
    importance: (i < 10 ? "high" : "medium") as "critical" | "high" | "medium" | "low",
    importanceScore: i < 10 ? 80 : 60,
    frequency: count,
    synonyms: [],
    recommendedSections: ["Skills", "Experience", "Projects"],
  }));

  const criticalKeywords = terms.slice(0, 15).map(([t]) => t.toLowerCase());
  const totalFreq = technical.reduce((s, k) => s + k.frequency, 0);

  return {
    criticalKeywords,
    idealCandidateProfile: undefined,
    avoidTerms: [],
    keywords: {
      technical,
      soft: [],
      industry: [],
      certifications: [],
      actionVerbs: [],
      powerWords: [],
    },
    keywordDensity: {
      totalKeywords: technical.length,
      criticalKeywords: Math.min(15, technical.length),
      averageFrequency: technical.length > 0 ? totalFreq / technical.length : 0,
      mostFrequent: technical.slice(0, 10).map((k) => ({ keyword: k.term, count: k.frequency })),
    },
  };
}
