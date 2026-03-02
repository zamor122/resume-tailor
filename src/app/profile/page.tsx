"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { fetchResumeList } from "@/app/lib/swr-fetchers";
import { getURL } from "@/app/utils/siteUrl";
import AuthModal from "@/app/components/AuthModal";
import TierSelectionModal from "@/app/components/TierSelectionModal";
import PdfTemplateSelectModal from "@/app/components/PdfTemplateSelectModal";
import { hasActiveAccess, getAccessInfo } from "@/app/utils/accessManager";
import { useRouter } from "next/navigation";
import { downloadResumeAsPdf, downloadResumeAsMarkdown, resumeDownloadFilename, resumeDownloadFilenamePdf } from "@/app/utils/resumeDownload";
import { analytics } from "@/app/services/analytics";
import { useFeedback } from "@/app/contexts/FeedbackContext";

interface ResumeItem {
  id: string;
  createdAt: string;
  jobTitle: string;
  matchScore: number;
  improvementMetrics: Record<string, unknown>;
  isUnlocked?: boolean;
  versionCount?: number;
  bestMatchScore?: number;
}

const ITEMS_PER_PAGE = 10;

export default function ProfilePage() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [tierModalResumeId, setTierModalResumeId] = useState<string | undefined>(undefined);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessInfo, setAccessInfo] = useState<any>(null);
  const [downloadDropdownId, setDownloadDropdownId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const [showPdfTemplateModal, setShowPdfTemplateModal] = useState(false);
  const [pendingPdfContext, setPendingPdfContext] = useState<{
    content: string;
    baseName: string;
    resumeId: string;
    jobTitle: string;
  } | null>(null);
  const downloadTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [addVersionTooltipRect, setAddVersionTooltipRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const router = useRouter();
  const feedback = useFeedback();

  const listSwrKey =
    user && session?.access_token && !authLoading
      ? (["resume-list", user.id, currentPage] as const)
      : null;
  const listFetcher = useCallback(
    ([, userId, page]: readonly [string, string, number]) =>
      fetchResumeList(userId, page, ITEMS_PER_PAGE, session!.access_token!),
    [session?.access_token]
  );
  const { data: listData, isLoading: listLoading, mutate: mutateList } = useSWR(listSwrKey, listFetcher, {
    revalidateOnFocus: true,
  });

  const resumes = listData?.resumes ?? [];
  const totalCount = listData?.totalCount ?? 0;
  const loading = !!(user && !authLoading && !listData && listLoading);

  useEffect(() => {
    if (!authLoading && user) {
      checkAccess();
    } else if (!authLoading && !user) {
      setHasAccess(false);
    }
  }, [user, authLoading]);

  const checkAccess = async () => {
    if (!user) {
      setHasAccess(false);
      return;
    }
    try {
      const access = await hasActiveAccess(user.id);
      setHasAccess(access);
      if (access) {
        const info = await getAccessInfo(user.id);
        setAccessInfo(info);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      setHasAccess(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleViewReceipts = async () => {
    if (!user?.email) {
      alert("Please sign in with an email to view receipts.");
      return;
    }
    setOpeningPortal(true);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          returnUrl: `${getURL()}profile`,
          accessToken: session?.access_token,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create billing portal session");
      }

      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Portal URL missing");
      }
    } catch (error) {
      console.error("Error opening portal:", error);
      alert("Could not open billing portal. Please try again.");
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleDownload = async (resumeId: string, format: "pdf" | "markdown") => {
    setDownloadDropdownId(null);
    try {
      const response = await fetch("/api/resume/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          userId: user?.id,
          accessToken: session?.access_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403) {
          alert("You need active time-based access to download resumes. Please purchase access to continue.");
          setTierModalResumeId(resumeId);
          setShowTierModal(true);
          return;
        }
        throw new Error(errorData.error || "Failed to retrieve resume");
      }

      const data = await response.json();

      if (!data.isUnlocked) {
        alert("You need active time-based access to download resumes. Please purchase access to continue.");
        setTierModalResumeId(resumeId);
        setShowTierModal(true);
        return;
      }

      const content = data.tailoredResume || data.originalResume || "";
      const resume = resumes.find((r) => r.id === resumeId);
      const jobTitle = data.jobTitle || resume?.jobTitle || "";
      const baseName = resumeDownloadFilename(jobTitle || "resume");

      if (format === "pdf") {
        setPendingPdfContext({ content, baseName, resumeId, jobTitle });
        setShowPdfTemplateModal(true);
      } else {
        downloadResumeAsMarkdown(content, `${baseName}.md`);
        analytics.trackEvent(analytics.events.EXPORT_RESUME, {
          ...analytics.getTrackingContext({ section: "resume_table", element: "download_markdown", source: "profile", resumeId, jobTitle: jobTitle || undefined }),
          format: "markdown",
        });
        try {
          if (typeof window !== "undefined") sessionStorage.setItem("airesumetailor_converted", "1");
        } catch {
          // ignore
        }
        feedback?.showDidThisHelpPrompt("download");
      }
    } catch (error) {
      console.error("Error downloading resume:", error);
      alert("Failed to download resume. Please try again.");
    }
  };

  // API returns current page already sorted by created_at DESC
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + resumes.length, totalCount);
  const currentResumes = resumes;

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-white mb-4">Profile</h1>
          <p className="text-gray-300 text-lg">
            Sign in to view your resume history and download your tailored resumes.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-8 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Sign In / Create Account
          </button>
          <p className="mt-3 text-sm text-gray-400">
            <Link
              href="/auth/forgot-password"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Forgot password?
            </Link>
          </p>
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false);
            setCurrentPage(1);
            checkAccess();
          }}
          title="Sign in to view your profile"
          description="Access your resume history and download your tailored resumes."
        />
        
        <TierSelectionModal
          isOpen={showTierModal}
          onClose={() => setShowTierModal(false)}
          onSelectTier={(tier) => {
            // Tier selection is handled by the modal
          }}
        />
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-300 text-sm md:text-base break-all">
            Signed in as <span className="font-medium text-white">{user.email}</span>
          </p>
        </div>
          <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-2 md:gap-3">
            <button
              onClick={handleViewReceipts}
              disabled={openingPortal}
              className="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {openingPortal ? "Opening..." : "View Receipts"}
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg font-medium text-white bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              Sign Out
            </button>
          </div>
      </div>

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 max-w-lg md:max-w-none mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white text-center sm:text-left">Resume History</h2>
          <div className="flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => mutateList()}
              disabled={loading}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              title="Refresh list"
            >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            </button>
          </div>
        </div>
        
        {resumes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No resumes found.</p>
            <p className="text-gray-500 mt-2">Start tailoring your resume to see it here.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-4">
              {currentResumes.map((resume) => (
                <div
                  key={resume.id}
                  className="rounded-xl border border-gray-600 bg-gray-800/30 p-4 space-y-3"
                >
                  <div>
                    <p className="font-medium text-white truncate" title={resume.jobTitle}>
                      {resume.jobTitle}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {new Date(resume.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm mt-1">
                      <span className="text-green-400 font-semibold">{resume.matchScore}%</span>
                      {(resume.versionCount != null && resume.versionCount > 1) || resume.bestMatchScore != null ? (
                        <span className="text-gray-400 ml-2">
                          {resume.versionCount != null && resume.versionCount > 1 && `${resume.versionCount} versions`}
                          {resume.versionCount != null && resume.versionCount > 1 && resume.bestMatchScore != null && " · "}
                          {resume.bestMatchScore != null && `Best ${resume.bestMatchScore}%`}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={() => {
                        analytics.trackEvent(analytics.events.VIEW_RESUME_CLICK, {
                          ...analytics.getTrackingContext({ section: "resume_table", element: "view_resume", resumeId: resume.id, jobTitle: resume.jobTitle?.slice(0, 80) }),
                        });
                        router.push(`/resume/${resume.id}`);
                      }}
                      className="flex-1 min-w-[80px] px-3 py-2 text-sm font-medium rounded-lg text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
                    >
                      View
                    </button>
                    <span className="flex-1 min-w-[80px] flex items-center justify-center gap-1">
                      <Link
                        href={`/?prefillVersion=${resume.id}`}
                        className="text-sm font-medium text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/10 rounded-lg px-3 py-2 inline-flex items-center gap-1.5 transition-colors"
                        onClick={() => {
                          analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                            ...analytics.getTrackingContext({ section: "resume_table", element: "link", label: "Add version", resumeId: resume.id, source: "profile" }),
                          });
                        }}
                      >
                        Add version
                      </Link>
                      <span className="relative flex-shrink-0 group/info" aria-label="Get another tailored resume for this job. Job description stays filled in; you can change it or run again. Every result is saved in your history.">
                        <svg className="w-4 h-4 text-gray-400 hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 px-6 py-6 text-xs font-normal text-white bg-gray-800 rounded shadow-lg opacity-0 pointer-events-none group-hover/info:opacity-100 transition-opacity z-10 min-w-[320px] max-w-[440px] min-h-[100px] text-left leading-relaxed text-sm">
                          Get another tailored resume for this job. The job description stays filled in so you can run again—tweak it or leave it as is. Every result is saved in your history.
                        </span>
                      </span>
                    </span>
                    {(hasAccess || resume.isUnlocked) ? (
                      <div className="relative w-full sm:w-auto">
                        <button
                          ref={(el) => {
                            if (downloadDropdownId === resume.id) downloadTriggerRef.current = el;
                          }}
                          onClick={(e) => {
                            if (downloadDropdownId === resume.id) {
                              setDownloadDropdownId(null);
                            } else {
                              downloadTriggerRef.current = e.currentTarget;
                              setDownloadDropdownId(resume.id);
                            }
                          }}
                          disabled={pdfLoadingId === resume.id}
                          className="w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-lg text-green-400 border border-green-500/50 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                        >
                          {pdfLoadingId === resume.id ? "Generating…" : "Download"}
                        </button>
                        {downloadDropdownId === resume.id &&
                          typeof document !== "undefined" &&
                          createPortal(
                            <>
                              <div
                                className="fixed inset-0 z-[100]"
                                onClick={() => setDownloadDropdownId(null)}
                                aria-hidden="true"
                              />
                              <div
                                className="fixed z-[101] py-1 w-44 rounded-lg bg-gray-800 border border-gray-600 shadow-xl"
                                style={
                                  downloadTriggerRef.current
                                    ? (() => {
                                        const rect = downloadTriggerRef.current!.getBoundingClientRect();
                                        const w = 176;
                                        return {
                                          top: rect.bottom + 4,
                                          left: Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8)),
                                        };
                                      })()
                                    : undefined
                                }
                              >
                                <button
                                  type="button"
                                  onClick={() => handleDownload(resume.id, "pdf")}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-t-lg"
                                >
                                  Download as PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(resume.id, "markdown")}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-b-lg"
                                >
                                  Download as Markdown
                                </button>
                              </div>
                            </>,
                            document.body
                          )}
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setTierModalResumeId(resume.id);
                          setShowTierModal(true);
                        }}
                        className="w-full sm:w-auto px-3 py-2 text-sm font-medium rounded-lg text-orange-400 border border-orange-500/50 hover:bg-orange-500/10 transition-colors"
                      >
                        Get Access
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="pb-4 text-sm font-semibold text-gray-300 w-[320px]">Job Title</th>
                    <th className="pb-4 text-sm font-semibold text-gray-300">
                      <span className="inline-flex items-center gap-1.5">
                        Date Created
                        <span
                          className="inline-flex flex-col text-gray-400"
                          title="Sorted by date (newest first)"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-cyan-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden
                          >
                            <path d="M5 12l5-5 5 5H5z" />
                          </svg>
                        </span>
                      </span>
                    </th>
                    <th className="pb-4 text-sm font-semibold text-gray-300">Match Score</th>
                    <th className="pb-4 text-sm font-semibold text-gray-300 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResumes.map((resume) => (
                    <tr key={resume.id} className="border-b border-gray-700/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-4 text-white font-medium w-[320px]" title={resume.jobTitle}>
                        <span className="block truncate">{resume.jobTitle}</span>
                      </td>
                      <td className="py-4 text-gray-300">
                        {new Date(resume.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4">
                        <span className="text-green-400 font-semibold">
                          {resume.matchScore}%
                        </span>
                        {(resume.versionCount != null && resume.versionCount > 1) || resume.bestMatchScore != null ? (
                          <span className="block text-xs text-gray-400 mt-0.5">
                            {resume.versionCount != null && resume.versionCount > 1 && `${resume.versionCount} versions`}
                            {resume.versionCount != null && resume.versionCount > 1 && resume.bestMatchScore != null && " · "}
                            {resume.bestMatchScore != null && `Best match ${resume.bestMatchScore}%`}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="inline-flex items-center gap-1">
                            <Link
                              href={`/?prefillVersion=${resume.id}`}
                              className="px-3 py-1.5 text-sm rounded-lg text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 transition-colors"
                              onClick={() => {
                                analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                                  ...analytics.getTrackingContext({ section: "resume_table", element: "link", label: "Add version", resumeId: resume.id, source: "profile" }),
                                });
                              }}
                            >
                              Add version
                            </Link>
                            <span
                              className="relative flex-shrink-0 group/info"
                              aria-label="Get another tailored resume for this job. Job description stays filled in; you can change it or run again. Every result is saved in your history."
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setAddVersionTooltipRect({ left: rect.left, top: rect.top, width: rect.width, height: rect.height });
                              }}
                              onMouseLeave={() => setAddVersionTooltipRect(null)}
                            >
                              <svg className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </span>
                          </span>
                          <button
                            onClick={() => {
                              analytics.trackEvent(analytics.events.VIEW_RESUME_CLICK, {
                                ...analytics.getTrackingContext({ section: "resume_table", element: "view_resume", resumeId: resume.id, jobTitle: resume.jobTitle?.slice(0, 80) }),
                              });
                              router.push(`/resume/${resume.id}`);
                            }}
                            className="px-3 py-1.5 text-sm rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors"
                          >
                            View
                          </button>
                          {(hasAccess || resume.isUnlocked) ? (
                            <div className="relative inline-block">
                              <button
                                ref={(el) => {
                                  if (downloadDropdownId === resume.id) downloadTriggerRef.current = el;
                                }}
                                onClick={(e) => {
                                  if (downloadDropdownId === resume.id) {
                                    setDownloadDropdownId(null);
                                  } else {
                                    downloadTriggerRef.current = e.currentTarget;
                                    setDownloadDropdownId(resume.id);
                                  }
                                }}
                                disabled={pdfLoadingId === resume.id}
                                className="px-3 py-1.5 text-sm rounded-lg text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                              >
                                {pdfLoadingId === resume.id ? "Generating…" : "Download"}
                              </button>
                              {downloadDropdownId === resume.id &&
                                typeof document !== "undefined" &&
                                createPortal(
                                  <>
                                    <div
                                      className="fixed inset-0 z-[100]"
                                      onClick={() => setDownloadDropdownId(null)}
                                      aria-hidden="true"
                                    />
                                    <div
                                      className="fixed z-[101] py-1 w-44 rounded-lg bg-gray-800 border border-gray-600 shadow-xl"
                                      style={
                                        downloadTriggerRef.current
                                          ? (() => {
                                              const rect = downloadTriggerRef.current!.getBoundingClientRect();
                                              const w = 176;
                                              return {
                                                top: rect.bottom + 4,
                                                left: Math.max(8, Math.min(rect.right - w, window.innerWidth - w - 8)),
                                              };
                                            })()
                                          : undefined
                                      }
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(resume.id, "pdf")}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-t-lg"
                                      >
                                        Download as PDF
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(resume.id, "markdown")}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 rounded-b-lg"
                                      >
                                        Download as Markdown
                                      </button>
                                    </div>
                                  </>,
                                  document.body
                                )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setTierModalResumeId(resume.id);
                                setShowTierModal(true);
                              }}
                              className="px-3 py-1.5 text-sm rounded-lg text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-colors"
                            >
                              Get Access
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-6 border-t border-gray-700">
                <div className="text-sm text-gray-400 order-2 sm:order-1">
                  Showing {startIndex + 1} to {endIndex} of {totalCount} resumes
                </div>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-sm text-gray-300">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* Add version tooltip portal - renders above table overflow so text is never clipped */}
    {addVersionTooltipRect && typeof document !== "undefined" &&
      createPortal(
        <div
          className="fixed z-[200] px-6 py-6 text-sm font-normal text-white bg-gray-800 rounded-lg shadow-xl text-left leading-relaxed w-[400px] box-border"
          style={{
            left: (() => {
              const center = addVersionTooltipRect.left + addVersionTooltipRect.width / 2;
              const w = 400;
              const minLeft = 12;
              const maxLeft = typeof window !== "undefined" ? window.innerWidth - w - 12 : 9999;
              return Math.min(maxLeft, Math.max(minLeft, center - w / 2));
            })(),
            top: addVersionTooltipRect.top - 8,
            transform: "translateY(-100%)",
          }}
        >
          Get another tailored resume for this job. The job description stays filled in so you can run again—tweak it or leave it as is. Every result is saved in your history.
        </div>,
        document.body
      )}

    {/* Tier Selection Modal - rendered outside container for proper z-index */}
    <TierSelectionModal
      isOpen={showTierModal}
      onClose={() => {
        setShowTierModal(false);
        setTierModalResumeId(undefined);
      }}
      onSelectTier={(tier) => {
        // Tier selection is handled by the modal
      }}
      resumeId={tierModalResumeId}
    />
    <PdfTemplateSelectModal
      isOpen={showPdfTemplateModal}
      onClose={() => {
        setShowPdfTemplateModal(false);
        setPendingPdfContext(null);
      }}
      onSelect={async (templateId) => {
        if (!pendingPdfContext) return;
        const { content, baseName, resumeId: rid, jobTitle: jt } = pendingPdfContext;
        setShowPdfTemplateModal(false);
        setPendingPdfContext(null);
        setPdfLoadingId(rid);
        try {
          const pdfFilename = resumeDownloadFilenamePdf(baseName, templateId);
          await downloadResumeAsPdf(content, pdfFilename, templateId);
          analytics.trackEvent(analytics.events.EXPORT_RESUME, {
            ...analytics.getTrackingContext({ section: "resume_table", element: "download_pdf", source: "profile", resumeId: rid, jobTitle: jt || undefined }),
            format: "pdf",
          });
          try {
            if (typeof window !== "undefined") sessionStorage.setItem("airesumetailor_converted", "1");
          } catch {
            // ignore
          }
          feedback?.showDidThisHelpPrompt("download");
        } catch (e) {
          console.error("PDF download failed:", e);
          alert("Failed to generate PDF. Please try again.");
        } finally {
          setPdfLoadingId(null);
        }
      }}
    />
    </>
  );
}

