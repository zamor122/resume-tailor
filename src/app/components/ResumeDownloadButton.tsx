"use client";

import React, { useState } from "react";
import {
  downloadResumeAsPdf,
  downloadResumeAsMarkdown,
  resumeDownloadFilename,
  resumeDownloadFilenamePdf,
} from "@/app/utils/resumeDownload";
import { analytics } from "@/app/services/analytics";
import { useFeedback } from "@/app/contexts/FeedbackContext";
import PdfTemplateSelectModal from "./PdfTemplateSelectModal";

interface ResumeDownloadButtonProps {
  markdownContent: string;
  jobTitle?: string;
  variant?: "buttons" | "dropdown";
  className?: string;
  resumeId?: string;
  /** Where download was triggered: resume_detail or profile */
  source?: "resume_detail" | "profile";
  /** UI section for analytics */
  section?: string;
}

const ResumeDownloadButton: React.FC<ResumeDownloadButtonProps> = ({
  markdownContent,
  jobTitle = "",
  variant = "buttons",
  className = "",
  resumeId,
  source = "resume_detail",
  section,
}) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPdfTemplateModal, setShowPdfTemplateModal] = useState(false);
  const baseName = resumeDownloadFilename(jobTitle || "resume");
  const feedback = useFeedback();

  const downloadWithTemplate = async (templateId: string) => {
    setPdfLoading(true);
    try {
      const pdfFilename = resumeDownloadFilenamePdf(baseName, templateId);
      await downloadResumeAsPdf(markdownContent, pdfFilename, templateId);
      analytics.trackEvent(analytics.events.EXPORT_RESUME, {
        ...analytics.getTrackingContext({ section, resumeId, jobTitle: jobTitle || undefined }),
        element: "download_pdf",
        format: "pdf",
        source,
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
      setPdfLoading(false);
    }
  };

  const openPdfModal = () => {
    setDropdownOpen(false);
    setShowPdfTemplateModal(true);
  };

  const handleMarkdown = () => {
    downloadResumeAsMarkdown(markdownContent, `${baseName}.md`);
    analytics.trackEvent(analytics.events.EXPORT_RESUME, {
      ...analytics.getTrackingContext({ section, resumeId, jobTitle: jobTitle || undefined }),
      element: "download_markdown",
      format: "markdown",
      source,
    });
    try {
      if (typeof window !== "undefined") sessionStorage.setItem("airesumetailor_converted", "1");
    } catch {
      // ignore
    }
    feedback?.showDidThisHelpPrompt("download");
    setDropdownOpen(false);
  };

  const buttonBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md";

  if (variant === "dropdown") {
    return (
      <>
        <div className={`relative inline-block ${className}`}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className={`${buttonBase} bg-cyan-100 hover:bg-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50`}
          >
            Download
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 mt-1 py-1 w-44 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                <button
                  type="button"
                  onClick={openPdfModal}
                  disabled={pdfLoading}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg disabled:opacity-50"
                >
                  {pdfLoading ? "Generating…" : "Download as PDF"}
                </button>
                <button
                  type="button"
                  onClick={handleMarkdown}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                >
                  Download as Markdown
                </button>
              </div>
            </>
          )}
        </div>
        <PdfTemplateSelectModal
          isOpen={showPdfTemplateModal}
          onClose={() => setShowPdfTemplateModal(false)}
          onSelect={(templateId) => {
            setShowPdfTemplateModal(false);
            downloadWithTemplate(templateId);
          }}
        />
      </>
    );
  }

  return (
    <>
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <button
          type="button"
          onClick={openPdfModal}
          disabled={pdfLoading}
          aria-label="Download resume as PDF"
          className={`${buttonBase} bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white shadow-cyan-500/20 disabled:opacity-50 font-semibold`}
        >
          {pdfLoading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Generating PDF…</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download PDF</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleMarkdown}
          aria-label="Download resume as Markdown or text"
          className={`${buttonBase} bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 font-medium`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Text / MD</span>
        </button>
      </div>
      <PdfTemplateSelectModal
        isOpen={showPdfTemplateModal}
        onClose={() => setShowPdfTemplateModal(false)}
        onSelect={(templateId) => {
          setShowPdfTemplateModal(false);
          downloadWithTemplate(templateId);
        }}
      />
    </>
  );
};

export default ResumeDownloadButton;
