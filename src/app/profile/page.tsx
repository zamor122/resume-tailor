"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";
import TierSelectionModal from "@/app/components/TierSelectionModal";
import { hasActiveAccess, getAccessInfo } from "@/app/utils/accessManager";
import { useRouter } from "next/navigation";
import { downloadResumeAsPdf, downloadResumeAsMarkdown, resumeDownloadFilename } from "@/app/utils/resumeDownload";

interface ResumeItem {
  id: string;
  createdAt: string;
  jobTitle: string;
  matchScore: number;
  improvementMetrics: Record<string, unknown>;
  isUnlocked?: boolean;
}

const ITEMS_PER_PAGE = 10;

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [tierModalResumeId, setTierModalResumeId] = useState<string | undefined>(undefined);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessInfo, setAccessInfo] = useState<any>(null);
  const [downloadDropdownId, setDownloadDropdownId] = useState<string | null>(null);
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null);
  const downloadTriggerRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();

  const fetchResumes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/resume/list?userId=${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setResumes(data.resumes || []);
      } else {
        console.error("Failed to fetch resumes");
      }
    } catch (error) {
      console.error("Error fetching resumes:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchResumes();
      checkAccess();
    } else if (!authLoading && !user) {
      setLoading(false);
      setHasAccess(false);
    }
  }, [user, authLoading, fetchResumes]);

  // Refetch when user returns to the tab (e.g. after tailoring in another tab)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && user) fetchResumes();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user, fetchResumes]);

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
          returnUrl: `${window.location.origin}/profile`,
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
        setPdfLoadingId(resumeId);
        try {
          await downloadResumeAsPdf(content, `${baseName}.pdf`);
        } finally {
          setPdfLoadingId(null);
        }
      } else {
        downloadResumeAsMarkdown(content, `${baseName}.md`);
      }
    } catch (error) {
      console.error("Error downloading resume:", error);
      alert("Failed to download resume. Please try again.");
    }
  };

  const sortedResumes = [...resumes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const totalPages = Math.ceil(sortedResumes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentResumes = sortedResumes.slice(startIndex, endIndex);

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
            fetchResumes();
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Profile</h1>
          <p className="text-gray-300">
            Signed in as <span className="font-medium text-white">{user.email}</span>
          </p>
        </div>
          <div className="flex items-center gap-3">
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

      <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Resume History</h2>
          <button
            type="button"
            onClick={() => fetchResumes()}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50"
            title="Refresh list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        
        {resumes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No resumes found.</p>
            <p className="text-gray-500 mt-2">Start tailoring your resume to see it here.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
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
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => router.push(`/resume/${resume.id}`)}
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
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(endIndex, resumes.length)} of {resumes.length} resumes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-sm text-gray-300">
                    Page {currentPage} of {totalPages}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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
    </>
  );
}

