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
import Link from "next/link";
import { analytics } from "@/app/services/analytics";
import type { ResumeMetricsSnapshot, KeywordGapSnapshot } from "@/app/types/humanize";

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
  const [mobileResumeOpen, setMobileResumeOpen] = useState(false);

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
          <Link
            href={`/?prefillResumeId=${data.resumeId}`}
            className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400"
            onClick={() => {
              analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                ...analytics.getTrackingContext({ section: "header", element: "link", label: "Tailor this resume for another job", resumeId: data.resumeId }),
              });
            }}
          >
            Tailor this resume for another job
          </Link>
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

      {versions.length > 1 && (
        <div className="mb-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            You have {versions.length} versions for this job. Compare any two.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {versions.map((v) => (
              <Link
                key={v.id}
                href={`/resume/${v.id}`}
                className={`px-2.5 py-1 text-sm rounded-md transition-colors ${
                  v.id === id
                    ? "bg-cyan-500 text-white"
                    : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Version {v.version_number}
              </Link>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {versions.findIndex((v) => v.id === id) > 0 && (
              <Link
                href={`/resume/${versions[versions.findIndex((v) => v.id === id) - 1].id}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-500"
              >
                ← Previous
              </Link>
            )}
            {versions.findIndex((v) => v.id === id) >= 0 && versions.findIndex((v) => v.id === id) < versions.length - 1 && (
              <Link
                href={`/resume/${versions[versions.findIndex((v) => v.id === id) + 1].id}`}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-cyan-500"
              >
                Next →
              </Link>
            )}
            <select
              value={compareWithVersionId ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                setCompareWithVersionId(val || null);
                setViewMode(val ? "compare" : "resume");
              }}
              className="ml-auto text-sm border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              <option value="">Compare with...</option>
              {versions.filter((v) => v.id !== id).map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.version_number}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {versions.length > 1 && matchScore < 90 && (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Re-tailor to try for a higher score. Most users who re-tailor 2–3 times get a better match.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Stats sidebar: first on mobile (order-1), right column on desktop */}
        <div className="order-1 md:order-none md:col-span-4 space-y-6">
          <div className="output-container p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Job Match Strength
            </h3>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Job Match</p>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {matchScore}%
                </p>
              </div>
            </div>
            {data.metrics && (
              <div className="mt-4 space-y-2 text-sm">
                {data.metrics.jdCoverage && data.metrics.jdCoverage.total > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>JD coverage</span>
                    <span>{data.metrics.jdCoverage.percentage}%</span>
                  </div>
                )}
                {data.metrics.criticalKeywords && data.metrics.criticalKeywords.total > 0 && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Critical keywords</span>
                    <span>{data.metrics.criticalKeywords.matched}/{data.metrics.criticalKeywords.total}</span>
                  </div>
                )}
                {data.metrics.concreteEvidence && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Concrete evidence</span>
                    <span>{data.metrics.concreteEvidence.percentage}%</span>
                  </div>
                )}
                {typeof data.metrics.platformOwnership === "number" && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Platform signals</span>
                    <span>{data.metrics.platformOwnership}</span>
                  </div>
                )}
                {data.metrics.skimSuccess && (
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Skim success</span>
                    <span>{data.metrics.skimSuccess.percentage}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {(data.keywordGap || (data.metrics?.criticalKeywords && data.metrics.criticalKeywords.total > 0)) && (
            <div className="output-container p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Keyword match
              </h3>
              {data.metrics?.criticalKeywords && data.metrics.criticalKeywords.total > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  You have {data.metrics.criticalKeywords.matched} of {data.metrics.criticalKeywords.total} top skills for this job.
                </p>
              )}
              {data.keywordGap?.foundInResume && data.keywordGap.foundInResume.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Found in your resume</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.keywordGap.foundInResume.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.keywordGap?.missingKeywords && data.keywordGap.missingKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Retailor your resume and include these keywords next time if they&apos;re important to you.
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {data.keywordGap.missingKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  {data.resumeId && (
                    <Link
                      href={`/?prefillVersion=${encodeURIComponent(data.resumeId)}&keywordsToWeave=${encodeURIComponent(data.keywordGap.missingKeywords.join(","))}`}
                      className="relative w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold min-h-[52px] bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out whitespace-nowrap"
                      onClick={() => {
                        analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                          ...analytics.getTrackingContext({
                            section: "output",
                            element: "link",
                            label: "Retailor with these keywords",
                            resumeId: data.resumeId,
                          }),
                          source: "resume_detail",
                          keywordsCount: data.keywordGap?.missingKeywords?.length ?? 0,
                        });
                      }}
                    >
                      Retailor with these keywords
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {!data.isUnlocked && (
            <div className="output-container p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unlock your tailored resume
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Choose an access plan to view and download your optimized resume.
              </p>
              <button
                onClick={() => setShowTierModal(true)}
                className="w-full py-2 px-4 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-colors"
              >
                Choose Access Plan
              </button>
            </div>
          )}

          <div className="improvement-container">
            <h3 className="text-lg font-semibold mb-3 text-amber-600 dark:text-amber-400">
              Improvement Summary
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

        {/* Resume content: second on mobile (order-2), accordion on mobile */}
        <div className="order-2 md:order-none md:col-span-8 space-y-6 min-w-0">
          {/* Mobile: accordion so stats are visible first */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setMobileResumeOpen((o) => !o)}
              className="w-full output-container flex items-center justify-between gap-3 p-4 text-left rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
              aria-expanded={mobileResumeOpen}
            >
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {viewMode === "resume"
                  ? "Your Tailored Resume"
                  : viewMode === "compare"
                    ? "Compare two versions"
                    : "See what we changed"}
              </span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${mobileResumeOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileResumeOpen && (
              <div className="mt-2 output-container">
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4 md:justify-between">
                  <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode("resume");
                        analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                          ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                          mode: "resume",
                        });
                      }}
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "resume" ? "bg-cyan-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
                      className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "diff" ? "bg-cyan-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                    >
                      See what we changed
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
                        className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "compare" ? "bg-cyan-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                      >
                        Compare versions
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
                      loading={false}
                      showDownload={data.isUnlocked}
                      downloadJobTitle={data.jobTitle ?? undefined}
                      resumeId={data.resumeId}
                    />
                  )}
                  {viewMode === "diff" && (
                    <ResumeDiffView
                      originalText={data.originalResume}
                      tailoredText={displayResume}
                      className="min-h-[320px]"
                    />
                  )}
                  {viewMode === "compare" && (
                    <>
                      {compareData ? (
                        <ResumeDiffView
                          originalText={displayResume}
                          tailoredText={compareData.tailoredResume}
                          className="min-h-[320px]"
                        />
                      ) : compareWithVersionId ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading version to compare...</p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Select a version from the dropdown above to compare.</p>
                      )}
                    </>
                  )}
                </PaymentGate>
              </div>
            )}
          </div>

          {/* Desktop: always visible */}
          <div className="hidden md:block output-container">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h2 className="text-2xl font-semibold gradient-text-emerald">
                {viewMode === "resume"
                  ? "Your Tailored Resume"
                  : viewMode === "compare"
                    ? "Compare two versions"
                    : "See what we changed"}
              </h2>
              <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("resume");
                    analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                      ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                      mode: "resume",
                    });
                  }}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "resume" ? "bg-cyan-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
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
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "diff" ? "bg-cyan-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                >
                  See what we changed
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
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${viewMode === "compare" ? "bg-cyan-500 text-white" : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
                  >
                    Compare versions
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
                  loading={false}
                  showDownload={data.isUnlocked}
                  downloadJobTitle={data.jobTitle ?? undefined}
                  resumeId={data.resumeId}
                />
              )}
              {viewMode === "diff" && (
                <ResumeDiffView
                  originalText={data.originalResume}
                  tailoredText={displayResume}
                  className="min-h-[320px]"
                />
              )}
              {viewMode === "compare" && (
                <>
                  {compareData ? (
                    <ResumeDiffView
                      originalText={displayResume}
                      tailoredText={compareData.tailoredResume}
                      className="min-h-[320px]"
                    />
                  ) : compareWithVersionId ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Loading version to compare...</p>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4">Select a version from the dropdown above to compare.</p>
                  )}
                </>
              )}
            </PaymentGate>
          </div>
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
