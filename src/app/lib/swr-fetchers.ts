import type { KeywordGapSnapshot } from "@/app/types/humanize";

/**
 * SWR fetchers and key helpers for resume and job-title data.
 * Keys must include user identity for user-scoped data; do not run fetchers when auth is not ready.
 */

export interface ResumeRetrieveResponse {
  success: boolean;
  originalResume?: string;
  tailoredResume?: string;
  obfuscatedResume?: string;
  contentMap?: Record<string, string> | null;
  jobDescription?: string;
  jobTitle?: string | null;
  matchScore?: number;
  metrics?: unknown;
  keywordGap?: KeywordGapSnapshot;
  improvementMetrics?: Record<string, unknown>;
  freeReveal?: { section: string; originalText: string; improvedText: string } | null;
  resumeId?: string;
  isUnlocked?: boolean;
  accessInfo?: unknown;
  appliedWithResume?: boolean | null;
  feedbackComment?: string | null;
}

/** POST /api/resume/retrieve. Call only when resumeId and auth (userId + accessToken) are available. */
export async function fetchResumeById(
  resumeId: string,
  userId: string | undefined,
  accessToken: string | undefined
): Promise<ResumeRetrieveResponse> {
  const res = await fetch("/api/resume/retrieve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeId,
      userId: userId ?? undefined,
      accessToken: accessToken ?? undefined,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(
      typeof json?.error === "string" ? json.error : json?.message ?? "Failed to load resume"
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (!json.success) {
    throw new Error("Failed to load resume");
  }
  return json;
}

export interface ResumeListItem {
  id: string;
  createdAt: string;
  jobTitle: string;
  matchScore: number;
  improvementMetrics: Record<string, unknown>;
  isUnlocked?: boolean;
  isPaid?: boolean;
  payment?: { amount: number; paidAt: string } | null;
  versionCount?: number;
  bestMatchScore?: number;
}

export interface ResumeVersionItem {
  id: string;
  version_number: number;
  matchScore: number;
  created_at: string;
}

export interface ResumeVersionsResponse {
  rootResumeId: string;
  versions: ResumeVersionItem[];
}

/** GET /api/resume/[id]/versions. Call when resumeId, userId, and accessToken are available. */
export async function fetchResumeVersions(
  resumeId: string,
  userId: string,
  accessToken: string
): Promise<ResumeVersionsResponse> {
  const url = `/api/resume/${encodeURIComponent(resumeId)}/versions?userId=${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(
      typeof json?.error === "string" ? json.error : json?.message ?? "Failed to load versions"
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json;
}

export interface ResumeListResponse {
  resumes: ResumeListItem[];
  totalCount: number;
  page?: number;
  limit?: number;
}

/** GET /api/resume/list. Call only when userId and accessToken are available. */
export async function fetchResumeList(
  userId: string,
  page: number,
  limit: number,
  accessToken: string
): Promise<ResumeListResponse> {
  const url = `/api/resume/list?userId=${encodeURIComponent(userId)}&page=${page}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(
      typeof json?.error === "string" ? json.error : json?.message ?? "Failed to load list"
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return {
    resumes: json.resumes ?? [],
    totalCount: json.totalCount ?? 0,
    page: json.page,
    limit: json.limit,
  };
}

export interface JobTitleResponse {
  jobTitle?: string;
  confidence?: number;
}

/** POST /api/tailor/job/title. Stateless; key by jobDescription (or hash). */
export async function fetchJobTitle(jobDescription: string): Promise<JobTitleResponse> {
  const res = await fetch("/api/tailor/job/title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription: jobDescription.trim() }),
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(
      typeof json?.error === "string" ? json.error : json?.message ?? "Job title extraction failed"
    ) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json;
}

/** Build a stable key for job title cache. Uses trimmed string; for very long JDs consider hashing (see plan §10.6). */
export function jobTitleKey(jobDescription: string, minLength = 50): string | null {
  const trimmed = jobDescription.trim();
  return trimmed.length >= minLength ? trimmed : null;
}
