"use client";

import React, { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import CopyButton from "./CopyButton";
import ResumeDownloadButton from "./ResumeDownloadButton";
import ResumeSuggestionReviewer from "./ResumeSuggestionReviewer";
import { getProseFontSizeClass } from "@/app/utils/fontSize";
import { deduplicateResumeSections } from "@/app/utils/resumeSectionDedupe";
import { applySuggestionsToOriginal } from "@/app/utils/resumeReassemble";
import type { FormatSpec } from "@/app/types/format";
import type { ResumeSuggestion } from "@/app/types/humanize";

interface TailoredResumeOutputProps {
  newResume: string;
  originalResume?: string;
  suggestions?: ResumeSuggestion[];
  onSuggestionsChange?: (updatedSuggestions: ResumeSuggestion[]) => void;
  loading: boolean;
  detectedTitle?: string;
  error?: string;
  fontSize?: "small" | "medium" | "large";
  formatSpec?: FormatSpec | null;
  /** Show PDF / Markdown download buttons (MLA-style margins). */
  showDownload?: boolean;
  /** Job title for download filename. */
  downloadJobTitle?: string;
  /** Resume ID for analytics. */
  resumeId?: string;
  isUnlocked?: boolean;
  onUnlockRequest?: () => void;
  beforeScore?: number;
  matchScore?: number;
}

const TailoredResumeOutput: React.FC<TailoredResumeOutputProps> = ({ 
  newResume, 
  originalResume,
  suggestions = [],
  onSuggestionsChange,
  loading,
  error,
  fontSize = "medium",
  formatSpec = null,
  showDownload = false,
  downloadJobTitle,
  resumeId,
  isUnlocked = true,
  onUnlockRequest,
  beforeScore = 50,
  matchScore = 85,
}) => {
  const [viewTab, setViewTab] = useState<"suggestions" | "document">(
    suggestions && suggestions.length > 0 ? "suggestions" : "document"
  );

  // Compute live active resume text from suggestions if available
  const activeResumeText = useMemo(() => {
    if (originalResume && suggestions && suggestions.length > 0) {
      return applySuggestionsToOriginal(originalResume, suggestions);
    }
    return newResume;
  }, [originalResume, suggestions, newResume]);

  const displayResume = useMemo(() => deduplicateResumeSections(activeResumeText), [activeResumeText]);
  const proseFontSizeClass = getProseFontSizeClass(fontSize);
  const formatStyles = formatSpec ? {
    fontFamily: formatSpec.fontFamily,
    fontSize: `${formatSpec.fontSize.base}pt`,
    lineHeight: formatSpec.lineHeight,
    padding: `${formatSpec.margins.top}px ${formatSpec.margins.right}px ${formatSpec.margins.bottom}px ${formatSpec.margins.left}px`,
  } : undefined;
  if (error) {
    return (
      <div className="mb-4 p-4 bg-pink-50 dark:bg-red-900/20 text-pink-600 dark:text-red-400 rounded-lg">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="resume-output-container">
        <div className="animate-pulse space-y-4">
          <div className="flex justify-between">
            <div className="h-7 bg-emerald-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-7 w-12 bg-emerald-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-emerald-100 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-output-container bg-white/90 dark:bg-gray-900 backdrop-blur-lg transition-all duration-300">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Tailored Resume
          </h2>
          {suggestions && suggestions.length > 0 && (
            <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setViewTab("suggestions")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewTab === "suggestions"
                    ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                ✨ Review Changes ({suggestions.length})
              </button>
              <button
                type="button"
                onClick={() => setViewTab("document")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewTab === "document"
                    ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                📄 Formatted Document
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showDownload && (
            <ResumeDownloadButton
              markdownContent={displayResume}
              jobTitle={downloadJobTitle}
              variant="buttons"
              resumeId={resumeId}
              source="resume_detail"
              section="output"
            />
          )}
          <CopyButton text={displayResume} resumeId={resumeId} source="resume_detail" section="output" />
        </div>
      </div>

      {viewTab === "suggestions" && suggestions && suggestions.length > 0 ? (
        <ResumeSuggestionReviewer
          originalResume={originalResume || displayResume}
          suggestions={suggestions}
          onSuggestionsChange={onSuggestionsChange || (() => {})}
          isUnlocked={isUnlocked}
          onUnlockRequest={onUnlockRequest}
          beforeScore={beforeScore}
          matchScore={matchScore}
        />
      ) : (
        <div
          className={`prose prose-emerald dark:prose-invert max-w-none resume-prose ${proseFontSizeClass} pb-4`}
          style={formatStyles}
          data-format-spec={formatSpec ? JSON.stringify(formatSpec) : undefined}
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 text-center !mt-0 !mb-2 tracking-tight">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 border-b border-gray-300 dark:border-gray-700 !mt-5 !mb-2 pb-1">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 !mt-2.5 !mb-0.5">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 !my-1.5">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc !pl-5 space-y-1.5 !my-2 text-sm text-gray-700 dark:text-gray-300">
                  {children}
                </ul>
              ),
              li: ({ children }) => (
                <li className="leading-relaxed pl-0.5">
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-gray-900 dark:text-gray-100">
                  {children}
                </strong>
              ),
            }}
          >
            {displayResume}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default TailoredResumeOutput;
