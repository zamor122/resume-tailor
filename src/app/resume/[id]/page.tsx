"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/app/contexts/AuthContext";
import { fetchResumeById, fetchResumeVersions } from "@/app/lib/swr-fetchers";
import TailoredResumeOutput from "@/app/components/TailoredResumeOutput";
import ImprovementHighlights from "@/app/components/ImprovementHighlights";
import PaymentGate from "@/app/components/PaymentGate";
import FreeReveal from "@/app/components/FreeReveal";
import TierSelectionModal from "@/app/components/TierSelectionModal";
import ShareResumeCard from "@/app/components/ShareResumeCard";
import ResumeFeedbackCard from "@/app/components/ResumeFeedbackCard";
import ResumeDiffView from "@/app/components/ResumeDiffView";
import AddVersionInfoPopover from "@/app/components/AddVersionInfoPopover";
import Link from "next/link";
import { analytics } from "@/app/services/analytics";
import type { ResumeMetricsSnapshot, KeywordGapSnapshot, ResumeSuggestion } from "@/app/types/humanize";

function normalizeSwrError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  const o = error as { error?: string; message?: string } | undefined;
  return o?.error ?? o?.message ?? String(error);
}

interface ResumeData {
  originalResume: string;
  tailoredResume: string;
  obfuscatedResume: string;
  contentMap?: Record<string, string> | null;
  jobDescription?: string;
  jobTitle?: string | null;
  matchScore?: number;
  metrics?: ResumeMetricsSnapshot;
  suggestions?: ResumeSuggestion[];
  improvementMetrics?: {
    quantifiedBulletsAdded?: number;
    atsKeywordsMatched?: number;
    activeVoiceConversions?: number;
    sectionsOptimized?: number;
  };
  freeReveal?: { section: string; originalText: string; improvedText: string } | null;
  resumeId?: string;
  isUnlocked: boolean;
  appliedWithResume?: boolean | null;
  feedbackComment?: string | null;
  accessInfo?: {
    tier: string;
    tierLabel: string;
    expiresAt: string | null;
    remainingTime: number | null;
    isExpired: boolean;
  } | null;
  keywordGap?: KeywordGapSnapshot;
}

