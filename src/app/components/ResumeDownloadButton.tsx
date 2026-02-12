"use client";

import React, { useState } from "react";
import {
  downloadResumeAsPdf,
  downloadResumeAsMarkdown,
  resumeDownloadFilename,
} from "@/app/utils/resumeDownload";

interface ResumeDownloadButtonProps {
  markdownContent: string;
  jobTitle?: string;
  variant?: "buttons" | "dropdown";
  className?: string;
}

const ResumeDownloadButton: React.FC<ResumeDownloadButtonProps> = ({
  markdownContent,
  jobTitle = "",
  variant = "buttons",
  className = "",
}) => {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const baseName = resumeDownloadFilename(jobTitle || "resume");

  const handlePdf = async () => {
    setPdfLoading(true);
    try {
      await downloadResumeAsPdf(markdownContent, `${baseName}.pdf`);
    } catch (e) {
      console.error("PDF download failed:", e);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleMarkdown = () => {
    downloadResumeAsMarkdown(markdownContent, `${baseName}.md`);
    setDropdownOpen(false);
  };

  const buttonBase =
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md";

  if (variant === "dropdown") {
    return (
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
                onClick={handlePdf}
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
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handlePdf}
        disabled={pdfLoading}
        className={`${buttonBase} bg-cyan-100 hover:bg-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50 disabled:opacity-50`}
      >
        {pdfLoading ? "Generating…" : "PDF"}
      </button>
      <button
        type="button"
        onClick={handleMarkdown}
        className={`${buttonBase} bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50`}
      >
        Markdown
      </button>
    </div>
  );
};

export default ResumeDownloadButton;
