"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import { fetchResumeList } from "@/app/lib/swr-fetchers";
import { getURL } from "@/app/utils/siteUrl";
import AuthModal from "@/app/components/AuthModal";
import AddVersionInfoPopover from "@/app/components/AddVersionInfoPopover";
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1C2028]"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-xl">
        <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 neo-tag bg-[#FF5722] text-white text-xs px-3 py-1 font-mono font-bold uppercase tracking-wider">
            SYSTEM PROFILE
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#1C2028] font-mono tracking-tight">
            OPERATOR PROFILE
          </h1>
          <p className="text-gray-700 text-sm md:text-base font-sans max-w-md mx-auto leading-relaxed">
            Sign in to view your tailored resume history, add new job versions, and export formatted resumes.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowAuthModal(true)}
              className="neo-btn w-full sm:w-auto px-8 py-3.5 font-mono font-bold text-sm uppercase bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_#1C2028]"
            >
              ⚡ Sign In / Create Account
            </button>
          </div>
          <p className="mt-4 text-xs font-mono text-gray-600">
            <Link
              href="/auth/forgot-password"
              className="text-[#FF5722] hover:underline font-bold"
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
          <div className="inline-flex items-center gap-2 neo-tag bg-[#10B981] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase tracking-wider mb-1.5">
            ● OPERATOR ONLINE
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-[#1C2028] font-mono tracking-tight mb-2">
            OPERATOR PROFILE
          </h1>
          <p className="text-gray-600 text-xs md:text-sm font-mono break-all">
            Signed in as <span className="font-bold text-[#1C2028] bg-white px-2 py-0.5 border border-[#1C2028] rounded neo-box-sm shadow-none">{user.email}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-2 md:gap-3">
          <button
            onClick={handleViewReceipts}
            disabled={openingPortal}
            className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase text-[#1C2028] bg-white hover:bg-[#F4F1EA] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] disabled:opacity-60 transition-colors"
          >
            {openingPortal ? "Opening..." : "View Receipts"}
          </button>
          <button
            onClick={handleSignOut}
            className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase text-white bg-[#1C2028] hover:bg-black border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 max-w-lg md:max-w-none mx-auto text-[#1C2028]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase">
              ARCHIVE
            </span>
            <h2 className="text-xl md:text-2xl font-bold font-mono text-[#1C2028] text-center sm:text-left">Resume History</h2>
          </div>
          <div className="flex justify-center sm:justify-end">
            <button
              type="button"
              onClick={() => mutateList()}
              disabled={loading}
              className="p-2 rounded-lg text-[#1C2028] bg-white border border-[#1C2028] hover:bg-[#F4F1EA] shadow-[2px_2px_0px_#1C2028] transition-colors disabled:opacity-50"
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
            <p className="text-gray-700 font-mono text-lg">No resumes found.</p>
            <p className="text-gray-500 font-mono text-sm mt-2">Start tailoring your resume to see it here.</p>
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden space-y-4">
              {currentResumes.map((resume) => (
                <div
                  key={resume.id}
                  className="rounded-lg border-2 border-[#1C2028] bg-white shadow-[3px_3px_0px_#1C2028] p-4 space-y-3"
                >
                  <div>
                    <p className="font-mono font-bold text-[#1C2028] truncate" title={resume.jobTitle}>
                      {resume.jobTitle}
                    </p>
                    <p className="text-xs font-mono text-gray-600 mt-0.5">
                      {new Date(resume.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm font-mono mt-1">
                      <span className="text-[#059669] font-bold">{resume.matchScore}%</span>
                      {(resume.versionCount != null && resume.versionCount > 1) || resume.bestMatchScore != null ? (
                        <span className="text-gray-600 ml-2">
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
                      className="neo-btn flex-1 min-w-[80px] px-3 py-2 text-xs font-mono font-bold uppercase rounded text-white bg-[#1C2028] hover:bg-black border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-colors"
                    >
                      View
                    </button>
                    <span className="flex-1 min-w-[80px] flex items-center justify-center gap-1">
                      <Link
                        href={`/?prefillVersion=${resume.id}`}
                        className="neo-btn w-full text-center text-xs font-mono font-bold uppercase text-[#1C2028] bg-[#FAF7F0] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-white rounded px-3 py-2 inline-flex items-center justify-center gap-1.5 transition-colors"
                        onClick={() => {
                          analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                            ...analytics.getTrackingContext({ section: "resume_table", element: "link", label: "Add version", resumeId: resume.id, source: "profile" }),
                          });
                        }}
                      >
                        Add version
                      </Link>
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
                          className="neo-btn w-full sm:w-auto px-3 py-2 text-xs font-mono font-bold uppercase rounded text-white bg-[#10B981] hover:bg-[#059669] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-colors disabled:opacity-50"
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
                                className="fixed z-[101] py-1 w-48 rounded-lg bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] font-mono text-xs font-bold"
                                style={
                                  downloadTriggerRef.current
                                    ? (() => {
                                        const rect = downloadTriggerRef.current!.getBoundingClientRect();
                                        const w = 192;
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
                                  className="w-full text-left px-4 py-2.5 text-[#1C2028] hover:bg-white rounded-t-lg transition-colors border-b border-gray-200"
                                >
                                  📄 Download as PDF
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(resume.id, "markdown")}
                                  className="w-full text-left px-4 py-2.5 text-[#1C2028] hover:bg-white rounded-b-lg transition-colors"
                                >
                                  📝 Download as Markdown
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
                        className="neo-btn w-full sm:w-auto px-3 py-2 text-xs font-mono font-bold uppercase rounded text-white bg-[#FF5722] hover:bg-[#E64A19] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-colors"
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
                  <tr className="border-b-2 border-[#1C2028]">
                    <th className="pb-3 text-xs font-mono font-bold text-gray-700 uppercase tracking-wider w-[320px]">Job Title</th>
                    <th className="pb-3 text-xs font-mono font-bold text-gray-700 uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1.5">
                        Date Created
                        <span
                          className="inline-flex flex-col text-[#FF5722]"
                          title="Sorted by date (newest first)"
                        >
                          <svg
                            className="w-3.5 h-3.5 text-[#FF5722]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden
                          >
                            <path d="M5 12l5-5 5 5H5z" />
                          </svg>
                        </span>
                      </span>
                    </th>
                    <th className="pb-3 text-xs font-mono font-bold text-gray-700 uppercase tracking-wider">Match Score</th>
                    <th className="pb-3 text-xs font-mono font-bold text-gray-700 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentResumes.map((resume) => (
                    <tr key={resume.id} className="border-b border-gray-300 hover:bg-white/60 transition-colors">
                      <td className="py-4 text-[#1C2028] font-bold font-mono text-sm w-[320px]" title={resume.jobTitle}>
                        <span className="block truncate">{resume.jobTitle}</span>
                      </td>
                      <td className="py-4 text-gray-700 font-mono text-xs">
                        {new Date(resume.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-4">
                        <span className="neo-tag bg-[#ECFDF5] text-[#065F46] border border-[#10B981] text-xs font-mono font-bold px-2 py-0.5">
                          {resume.matchScore}%
                        </span>
                        {(resume.versionCount != null && resume.versionCount > 1) || resume.bestMatchScore != null ? (
                          <span className="block text-xs font-mono text-gray-500 mt-1">
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
                              className="neo-btn px-3 py-1.5 text-xs font-mono font-bold uppercase rounded text-[#1C2028] bg-white border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA] transition-colors"
                              onClick={() => {
                                analytics.trackEvent(analytics.events.TAILOR_ANOTHER_JOB_CLICK, {
                                  ...analytics.getTrackingContext({ section: "resume_table", element: "link", label: "Add version", resumeId: resume.id, source: "profile" }),
                                });
                              }}
                            >
                              Add version
                            </Link>
                            <AddVersionInfoPopover
                              content="Get another tailored resume for this job. The job description stays filled in so you can run again—tweak it or leave it as is. Every result is saved in your history."
                              ariaLabel="Get another tailored resume for this job. Job description stays filled in; you can change it or run again. Every result is saved in your history."
                            />
                          </span>
                          <button
                            onClick={() => {
                              analytics.trackEvent(analytics.events.VIEW_RESUME_CLICK, {
                                ...analytics.getTrackingContext({ section: "resume_table", element: "view_resume", resumeId: resume.id, jobTitle: resume.jobTitle?.slice(0, 80) }),
                              });
                              router.push(`/resume/${resume.id}`);
                            }}
                            className="neo-btn px-3 py-1.5 text-xs font-mono font-bold uppercase rounded text-[#1C2028] bg-[#F4F1EA] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-white transition-colors"
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
                                className="neo-btn px-3 py-1.5 text-xs font-mono font-bold uppercase rounded text-white bg-[#10B981] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#059669] transition-colors disabled:opacity-50"
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
                                      className="fixed z-[101] py-1 w-48 rounded-lg bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] font-mono text-xs font-bold"
                                      style={
                                        downloadTriggerRef.current
                                          ? (() => {
                                              const rect = downloadTriggerRef.current!.getBoundingClientRect();
                                              const w = 192;
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
                                        className="w-full text-left px-4 py-2.5 text-[#1C2028] hover:bg-white rounded-t-lg transition-colors border-b border-gray-200"
                                      >
                                        📄 Download as PDF
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDownload(resume.id, "markdown")}
                                        className="w-full text-left px-4 py-2.5 text-[#1C2028] hover:bg-white rounded-b-lg transition-colors"
                                      >
                                        📝 Download as Markdown
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
                              className="neo-btn px-3 py-1.5 text-xs font-mono font-bold uppercase rounded text-white bg-[#FF5722] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#E64A19] transition-colors"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 pt-6 border-t-2 border-[#1C2028]">
                <div className="text-xs font-mono text-gray-600 order-2 sm:order-1">
                  Showing {startIndex + 1} to {endIndex} of {totalCount} resumes
                </div>
                <div className="flex items-center gap-2 order-1 sm:order-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase rounded text-[#1C2028] bg-white border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-xs font-mono font-bold text-[#1C2028] px-2">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase rounded text-[#1C2028] bg-white border border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

