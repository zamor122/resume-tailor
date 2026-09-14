"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange } from "@/app/utils/resumeReassemble";

export interface ResumeSuggestionReviewerProps {
  originalResume: string;
  suggestions: ResumeSuggestion[];
  sectionGroups?: ResumeSectionGroup[];
  onSectionGroupsChange?: (groups: ResumeSectionGroup[]) => void;
  onSuggestionsChange: (suggestions: ResumeSuggestion[]) => void;
  activeSectionId?: string | null;
  onActiveSectionChange?: (sectionId: string | null) => void;
  beforeScore?: number;
  matchScore?: number;
  jobDescription?: string;
  jobTitle?: string;
  resumeAST?: any;
  isUnlocked?: boolean;
  onUnlockRequest?: () => void;
  activeSuggestionId?: string | null;
  onActiveSuggestionChange?: (suggestionId: string | null) => void;
  className?: string;
  onFinalize?: () => void;
}

export default function ResumeSuggestionReviewer({
  originalResume,
  suggestions = [],
  sectionGroups,
  onSectionGroupsChange,
  onSuggestionsChange,
  activeSectionId,
  onActiveSectionChange,
  beforeScore = 50,
  matchScore = 85,
  jobDescription,
  jobTitle,
  resumeAST,
  isUnlocked = true,
  onUnlockRequest,
  activeSuggestionId,
  onActiveSuggestionChange,
  className = "",
  onFinalize,
}: ResumeSuggestionReviewerProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Topmost Layer Filtering: discard trivial newline, whitespace, bullet, and empty changes
  const substantiveSuggestions = useMemo(
    () => suggestions.filter((s) => isSubstantiveChange(s.originalText, s.suggestedText)),
    [suggestions]
  );

  const totalCount = substantiveSuggestions.length;

  // Group substantive suggestions by section for clean document flow
  const groupedSuggestions = useMemo(() => {
    const groups: { section: string; items: ResumeSuggestion[] }[] = [];
    const sectionMap = new Map<string, ResumeSuggestion[]>();

    substantiveSuggestions.forEach((sug) => {
      const sectionName = sug.section || "General Review";
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
        groups.push({ section: sectionName, items: sectionMap.get(sectionName)! });
      }
      sectionMap.get(sectionName)!.push(sug);
    });

    return groups;
  }, [substantiveSuggestions]);

  // Keep active index within bounds
  useEffect(() => {
    if (activeIndex >= totalCount && totalCount > 0) {
      setActiveIndex(totalCount - 1);
    }
  }, [totalCount, activeIndex]);

  // Synchronize when external activeSuggestionId changes
  useEffect(() => {
    if (activeSuggestionId && totalCount > 0) {
      const idx = substantiveSuggestions.findIndex((s) => s.id === activeSuggestionId);
      if (idx !== -1 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }, [activeSuggestionId, substantiveSuggestions, totalCount, activeIndex]);

  // Upfront score calculation divided proportionally per substantive change
  const acceptedCount = useMemo(
    () => substantiveSuggestions.filter((s) => s.status === "accepted").length,
    [substantiveSuggestions]
  );
  const dismissedCount = useMemo(
    () => substantiveSuggestions.filter((s) => s.status === "rejected").length,
    [substantiveSuggestions]
  );
  const remainingCount = useMemo(
    () => substantiveSuggestions.filter((s) => !s.status || s.status === "pending").length,
    [substantiveSuggestions]
  );

  const totalBoost = Math.max(0, matchScore - beforeScore);
  const boostPerChange = totalCount > 0 ? totalBoost / totalCount : 0;
  const currentBoost = Math.round(acceptedCount * boostPerChange);
  const liveScore = Math.min(100, Math.round(beforeScore + currentBoost));

  // Navigation and scroll-to-line handler
  const handleSelectIndex = (idx: number) => {
    if (idx < 0 || idx >= totalCount) return;
    setActiveIndex(idx);
    const sug = substantiveSuggestions[idx];
    if (sug) {
      onActiveSuggestionChange?.(sug.id);
      const rowEl = rowRefs.current.get(sug.id);
      if (rowEl && typeof rowEl.scrollIntoView === "function") {
        rowEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  };

  const handleNext = () => {
    if (activeIndex < totalCount - 1) {
      handleSelectIndex(activeIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (activeIndex > 0) {
      handleSelectIndex(activeIndex - 1);
    }
  };

  // Change action handlers
  const handleAcceptChange = (id: string) => {
    const updated = suggestions.map((s) =>
      s.id === id ? { ...s, status: "accepted" as const } : s
    );
    onSuggestionsChange(updated);
  };

  const handleKeepOriginal = (id: string) => {
    const updated = suggestions.map((s) =>
      s.id === id ? { ...s, status: "rejected" as const } : s
    );
    onSuggestionsChange(updated);
  };

  const handleAcceptAllRemaining = () => {
    const updated = suggestions.map((s) =>
      !s.status || s.status === "pending" ? { ...s, status: "accepted" as const } : s
    );
    onSuggestionsChange(updated);
  };

  const handleKeepAllRemaining = () => {
    const updated = suggestions.map((s) =>
      !s.status || s.status === "pending" ? { ...s, status: "rejected" as const } : s
    );
    onSuggestionsChange(updated);
  };

  // Inline editing
  const handleStartEdit = (sug: ResumeSuggestion) => {
    setEditingId(sug.id);
    setEditText(sug.suggestedText);
  };

  const handleSaveEdit = (id: string) => {
    const updated = suggestions.map((s) =>
      s.id === id ? { ...s, suggestedText: editText.trim(), status: "accepted" as const } : s
    );
    onSuggestionsChange(updated);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  // Highlight keywords cleanly without visual noise
  const renderHighlightedKeywords = (text: string, keywords?: string[]) => {
    if (!keywords || keywords.length === 0 || !text) return text;
    const valid = keywords
      .map((k) => k.trim())
      .filter((k) => k.length > 1);
    if (valid.length === 0) return text;

    try {
      const escaped = valid.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      const regex = new RegExp(`(${escaped.join("|")})`, "gi");
      const parts = text.split(regex);
      return parts.map((part, i) => {
        const isKw = valid.some((k) => k.toLowerCase() === part.toLowerCase());
        if (isKw) {
          return (
            <mark
              key={i}
              className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 px-1 py-0.5 rounded font-semibold border-b border-emerald-500/40"
            >
              {part}
            </mark>
          );
        }
        return part;
      });
    } catch {
      return text;
    }
  };

  if (totalCount === 0) {
    return (
      <div className={`p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-center space-y-3 ${className}`}>
        <span className="text-3xl">🎉</span>
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
          All Sections Aligned
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Your resume content already matches the key qualifications and requirements for this role.
        </p>
        {onFinalize && (
          <button
            type="button"
            onClick={onFinalize}
            className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow transition-all"
          >
            Finish & View Resume →
          </button>
        )}
      </div>
    );
  }

  let globalIndexCounter = 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sticky Top Header: Tri-Color Progress Bar & ATS Score Boost */}
      <div className="sticky top-2 z-20 p-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-800 text-white border border-gray-700/80 shadow-lg space-y-3 backdrop-blur-md">
        {/* Score & Counters Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Change {activeIndex + 1} of {totalCount}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-medium text-gray-300">
                {substantiveSuggestions[activeIndex]?.section || "Resume Review"}
              </span>
            </div>
          </div>

          {/* Dynamic Score Badge */}
          <div className="flex items-center gap-2.5 bg-black/40 px-3 py-1.5 rounded-xl border border-gray-700/60 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
              ATS Match:
            </span>
            <div className="flex items-center gap-1 font-bold">
              <span className="text-gray-400 text-xs">{beforeScore}%</span>
              <span className="text-cyan-400 text-[10px]">→</span>
              <span className="text-emerald-400 text-sm font-extrabold">{liveScore}%</span>
            </div>
            {currentBoost > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                +{currentBoost}%
              </span>
            )}
          </div>
        </div>

        {/* Tri-Color Segmented Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 w-full h-3 rounded-full bg-gray-800/80 p-0.5 overflow-hidden">
            {substantiveSuggestions.map((s, idx) => {
              const isAcc = s.status === "accepted";
              const isRej = s.status === "rejected";
              const isCur = idx === activeIndex;

              const bg = isAcc
                ? "bg-emerald-500"
                : isRej
                ? "bg-rose-500"
                : "bg-gray-600/80";

              return (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  title={`Change ${idx + 1}: ${s.section} (${isAcc ? "Accepted" : isRej ? "Kept Original" : "Unreviewed"})`}
                  className={`h-full flex-1 rounded-[2px] transition-all cursor-pointer ${bg} ${
                    isCur
                      ? "ring-2 ring-cyan-300 scale-y-125 z-10"
                      : "opacity-80 hover:opacity-100"
                  }`}
                />
              );
            })}
          </div>

          {/* Metric Labels & Bulk Shortcuts */}
          <div className="flex items-center justify-between text-xs text-gray-400 flex-wrap gap-2 pt-0.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <strong className="text-emerald-400 font-bold">{acceptedCount}</strong> Accepted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                <strong className="text-rose-400 font-bold">{dismissedCount}</strong> Kept
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-500 shrink-0" />
                <strong className="text-gray-300 font-bold">{remainingCount}</strong> Remaining
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAcceptAllRemaining}
                disabled={remainingCount === 0}
                className="px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Accept all remaining unreviewed changes"
              >
                Accept All Remaining
              </button>
              <span className="text-gray-600">•</span>
              <button
                type="button"
                onClick={handleKeepAllRemaining}
                disabled={remainingCount === 0}
                className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Keep all remaining unreviewed changes as original"
              >
                Keep All Remaining
              </button>
            </div>
          </div>
        </div>

        {/* Global Navigation Controls */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-700/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={handlePrevious}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={activeIndex === totalCount - 1}
              onClick={handleNext}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              Next →
            </button>
          </div>

          {onFinalize && (
            <button
              type="button"
              onClick={onFinalize}
              className="px-3.5 py-1 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-500 shadow transition-all active:scale-95"
            >
              ✓ Finish & View Resume →
            </button>
          )}
        </div>
      </div>

      {/* Line-by-Line Document Diff List (Showing EVERYTHING in document order) */}
      <div className="space-y-6">
        {groupedSuggestions.map((group) => (
          <div
            key={group.section}
            className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 shadow-sm overflow-hidden"
          >
            {/* Section Header */}
            <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
              <h4 className="text-xs font-bold tracking-wide uppercase text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <span>📁</span>
                <span>{group.section}</span>
              </h4>
              <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                {group.items.length} {group.items.length === 1 ? "change" : "changes"}
              </span>
            </div>

            {/* Section Items */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {group.items.map((sug) => {
                const currentIdx = globalIndexCounter++;
                const isCur = currentIdx === activeIndex;
                const isAddition = !sug.originalText || !sug.originalText.trim();
                const isAcc = sug.status === "accepted";
                const isRej = sug.status === "rejected";
                const isPending = !sug.status || sug.status === "pending";
                const isEditing = editingId === sug.id;

                const statusRing = isAcc
                  ? "border-l-4 border-l-emerald-500"
                  : isRej
                  ? "border-l-4 border-l-rose-500"
                  : "border-l-4 border-l-amber-400";

                return (
                  <div
                    key={sug.id}
                    id={`suggestion-row-${sug.id}`}
                    ref={(el) => {
                      if (el) rowRefs.current.set(sug.id, el);
                      else rowRefs.current.delete(sug.id);
                    }}
                    onClick={() => setActiveIndex(currentIdx)}
                    className={`p-4 transition-all space-y-3 cursor-pointer ${statusRing} ${
                      isCur
                        ? "bg-cyan-50/30 dark:bg-cyan-950/15 ring-1 ring-cyan-400/40"
                        : "hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                    }`}
                  >
                    {/* Row Header with Badge & Edit */}
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-500 dark:text-gray-400 text-[11px]">
                          #{currentIdx + 1}
                        </span>
                        {isPending ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                            ● Pending Choice
                          </span>
                        ) : isAcc ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                            ✓ Tailored Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                            ✕ Original Kept
                          </span>
                        )}
                      </div>

                      {!isEditing && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(sug);
                          }}
                          className="px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          ✎ Adjust / Edit
                        </button>
                      )}
                    </div>

                    {/* Inline Edit Mode */}
                    {isEditing ? (
                      <div className="space-y-2 pt-1" onClick={(e) => e.stopPropagation()}>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={3}
                          className="w-full p-2.5 text-sm rounded-xl border border-cyan-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(sug.id)}
                            className="px-4 py-1 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow"
                          >
                            Save & Accept
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Simplified Line Diff: Soft Red (-) & Soft Green (+) */
                      <div className="space-y-2 font-sans">
                        {/* Red Line: Original (Only shown if modifying an existing line) */}
                        {!isAddition && (
                          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-rose-500/10 dark:bg-rose-950/25 border-l-4 border-rose-500 text-rose-950 dark:text-rose-200">
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-none shrink-0 text-sm">
                              -
                            </span>
                            <div className="text-sm leading-relaxed">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-0.5">
                                Original (Before):
                              </span>
                              <span>{sug.originalText.replace(/^[-*•–—]\s*/, "")}</span>
                            </div>
                          </div>
                        )}

                        {/* Green Line: Tailored Replacement or Addition */}
                        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border-l-4 border-emerald-500 text-emerald-950 dark:text-emerald-200">
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 select-none shrink-0 text-sm">
                            +
                          </span>
                          <div className="text-sm leading-relaxed">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                {isAddition ? "Tailored (Addition):" : "Tailored (Enhanced):"}
                              </span>
                              {isAddition && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                                  + New bullet added
                                </span>
                              )}
                            </div>
                            <span>
                              {renderHighlightedKeywords(
                                sug.suggestedText.replace(/^[-*•–—]\s*/, ""),
                                sug.keywords
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Plain-English Rationale */}
                    {sug.reason && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        💡 <span className="font-medium text-gray-700 dark:text-gray-300">Why:</span> {sug.reason}
                      </p>
                    )}

                    {/* Action Controls for this line */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAcceptChange(sug.id);
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                          isAcc
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
                        }`}
                      >
                        <span>✓</span> Accept Change
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleKeepOriginal(sug.id);
                        }}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${
                          isRej
                            ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        <span>✕</span> {isAddition ? "Dismiss Addition" : "Keep Original"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
