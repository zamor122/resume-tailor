"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange, isolatePreciseOriginalChange } from "@/app/utils/resumeReassemble";

export interface ResumeSuggestionReviewerProps {
  originalResume?: string;
  suggestions: ResumeSuggestion[];
  sectionGroups?: ResumeSectionGroup[];
  onSectionGroupsChange?: (groups: ResumeSectionGroup[]) => void;
  onSuggestionsChange?: (suggestions: ResumeSuggestion[]) => void;
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
  onAcceptSuggestion?: (id: string) => void;
  onRejectSuggestion?: (id: string) => void;
  onResetAll?: () => void;
}

export default function ResumeSuggestionReviewer({
  originalResume = "",
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
  onAcceptSuggestion,
  onRejectSuggestion,
  onResetAll,
}: ResumeSuggestionReviewerProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  // Topmost Layer Filtering: discard trivial newline, whitespace, bullet, and empty changes
  const substantiveSuggestions = useMemo(
    () => suggestions.filter((s) => isSubstantiveChange(s.originalText, s.suggestedText)),
    [suggestions]
  );

  const totalCount = substantiveSuggestions.length;

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

  // Navigation handler
  const handleSelectIndex = (idx: number) => {
    if (idx < 0 || idx >= totalCount) return;
    setActiveIndex(idx);
    const sug = substantiveSuggestions[idx];
    if (sug) {
      onActiveSuggestionChange?.(sug.id);
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

  // Change action handlers: toggle status on active change without premature auto-advance
  const handleAcceptChange = (id?: string) => {
    const targetId = id || substantiveSuggestions[activeIndex]?.id;
    if (!targetId) return;

    onAcceptSuggestion?.(targetId);
    const currentSug = suggestions.find((s) => s.id === targetId);
    const nextStatus: "pending" | "accepted" = currentSug?.status === "accepted" ? "pending" : "accepted";

    const updated = suggestions.map((s) =>
      s.id === targetId ? { ...s, status: nextStatus } : s
    );
    onSuggestionsChange?.(updated);
  };

  const handleKeepOriginal = (id?: string) => {
    const targetId = id || substantiveSuggestions[activeIndex]?.id;
    if (!targetId) return;

    onRejectSuggestion?.(targetId);
    const currentSug = suggestions.find((s) => s.id === targetId);
    const nextStatus: "pending" | "rejected" = currentSug?.status === "rejected" ? "pending" : "rejected";

    const updated = suggestions.map((s) =>
      s.id === targetId ? { ...s, status: nextStatus } : s
    );
    onSuggestionsChange?.(updated);
  };

  const handleAcceptAllRemaining = () => {
    const updated = suggestions.map((s) =>
      !s.status || s.status === "pending" ? { ...s, status: "accepted" as const } : s
    );
    onSuggestionsChange?.(updated);
  };

  const handleKeepAllRemaining = () => {
    const updated = suggestions.map((s) =>
      !s.status || s.status === "pending" ? { ...s, status: "rejected" as const } : s
    );
    onSuggestionsChange?.(updated);
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
    onSuggestionsChange?.(updated);
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

  const currentSuggestion = substantiveSuggestions[activeIndex] || substantiveSuggestions[0];

  const currentOriginalText = useMemo(() => {
    if (!currentSuggestion) return "";
    return isolatePreciseOriginalChange(
      currentSuggestion.originalText,
      currentSuggestion.suggestedText,
      originalResume
    );
  }, [currentSuggestion, originalResume]);

  const isAddition = !currentOriginalText || !currentOriginalText.trim();
  const isAcc = currentSuggestion?.status === "accepted";
  const isRej = currentSuggestion?.status === "rejected";
  const isPending = !currentSuggestion?.status || currentSuggestion?.status === "pending";
  const isEditing = Boolean(currentSuggestion && editingId === currentSuggestion.id);

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

      {/* Focused Single-Change Card (Showing ONE change at a time) */}
      {currentSuggestion && (
        <div
          className={`rounded-2xl border bg-white dark:bg-gray-900 shadow-sm overflow-hidden transition-all ${
            isAcc
              ? "border-emerald-500/40 dark:border-emerald-500/30"
              : isRej
              ? "border-rose-500/40 dark:border-rose-500/30"
              : "border-gray-200 dark:border-gray-800"
          }`}
        >
          {/* Card Header: Section, Change #, Status & Adjust/Edit */}
          <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700/80 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-gray-800 dark:text-gray-200 text-xs flex items-center gap-1.5">
                  <span>📁</span>
                  <span>{currentSuggestion.section || "Resume Section"}</span>
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                  Active Suggestion
                </span>
              </div>
              {currentSuggestion.jevJudge && (
                <div className="flex flex-wrap items-center gap-2 mt-1 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Jev Verified
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">
                    +{currentSuggestion.jevJudge.scoreDeltaPercent}% Match
                  </span>
                  <span className="text-xs text-slate-400">
                    • {currentSuggestion.jevJudge.toneOfVoiceRating === 'strong_authentic' ? 'Authentic Tone' : 'Professional Tone'}
                  </span>
                  <span className="text-xs text-amber-400 font-medium">
                    • {currentSuggestion.jevJudge.overallImpactScore}/5 Impact
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isPending ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  ● Pending Choice
                </span>
              ) : isAcc ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  ✓ Tailored Active
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                  ✕ Original Kept
                </span>
              )}

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => handleStartEdit(currentSuggestion)}
                  className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                >
                  ✎ Adjust / Edit
                </button>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4">
            {/* Inline Edit Mode */}
            {isEditing ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                  Edit tailored bullet text:
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-sm rounded-xl border border-cyan-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 leading-relaxed"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(currentSuggestion.id)}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow"
                  >
                    Save & Accept
                  </button>
                </div>
              </div>
            ) : (
              /* Simplified Line Diff: Soft Red (-) & Soft Green (+) */
              <div className="space-y-3 font-sans">
                {/* Red Line: Original (Only shown if modifying an existing line) */}
                {!isAddition && (
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-500/10 dark:bg-rose-950/25 border-l-4 border-rose-500 text-rose-950 dark:text-rose-200">
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 select-none shrink-0 text-base leading-snug">
                      -
                    </span>
                    <div className="text-sm leading-relaxed flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-1">
                        Original (Before):
                      </span>
                      <span>{currentOriginalText.replace(/^[-*•–—]\s*/, "")}</span>
                    </div>
                  </div>
                )}

                {/* Green Line: Tailored Replacement or Addition */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/25 border-l-4 border-emerald-500 text-emerald-950 dark:text-emerald-200">
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 select-none shrink-0 text-base leading-snug">
                    +
                  </span>
                  <div className="text-sm leading-relaxed flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                        currentSuggestion.suggestedText.replace(/^[-*•–—]\s*/, ""),
                        currentSuggestion.keywords
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Plain-English Rationale */}
            {currentSuggestion.reason && (
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  💡 <span className="font-semibold text-gray-800 dark:text-gray-200">Why this change:</span> {currentSuggestion.reason}
                </p>
              </div>
            )}

            {/* Action Controls for Active Change */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex-wrap">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAcceptChange(currentSuggestion.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 shadow-sm active:scale-95 ${
                    isAcc
                      ? "bg-emerald-600 text-white border-emerald-600 shadow ring-2 ring-emerald-400/30"
                      : "bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-sm"
                  }`}
                >
                  {isAcc ? (
                    <>
                      <span>✓</span> {isAddition ? "Addition Accepted" : "Accepted"}
                    </>
                  ) : (
                    <span>{isAddition ? "Accept Addition" : "Accept Change"}</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleKeepOriginal(currentSuggestion.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2 active:scale-95 ${
                    isRej
                      ? "bg-rose-600 text-white border-rose-600 shadow ring-2 ring-rose-400/30"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  {isRej ? (
                    <>
                      <span>✕</span> {isAddition ? "Addition Dismissed" : "Kept Original"}
                    </>
                  ) : (
                    <span>{isAddition ? "Dismiss Addition" : "Keep Original"}</span>
                  )}
                </button>
              </div>

              {activeIndex < totalCount - 1 ? (
                <button
                  type="button"
                  onClick={() => handleSelectIndex(activeIndex + 1)}
                  className="px-3.5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-1.5 ml-auto border border-gray-200 dark:border-gray-700"
                >
                  <span>Next Change</span>
                  <span>→</span>
                </button>
              ) : (
                onFinalize && (
                  <button
                    type="button"
                    onClick={onFinalize}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition-all ml-auto"
                  >
                    Finish Review →
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