export default function ResumeDetailPage() {
  const params = useParams();
  const { user, session, loading: authLoading } = useAuth();
  const id = params?.id as string | undefined;

  const [showTierModal, setShowTierModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"resume" | "diff" | "compare">("resume");
  const [compareWithVersionId, setCompareWithVersionId] = useState<string | null>(null);
  const [compareData, setCompareData] = useState<{ tailoredResume: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"resume" | "stats">("resume");

  const resumeSwrKey =
    id && !authLoading
      ? (["resume", id, user?.id ?? ""] as const)
      : null;
  const fetcher = useCallback(
    ([, resumeId, userId]: readonly [string, string, string]) =>
      fetchResumeById(resumeId, userId || undefined, session?.access_token ?? undefined),
    [session?.access_token]
  );
  const { data: json, error: swrError, isLoading, isValidating, mutate } = useSWR(
    resumeSwrKey,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const versionsSwrKey =
    id && user?.id && session?.access_token && !authLoading
      ? (["resume-versions", id, user.id] as const)
      : null;
  const versionsFetcher = useCallback(
    ([, resumeId, userId]: readonly [string, string, string]) =>
      fetchResumeVersions(resumeId, userId, session!.access_token!),
    [session?.access_token]
  );
  const { data: versionsData } = useSWR(versionsSwrKey, versionsFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });
  const versions = versionsData?.versions ?? [];
  const rootResumeId = versionsData?.rootResumeId;

  const data = useMemo<ResumeData | null>(() => {
    if (!json || !id) return null;
    return {
      originalResume: json.originalResume ?? "",
      tailoredResume: json.tailoredResume ?? "",
      obfuscatedResume: json.obfuscatedResume ?? "",
      contentMap: json.contentMap,
      jobDescription: json.jobDescription,
      jobTitle: json.jobTitle ?? null,
      matchScore: typeof json.matchScore === "number" ? json.matchScore : 0,
      metrics: json.metrics as ResumeData["metrics"],
      improvementMetrics: (json.improvementMetrics as ResumeData["improvementMetrics"]) ?? {},
      freeReveal: json.freeReveal ?? null,
      resumeId: json.resumeId ?? id,
      isUnlocked: json.isUnlocked ?? false,
      accessInfo: json.accessInfo as ResumeData["accessInfo"] ?? null,
      appliedWithResume: json.appliedWithResume ?? null,
      feedbackComment: json.feedbackComment ?? null,
      keywordGap: json.keywordGap as ResumeData["keywordGap"] ?? undefined,
      suggestions: (json.suggestions || (json as any).improvementMetrics?.suggestions || (json as any).formatSpec?.suggestions || []) as ResumeSuggestion[],
    };
  }, [json, id]);

  const error = swrError ? normalizeSwrError(swrError) : null;
  const loading = (!data && isLoading) || (!!id && authLoading);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSessionId(localStorage.getItem("resume-tailor-session-id"));
    }
  }, []);

  useEffect(() => {
    if (!compareWithVersionId || !user?.id || !session?.access_token || compareWithVersionId === id) {
      setCompareData(null);
      return;
    }
    let cancelled = false;
    fetchResumeById(compareWithVersionId, user.id, session.access_token).then(
      (res) => {
        if (!cancelled && res.tailoredResume) {
          setCompareData({ tailoredResume: res.tailoredResume });
        }
      },
      () => {
        if (!cancelled) setCompareData(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [compareWithVersionId, user?.id, session?.access_token, id]);

  if (!id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500">Invalid resume ID</p>
        <Link href="/" className="mt-4 inline-block text-cyan-500 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="p-6 rounded-xl bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800/30">
          <p className="text-pink-700 dark:text-pink-400">{error || "Resume not found"}</p>
          <Link href="/" className="mt-4 inline-block text-cyan-500 hover:underline">
            Back to home
          </Link>
          <Link href="/profile" className="mt-4 ml-4 inline-block text-cyan-500 hover:underline">
            View all resumes
          </Link>
        </div>
      </div>
    );
  }

  const displayResume = data.isUnlocked ? data.tailoredResume : data.obfuscatedResume;
  const matchScore = data.matchScore ?? 0;
  const metrics = {
    ...data.improvementMetrics,
    matchScore,
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <Link
            href="/profile"
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 shrink-0"
            onClick={() => {
              analytics.trackEvent(analytics.events.LINK_CLICK, {
                ...analytics.getTrackingContext({ section: "header", element: "link", label: "Back to resumes" }),
                href: "/profile",
              });
            }}
          >
            ← Back to resumes
          </Link>
          {/* Access pill forefront on mobile */}
          <div
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${
              data.isUnlocked
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300"
            }`}
          >
            {data.isUnlocked ? "Unlocked" : "Locked"}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Link
              href={`/?prefillVersion=${data.resumeId}`}
              className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400"
              onClick={() => {
                analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                  ...analytics.getTrackingContext({ section: "header", element: "link", label: "Add version", resumeId: data.resumeId }),
                });
              }}
            >
              Add version
            </Link>
            <span className="relative flex-shrink-0 group/info" aria-label="Get another tailored resume for this job. Job description stays filled in; you can change it or run again. Every result is saved in your history.">
              <svg className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-6 py-6 text-xs font-normal text-white dark:bg-gray-800 bg-gray-900 rounded shadow-lg opacity-0 pointer-events-none group-hover/info:opacity-100 transition-opacity z-10 min-w-[320px] max-w-[440px] min-h-[100px] text-left leading-relaxed text-sm text-gray-100">
                Get another tailored resume for this job. The job description stays filled in so you can run again—tweak it or leave it as is. Every result is saved in your history.
              </span>
            </span>
          </span>
          <Link
            href={`/?prefillVersion=${data.resumeId}`}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            onClick={() => {
              analytics.trackEvent(analytics.events.LINK_CLICK, {
                ...analytics.getTrackingContext({ section: "header", element: "link", label: "Re-tailor", resumeId: data.resumeId }),
              });
            }}
          >
            Re-tailor this resume
          </Link>
        </div>
      </div>

      {versions.length > 1 && matchScore < 90 && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Re-tailor to try for a higher score. Most users who re-tailor 2–3 times get a better match.
        </p>
      )}

      {/* Mobile Tab Switcher (md:hidden) */}
      <div className="md:hidden flex items-center justify-between p-1 mb-6 rounded-xl bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 shadow-inner">
        <button
          type="button"
          onClick={() => setMobileTab("resume")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "resume"
              ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <span>📄 Tailored Resume</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("stats")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === "stats"
              ? "bg-white dark:bg-gray-900 text-purple-600 dark:text-purple-400 shadow-sm"
              : "text-gray-600 dark:text-gray-400"
          }`}
        >
          <span>📊 Match ({matchScore}%) & Keywords</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Main Resume Column (Left on desktop, active tab on mobile) */}
        <div className={`md:col-span-8 space-y-6 min-w-0 ${mobileTab === "resume" ? "block" : "hidden md:block"}`}>
          <div className="output-container p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
              <h2 className="text-xl sm:text-2xl font-bold gradient-text-emerald">
                {viewMode === "resume"
                  ? "Your Tailored Resume"
                  : viewMode === "compare"
                    ? "Compare Versions"
                    : "See What We Changed"}
              </h2>
              <div className="flex rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("resume");
                    analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                      ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                      mode: "resume",
                    });
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    viewMode === "resume"
                      ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("diff");
                    analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                      ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                      mode: "diff",
                    });
                  }}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    viewMode === "diff"
                      ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  }`}
                >
                  Diff Changes
                </button>
                {versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("compare");
                      if (!compareWithVersionId && versions[0].id !== id) setCompareWithVersionId(versions[0].id);
                      else if (!compareWithVersionId && versions.length > 1) setCompareWithVersionId(versions[1].id);
                      analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                        ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                        mode: "compare",
                      });
                    }}
                    className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                      viewMode === "compare"
                        ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                    }`}
                  >
                    Compare
                  </button>
                )}
              </div>
            </div>

            <PaymentGate resumeId={data.resumeId} onUnlock={() => {}} isUnlocked={data.isUnlocked}>
              {data.freeReveal && !data.isUnlocked && viewMode === "resume" && (
                <FreeReveal
                  section={data.freeReveal.section}
                  originalText={data.freeReveal.originalText}
                  improvedText={data.freeReveal.improvedText}
                />
              )}
              {viewMode === "resume" && (
                <TailoredResumeOutput
                  newResume={displayResume}
                  originalResume={data.originalResume}
                  suggestions={data.suggestions || []}
                  onSuggestionsChange={(updated) => {
                    if (json) {
                      mutate({ ...json, success: json.success ?? true, suggestions: updated }, false);
                    }
                  }}
                  loading={false}
                  showDownload={data.isUnlocked}
                  downloadJobTitle={data.jobTitle ?? undefined}
                  resumeId={data.resumeId}
                  isUnlocked={data.isUnlocked}
                  onUnlockRequest={() => setShowTierModal(true)}
                  matchScore={matchScore}
                />
              )}
              {viewMode === "diff" && (
                <ResumeDiffView
                  originalText={data.originalResume}
                  tailoredText={displayResume}
                  className="min-h-[320px]"
                  addedLabel="Added in your tailored resume"
                  removedLabel="Removed from your original"
                />
              )}
              {viewMode === "compare" && (
                <>
                  <div className="mb-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">
                      You have {versions.length} versions for this job. Compare any two:
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {versions.map((v) => (
                        <Link
                          key={v.id}
                          href={`/resume/${v.id}`}
                          className={`px-2.5 py-1 text-xs sm:text-sm rounded-lg transition-colors ${
                            v.id === id
                              ? "bg-cyan-500 text-white font-medium shadow-sm"
                              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          Version {v.version_number}
                        </Link>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <select
                        value={compareWithVersionId ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCompareWithVersionId(val || null);
                          if (val) setViewMode("compare");
                        }}
                        className="text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                      >
                        <option value="">Select version to compare...</option>
                        {versions.filter((v) => v.id !== id).map((v) => (
                          <option key={v.id} value={v.id}>
                            Version {v.version_number}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {compareData ? (
                    <ResumeDiffView
                      originalText={displayResume}
                      tailoredText={compareData.tailoredResume}
                      className="min-h-[320px]"
                      addedLabel={
                        (() => {
                          const sel = versions.find((v) => v.id === compareWithVersionId);
                          return sel ? `Added in Version ${sel.version_number}` : "Added in selected version";
                        })()
                      }
                      removedLabel={
                        (() => {
                          const cur = versions.find((v) => v.id === id);
                          return cur ? `Removed from Version ${cur.version_number} (current)` : "Removed from current version";
                        })()
                      }
                    />
                  ) : compareWithVersionId ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Loading version to compare...</p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Select a version above to compare.</p>
                  )}
                </>
              )}
            </PaymentGate>
          </div>
        </div>

        {/* Stats & Insights Column (Right on desktop, active tab on mobile) */}
        <div className={`md:col-span-4 space-y-6 ${mobileTab === "stats" ? "block" : "hidden md:block"}`}>
          {/* Match Strength Card */}
          <div className="output-container p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center justify-between">
              <span>Job Match Strength</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {matchScore}%
              </span>
            </h3>
            {data.metrics && (
              <div className="space-y-2 text-xs sm:text-sm pt-2 border-t border-gray-100 dark:border-gray-800">
                {data.metrics.jdCoverage && data.metrics.jdCoverage.total > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>JD Requirements Coverage</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-200">{data.metrics.jdCoverage.percentage}%</span>
                  </div>
                )}
                {data.metrics.criticalKeywords && data.metrics.criticalKeywords.total > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Critical Keywords</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-200">{data.metrics.criticalKeywords.matched}/{data.metrics.criticalKeywords.total}</span>
                  </div>
                )}
                {data.metrics.concreteEvidence && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Concrete Metrics & Evidence</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-200">{data.metrics.concreteEvidence.percentage}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keyword Match Card */}
          {(data.keywordGap || (data.metrics?.criticalKeywords && data.metrics.criticalKeywords.total > 0)) && (
            <div className="output-container p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Target Keyword Match
              </h3>
              {data.keywordGap?.foundInResume && data.keywordGap.foundInResume.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">Matched in Your Resume:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.keywordGap.foundInResume.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                      >
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.keywordGap?.missingKeywords && data.keywordGap.missingKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                    Missing Keywords to Consider:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {data.keywordGap.missingKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60"
                      >
                        + {kw}
                      </span>
                    ))}
                  </div>
                  {data.resumeId && (
                    <Link
                      href={`/?prefillVersion=${encodeURIComponent(data.resumeId)}&keywordsToWeave=${encodeURIComponent(data.keywordGap.missingKeywords.join(","))}`}
                      className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-sm transition-all"
                    >
                      Re-tailor with missing keywords
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {!data.isUnlocked && (
            <div className="output-container p-5 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unlock Your Full Resume
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
                Get full access to copy, export to PDF/Word, and save all tailored versions.
              </p>
              <button
                onClick={() => setShowTierModal(true)}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs sm:text-sm text-white bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 shadow-md transition-all"
              >
                Choose Access Plan
              </button>
            </div>
          )}

          <div className="improvement-container p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-3 text-amber-600 dark:text-amber-400">
              Improvement Highlights
            </h3>
            <ImprovementHighlights
              metrics={metrics}
              metricsSnapshot={data.metrics ?? null}
            />
          </div>

          {data.isUnlocked && (
            <>
              <ResumeFeedbackCard
                resumeId={data.resumeId}
                initialAppliedWithResume={data.appliedWithResume}
                initialFeedbackComment={data.feedbackComment}
                userId={user?.id}
                accessToken={session?.access_token ?? undefined}
                sessionId={sessionId ?? undefined}
              />
              <ShareResumeCard />
            </>
          )}
        </div>
      </div>

      <TierSelectionModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        resumeId={data.resumeId}
      />
    </div>
  );
}
