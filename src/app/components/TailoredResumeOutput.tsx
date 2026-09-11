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

function extractTextContent(children: React.ReactNode): string {
  if (!children) return "";
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map(extractTextContent).join("");
  }
  if (typeof children === "object" && "props" in children && (children as any).props?.children) {
    return extractTextContent((children as any).props.children);
  }
  return "";
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
  const hasSuggestions = suggestions && suggestions.length > 0;
  const [viewLayout, setViewLayout] = useState<"cockpit" | "document">(
    hasSuggestions ? "cockpit" : "document"
  );
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(
    suggestions?.[0]?.id ?? null
  );

  React.useEffect(() => {
    if (hasSuggestions && !activeSuggestionId) {
      setActiveSuggestionId(suggestions[0].id);
    }
  }, [hasSuggestions, suggestions, activeSuggestionId]);

  // Compute live active resume text from suggestions if available
  const activeResumeText = useMemo(() => {
    if (originalResume && hasSuggestions) {
      return applySuggestionsToOriginal(originalResume, suggestions);
    }
    return newResume;
  }, [originalResume, suggestions, hasSuggestions, newResume]);

  const displayResume = useMemo(() => {
    const deduped = deduplicateResumeSections(activeResumeText);
    // Ensure every line has proper markdown newline formatting so it never collapses into a single paragraph
    return deduped
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (/^[-*•–—]\s+/.test(trimmed)) {
          return `- ${trimmed.replace(/^[-*•–—]\s+/, "")}`;
        }
        if (/^(Summary|Experience|Skills|Education|Projects|Certifications|Awards)/i.test(trimmed) && !trimmed.startsWith("#")) {
          return `\n## ${trimmed}\n`;
        }
        return line;
      })
      .join("\n\n");
  }, [activeResumeText]);

  const proseFontSizeClass = getProseFontSizeClass(fontSize);
  const formatStyles = formatSpec ? {
    fontFamily: formatSpec.fontFamily,
    fontSize: `${formatSpec.fontSize.base}pt`,
    lineHeight: formatSpec.lineHeight,
    padding: `${formatSpec.margins.top}px ${formatSpec.margins.right}px ${formatSpec.margins.bottom}px ${formatSpec.margins.left}px`,
  } : undefined;

  const findMatchingSuggestion = (text: string) => {
    if (!text || !hasSuggestions) return null;
    const clean = text.replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
    if (clean.length < 5) return null;

    for (let i = 0; i < suggestions.length; i++) {
      const s = suggestions[i];
      const origClean = (s.originalText || "").replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();
      const suggClean = (s.suggestedText || "").replace(/^[-*•–—\d.]+\s*/, "").trim().toLowerCase();

      const matchesOrig = origClean && (clean.includes(origClean) || origClean.includes(clean) || (origClean.length > 20 && clean.slice(0, 25) === origClean.slice(0, 25)));
      const matchesSugg = suggClean && (clean.includes(suggClean) || suggClean.includes(clean) || (suggClean.length > 20 && clean.slice(0, 25) === suggClean.slice(0, 25)));

      if (matchesOrig || matchesSugg) {
        return { suggestion: s, index: i };
      }
    }
    return null;
  };

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

  // Common Markdown components with active change highlighting
  const renderMarkdownCanvas = (isSplit = false) => (
    <div
      className={`prose prose-emerald dark:prose-invert max-w-none resume-prose ${proseFontSizeClass} pb-4`}
      style={formatStyles}
      data-format-spec={formatSpec ? JSON.stringify(formatSpec) : undefined}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 text-center !mt-0 !mb-2 tracking-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-cyan-700 dark:text-cyan-400 border-b-2 border-cyan-500/30 dark:border-cyan-500/20 !mt-6 !mb-2.5 pb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 !mt-3 !mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => {
            const rawText = extractTextContent(children);
            const match = isSplit ? findMatchingSuggestion(rawText) : null;
            const isActive = match && match.suggestion.id === activeSuggestionId;
            const isAccepted = match ? match.suggestion.status !== "rejected" : false;

            if (match && isSplit) {
              return (
                <div
                  onClick={() => setActiveSuggestionId(match.suggestion.id)}
                  className={`my-2 p-3 rounded-xl transition-all duration-300 cursor-pointer ${
                    isActive
                      ? "ring-2 ring-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/40 shadow-md"
                      : "hover:bg-cyan-500/5 border border-transparent rounded-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      {isActive && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />}
                      Change {match.index + 1} ({match.suggestion.section})
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = suggestions.map((s) =>
                            s.id === match.suggestion.id ? { ...s, status: "accepted" as const } : s
                          );
                          onSuggestionsChange?.(updated);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isAccepted
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}
                      >
                        ✓ Accept
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = suggestions.map((s) =>
                            s.id === match.suggestion.id ? { ...s, status: "rejected" as const } : s
                          );
                          onSuggestionsChange?.(updated);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          !isAccepted
                            ? "bg-gray-700 text-white shadow-xs"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        ✕ Keep Original
                      </button>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 !my-0 whitespace-pre-line font-medium">
                    {children}
                  </p>
                </div>
              );
            }

            return (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 !my-1.5 whitespace-pre-line">
                {children}
              </p>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc !pl-5 space-y-2 !my-2.5 text-sm text-gray-700 dark:text-gray-300">
              {children}
            </ul>
          ),
          li: ({ children }) => {
            const rawText = extractTextContent(children);
            const match = isSplit ? findMatchingSuggestion(rawText) : null;
            const isActive = match && match.suggestion.id === activeSuggestionId;
            const isAccepted = match ? match.suggestion.status !== "rejected" : false;

            if (match && isSplit) {
              return (
                <li
                  onClick={() => setActiveSuggestionId(match.suggestion.id)}
                  className={`leading-relaxed pl-0.5 transition-all duration-300 cursor-pointer list-none -ml-5 my-1.5 p-2.5 rounded-xl ${
                    isActive
                      ? "ring-2 ring-cyan-500 bg-cyan-500/10 dark:bg-cyan-950/40 border border-cyan-500/50 shadow-md font-medium text-gray-900 dark:text-white"
                      : "hover:bg-cyan-500/5 border border-transparent rounded-lg text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                      {isActive && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />}
                      Change {match.index + 1}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = suggestions.map((s) =>
                            s.id === match.suggestion.id ? { ...s, status: "accepted" as const } : s
                          );
                          onSuggestionsChange?.(updated);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          isAccepted
                            ? "bg-emerald-500 text-white shadow-xs"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                        }`}
                      >
                        ✓ Accept
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = suggestions.map((s) =>
                            s.id === match.suggestion.id ? { ...s, status: "rejected" as const } : s
                          );
                          onSuggestionsChange?.(updated);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          !isAccepted
                            ? "bg-gray-700 text-white shadow-xs"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                        }`}
                      >
                        ✕ Keep Original
                      </button>
                    </div>
                  </div>
                  <div>• {children}</div>
                </li>
              );
            }

            return (
              <li className="leading-relaxed pl-0.5">
                {children}
              </li>
            );
          },
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
  );

  return (
    <div className="resume-output-container bg-white/90 dark:bg-gray-900/95 backdrop-blur-lg transition-all duration-300 rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-200/80 dark:border-gray-800">
      {/* Top Header & Layout Controls */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Tailored Resume
          </h2>
          {hasSuggestions && (
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 shadow-inner">
              <button
                type="button"
                onClick={() => setViewLayout("cockpit")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewLayout === "cockpit"
                    ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                ⚡ Review Cockpit ({suggestions.length})
              </button>
              <button
                type="button"
                onClick={() => setViewLayout("document")}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewLayout === "document"
                    ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                📄 Full Document
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

      {/* VIEW MODE 1: SIDE-BY-SIDE REVIEW COCKPIT */}
      {viewLayout === "cockpit" && hasSuggestions ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Reviewer Panel (Sticky on desktop) */}
          <div className="xl:col-span-5 space-y-4 xl:sticky xl:top-20">
            <ResumeSuggestionReviewer
              originalResume={originalResume || displayResume}
              suggestions={suggestions}
              onSuggestionsChange={onSuggestionsChange || (() => {})}
              isUnlocked={isUnlocked}
              onUnlockRequest={onUnlockRequest}
              beforeScore={beforeScore}
              matchScore={matchScore}
              activeSuggestionId={activeSuggestionId}
              onActiveSuggestionChange={setActiveSuggestionId}
            />
          </div>

          {/* Right Live Resume Canvas */}
          <div className="xl:col-span-7 bg-gray-50/70 dark:bg-gray-950/70 p-4 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-semibold flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                <span>📄 Live Document Preview</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  Interactive
                </span>
              </span>
              <span className="text-[11px] text-gray-500">
                Click any highlighted bullet to inspect
              </span>
            </div>
            {renderMarkdownCanvas(true)}
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: FULL DOCUMENT VIEW */
        <div className="bg-white dark:bg-gray-950 p-6 sm:p-8 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-sm">
          {renderMarkdownCanvas(false)}
        </div>
      )}
    </div>
  );
};

export default TailoredResumeOutput;
