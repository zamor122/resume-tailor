"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@/app/contexts/AuthContext";
import { fetchResumeById, fetchResumeVersions } from "@/app/lib/swr-fetchers";
import TailoredResumeOutput from "@/app/components/TailoredResumeOutput";
import ImprovementHighlights from "@/app/components/ImprovementHighlights";
import AtsMatchGauge from "@/app/components/AtsMatchGauge";
import PaymentGate from "@/app/components/PaymentGate";
import FreeReveal from "@/app/components/FreeReveal";
import TierSelectionModal from "@/app/components/TierSelectionModal";
import ShareResumeCard from "@/app/components/ShareResumeCard";
import ResumeFeedbackCard from "@/app/components/ResumeFeedbackCard";
import ResumeDiffView from "@/app/components/ResumeDiffView";
import ChangedAndWhy from "@/app/components/ChangedAndWhy";
import AddVersionInfoPopover from "@/app/components/AddVersionInfoPopover";
import Link from "next/link";
import { analytics } from "@/app/services/analytics";
import type { ResumeMetricsSnapshot, KeywordGapSnapshot, ResumeSuggestion } from "@/app/types/humanize";
import type { ResumeSectionGroup } from "@/app/agent/state";
import { groupSuggestionsBySection, type ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";

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
  sectionGroups?: ResumeSectionGroup[];
  resumeAST?: ParsedResumeForReassemble;
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
  const [viewMode, setViewMode] = useState<"changes" | "resume" | "diff" | "compare">("changes");
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
      sectionGroups: ((json as any).sectionGroups || (json as any).formatSpec?.sectionGroups || (json as any).improvementMetrics?.sectionGroups || ((json.suggestions || (json as any).formatSpec?.suggestions) && json.originalResume ? groupSuggestionsBySection((json.suggestions || (json as any).formatSpec?.suggestions), (json as any).resumeAST || (json as any).formatSpec?.resumeAST, json.originalResume) : undefined)) as ResumeSectionGroup[] | undefined,
      resumeAST: ((json as any).resumeAST || (json as any).formatSpec?.resumeAST || (json as any).improvementMetrics?.resumeAST || undefined) as ParsedResumeForReassemble | undefined,
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
        <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-6 rounded-xl max-w-md">
          <p className="font-mono font-bold text-sm text-red-600">Invalid resume ID</p>
          <Link href="/" className="neo-btn mt-4 inline-block px-4 py-2 font-mono font-bold text-xs uppercase bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-8 rounded-xl space-y-6">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 rounded-full border-2 border-[#1C2028] border-t-[#FF5722] animate-spin" />
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#1C2028]">
              {authLoading ? "Verifying your session..." : "Loading your tailored resume & analysis..."}
            </p>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[#E5E0D8] border border-[#1C2028] rounded w-1/3" />
            <div className="h-64 bg-[#E5E0D8] border border-[#1C2028] rounded" />
            <div className="h-32 bg-[#E5E0D8] border border-[#1C2028] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-8 rounded-xl max-w-lg space-y-4">
          <span className="neo-tag bg-[#EF4444] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
            ERROR
          </span>
          <p className="font-mono font-bold text-sm text-[#1C2028]">{error || "Resume not found"}</p>
          <div className="flex gap-3 pt-2">
            <Link href="/" className="neo-btn px-4 py-2 font-mono font-bold text-xs uppercase bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]">
              ← Back to Home
            </Link>
            <Link href="/profile" className="neo-btn px-4 py-2 font-mono font-bold text-xs uppercase bg-white text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA]">
              View All Resumes
            </Link>
          </div>
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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center justify-between gap-3 min-w-0">
          <Link
            href="/profile"
            className="neo-btn text-xs font-mono font-bold px-3.5 py-1.5 rounded-lg border-2 border-[#1C2028] bg-white text-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA] shrink-0 transition-all active:translate-x-[1px] active:translate-y-[1px]"
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
            className={`shrink-0 px-3 py-1 font-mono font-bold text-xs border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] rounded-md ${
              data.isUnlocked
                ? "bg-[#10B981] text-white"
                : "bg-[#F59E0B] text-white"
            }`}
          >
            {data.isUnlocked ? "✓ UNLOCKED" : "🔒 LOCKED"}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5">
            <Link
              href={`/?prefillVersion=${data.resumeId}`}
              className="neo-btn text-xs font-mono font-bold px-3 py-1.5 rounded-lg border-2 border-[#1C2028] bg-white text-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA] transition-all"
              onClick={() => {
                analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                  ...analytics.getTrackingContext({ section: "header", element: "link", label: "Add version", resumeId: data.resumeId }),
                });
              }}
            >
              + Add Version
            </Link>
            <span className="relative flex-shrink-0 group/info" aria-label="Get another tailored resume for this job. Job description stays filled in; you can change it or run again. Every result is saved in your history.">
              <svg className="w-4 h-4 text-gray-500 hover:text-[#1C2028] cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-4 py-3 text-xs font-mono text-[#1C2028] bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-lg opacity-0 pointer-events-none group-hover/info:opacity-100 transition-opacity z-20 min-w-[280px] max-w-[360px] text-left leading-relaxed">
                Get another tailored resume for this job. The job description stays filled in so you can run again with new tweaks. Every result is saved in your history.
              </span>
            </span>
          </span>
          <Link
            href={`/?prefillVersion=${data.resumeId}`}
            className="neo-btn text-xs font-mono font-bold uppercase px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px] transition-all"
            onClick={() => {
              analytics.trackEvent(analytics.events.LINK_CLICK, {
                ...analytics.getTrackingContext({ section: "header", element: "link", label: "Re-tailor", resumeId: data.resumeId }),
              });
            }}
          >
            ⚡ Re-tailor this resume
          </Link>
        </div>
      </div>

      {versions.length > 1 && matchScore < 90 && (
        <p className="mb-4 text-xs sm:text-sm font-mono text-gray-700">
          Tip: Re-tailor to aim for a 90%+ match score. Candidates who iterate 2–3 times achieve higher recruiter callbacks.
        </p>
      )}

      {/* Mobile Tab Switcher (md:hidden) */}
      <div className="md:hidden flex items-center justify-between p-1.5 mb-6 rounded-xl bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] gap-2">
        <button
          type="button"
          onClick={() => setMobileTab("resume")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all neo-btn ${
            mobileTab === "resume"
              ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
              : "bg-white text-[#1C2028] border border-[#1C2028]/40"
          }`}
        >
          <span>📄 Tailored Resume</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("stats")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all neo-btn ${
            mobileTab === "stats"
              ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
              : "bg-white text-[#1C2028] border border-[#1C2028]/40"
          }`}
        >
          <span>📊 Match &amp; Keywords</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Main Resume Column */}
        <div className={`${viewMode === "resume" || viewMode === "changes" ? "col-span-12" : "md:col-span-8"} space-y-6 min-w-0 ${viewMode === "changes" || mobileTab === "resume" ? "block" : "hidden md:block"}`}>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
              <div className="flex flex-wrap rounded-xl bg-[#FAF7F0] p-1.5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("changes");
                    analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                      ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                      mode: "changes",
                    });
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all neo-btn ${
                    viewMode === "changes"
                      ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[1px_1px_0px_#1C2028]"
                      : "bg-white text-[#1C2028] hover:bg-[#F4F1EA] border border-[#1C2028]/30"
                  }`}
                >
                  What we changed &amp; why
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("resume");
                    analytics.trackEvent(analytics.events.VIEW_MODE_CHANGED, {
                      ...analytics.getTrackingContext({ section: "output", element: "view_toggle", resumeId: data.resumeId }),
                      mode: "resume",
                    });
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all neo-btn ${
                    viewMode === "resume"
                      ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[1px_1px_0px_#1C2028]"
                      : "bg-white text-[#1C2028] hover:bg-[#F4F1EA] border border-[#1C2028]/30"
                  }`}
                >
                  ⚡ Change Studio & Resume
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
                  className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all neo-btn ${
                    viewMode === "diff"
                      ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[1px_1px_0px_#1C2028]"
                      : "bg-white text-[#1C2028] hover:bg-[#F4F1EA] border border-[#1C2028]/30"
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
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-all neo-btn ${
                      viewMode === "compare"
                        ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[1px_1px_0px_#1C2028]"
                        : "bg-white text-[#1C2028] hover:bg-[#F4F1EA] border border-[#1C2028]/30"
                    }`}
                  >
                    Compare
                  </button>
                )}
              </div>
            </div>

            {viewMode === "changes" && (
              <ChangedAndWhy
                suggestions={data.suggestions || []}
                originalResume={data.originalResume}
                resumeId={data.resumeId}
                userId={user?.id}
                accessToken={session?.access_token ?? undefined}
                sessionId={sessionId}
                onSuggestionsChange={(updated) => {
                  if (json) {
                    mutate({ ...json, success: json.success ?? true, suggestions: updated }, false);
                  }
                }}
                onUnlockRequest={() => setShowTierModal(true)}
              />
            )}
            {viewMode === "resume" && (
              <TailoredResumeOutput
                newResume={displayResume}
                originalResume={data.originalResume}
                suggestions={data.suggestions || []}
                sectionGroups={data.sectionGroups}
                resumeAST={data.resumeAST}
                onSuggestionsChange={(updated) => {
                  if (json) {
                    mutate({ ...json, success: json.success ?? true, suggestions: updated }, false);
                  }
                }}
                onSectionGroupsChange={(updatedGroups) => {
                  if (json) {
                    mutate({ ...json, sectionGroups: updatedGroups }, false);
                  }
                }}
                loading={false}
                showDownload={data.isUnlocked}
                downloadJobTitle={data.jobTitle ?? undefined}
                resumeId={data.resumeId}
                userId={user?.id}
                accessToken={session?.access_token ?? undefined}
                sessionId={sessionId}
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
                layout="side-by-side"
              />
            )}
            {viewMode === "compare" && (
              <>
                <div className="mb-4 p-4 rounded-xl neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028]">
                  <p className="text-xs sm:text-sm font-mono font-bold text-[#1C2028] mb-3">
                    You have {versions.length} versions for this job. Compare any two:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {versions.map((v) => (
                      <Link
                        key={v.id}
                        href={`/resume/${v.id}`}
                        className={`neo-btn px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                          v.id === id
                            ? "bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
                            : "bg-white text-[#1C2028] border border-[#1C2028] hover:bg-[#F4F1EA]"
                        }`}
                      >
                        Version {v.version_number}
                      </Link>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1C2028]/15">
                    <select
                      value={compareWithVersionId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompareWithVersionId(val || null);
                        if (val) setViewMode("compare");
                      }}
                      className="text-xs font-mono font-bold border-2 border-[#1C2028] rounded-lg px-3 py-1.5 bg-white text-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
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
                    layout="side-by-side"
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
                  <p className="text-sm font-mono text-gray-500 py-4 text-center">Loading version to compare...</p>
                ) : (
                  <p className="text-sm font-mono text-gray-500 py-4 text-center">Select a version above to compare.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stats & Insights Column (Shown in Diff/Compare modes or Mobile stats tab) */}
        <div className={`${viewMode === "resume" || viewMode === "changes" ? "hidden" : "md:col-span-4"} space-y-6 ${mobileTab === "stats" ? "block" : "hidden md:block"}`}>
          {/* Match Strength Card */}
          <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-5 sm:p-6 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="neo-tag bg-[#10B981] text-white text-[9px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
                CALIBRATION
              </span>
              <h3 className="text-base sm:text-lg font-mono font-bold text-[#1C2028]">
                Job Match Strength
              </h3>
            </div>
            <AtsMatchGauge
              score={matchScore}
              sublabel={
                data.metrics?.criticalKeywords && data.metrics.criticalKeywords.total > 0
                  ? `${data.metrics.criticalKeywords.matched}/${data.metrics.criticalKeywords.total} critical keywords`
                  : undefined
              }
            />
            {data.metrics && (
              <div className="space-y-2 text-xs sm:text-sm pt-3 border-t-2 border-[#1C2028]/15 font-mono">
                {data.metrics.jdCoverage && data.metrics.jdCoverage.total > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>JD Requirements Coverage</span>
                    <span className="font-bold text-[#1C2028]">{data.metrics.jdCoverage.percentage}%</span>
                  </div>
                )}
                {data.metrics.criticalKeywords && data.metrics.criticalKeywords.total > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Critical Keywords</span>
                    <span className="font-bold text-[#1C2028]">{data.metrics.criticalKeywords.matched}/{data.metrics.criticalKeywords.total}</span>
                  </div>
                )}
                {data.metrics.concreteEvidence && (
                  <div className="flex justify-between text-gray-700">
                    <span>Concrete Metrics &amp; Evidence</span>
                    <span className="font-bold text-[#1C2028]">{data.metrics.concreteEvidence.percentage}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keyword Match Card */}
          {(data.keywordGap || (data.metrics?.criticalKeywords && data.metrics.criticalKeywords.total > 0)) && (
            <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-5 sm:p-6 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="neo-tag bg-[#FF5722] text-white text-[9px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
                  TARGET ALIGNMENT
                </span>
                <h3 className="text-base sm:text-lg font-mono font-bold text-[#1C2028]">
                  Target Keyword Match
                </h3>
              </div>
              {data.keywordGap?.foundInResume && data.keywordGap.foundInResume.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-mono font-bold text-[#065F46] mb-2">Matched in Your Resume:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.keywordGap.foundInResume.map((kw) => (
                      <span
                        key={kw}
                        className="neo-tag inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#ECFDF5] text-[#065F46] border border-[#10B981]"
                      >
                        ✓ {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {data.keywordGap?.missingKeywords && data.keywordGap.missingKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-mono font-bold text-[#B45309] mb-2">
                    Missing Keywords to Consider:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {data.keywordGap.missingKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="neo-tag inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#FFFBEB] text-[#B45309] border border-[#F59E0B]"
                      >
                        + {kw}
                      </span>
                    ))}
                  </div>
                  {data.resumeId && (
                    <Link
                      href={`/?prefillVersion=${encodeURIComponent(data.resumeId)}&keywordsToWeave=${encodeURIComponent(data.keywordGap.missingKeywords.join(","))}`}
                      className="neo-btn inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-mono font-bold uppercase bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                    >
                      ⚡ Re-tailor with missing keywords
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}

          {!data.isUnlocked && (
            <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-5 sm:p-6 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="neo-tag bg-[#FF5722] text-white text-[9px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
                  FULL EXPORT
                </span>
                <h3 className="text-base sm:text-lg font-mono font-bold text-[#1C2028]">
                  Unlock Your Full Resume
                </h3>
              </div>
              <p className="text-xs sm:text-sm font-mono text-gray-700 leading-relaxed">
                Get full access to copy, export to PDF/Word, and save all tailored versions without limits.
              </p>
              <button
                onClick={() => setShowTierModal(true)}
                className="neo-btn w-full py-2.5 px-4 rounded-lg font-mono font-bold text-xs sm:text-sm uppercase text-white bg-[#FF5722] hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px] transition-all"
              >
                Choose Access Plan
              </button>
            </div>
          )}

          <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-5 sm:p-6 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="neo-tag bg-[#10B981] text-white text-[9px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
                GAINS
              </span>
              <h3 className="text-base sm:text-lg font-mono font-bold text-[#1C2028]">
                Improvement Highlights
              </h3>
            </div>
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
