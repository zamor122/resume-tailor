"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";

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

  const totalCount = suggestions.length;

  // Keep active index within bounds if suggestions list changes
  useEffect(() => {
    if (activeIndex >= totalCount && totalCount > 0) {
      setActiveIndex(totalCount - 1);
    }
  }, [totalCount, activeIndex]);

  // Synchronize when external activeSuggestionId changes
  useEffect(() => {
    if (activeSuggestionId && totalCount > 0) {
      const idx = suggestions.findIndex((s) => s.id === activeSuggestionId);
      if (idx !== -1 && idx !== activeIndex) {
        setActiveIndex(idx);
      }
    }
  }, [activeSuggestionId, suggestions, totalCount, activeIndex]);

  const currentSuggestion = suggestions[activeIndex];

  // Upfront score calculation divided proportionally per change (REQ-UBI-04)
  const acceptedCount = useMemo(
    () => suggestions.filter((s) => s.status === "accepted").length,
    [suggestions]
  );
  const dismissedCount = useMemo(
    () => suggestions.filter((s) => s.status === "rejected").length,
    [suggestions]
  );
  const remainingCount = useMemo(
    () => suggestions.filter((s) => !s.status || s.status === "pending").length,
    [suggestions]
  );

  const totalBoost = Math.max(0, matchScore - beforeScore);
  const boostPerChange = totalCount > 0 ? totalBoost / totalCount : 0;
  const currentBoost = Math.round(acceptedCount * boostPerChange);
  const liveScore = Math.min(100, Math.round(beforeScore + currentBoost));

  // Navigation handlers
  const handleSelectIndex = (idx: number) => {
    if (idx < 0 || idx >= totalCount) return;
    setActiveIndex(idx);
    const sug = suggestions[idx];
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

  // Change action handlers
  const handleAcceptChange = (id?: string) => {
    const targetId = id || currentSuggestion?.id;
    if (!targetId) return;

    const updated = suggestions.map((s) =>
      s.id === targetId ? { ...s, status: "accepted" as const } : s
    );
    onSuggestionsChange(updated);

    // Auto-advance to next change if available
    if (activeIndex < totalCount - 1) {
      handleSelectIndex(activeIndex + 1);
    }
  };

  const handleKeepOriginal = (id?: string) => {
    const targetId = id || currentSuggestion?.id;
    if (!targetId) return;

    const updated = suggestions.map((s) =>
      s.id === targetId ? { ...s, status: "rejected" as const } : s
    );
    onSuggestionsChange(updated);

    // Auto-advance to next change if available
    if (activeIndex < totalCount - 1) {
      handleSelectIndex(activeIndex + 1);
    }
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

  // Clean keyword highlighting without visual noise
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

  const isCurrentAccepted = currentSuggestion?.status === "accepted";
  const isCurrentRejected = currentSuggestion?.status === "rejected";
  const isCurrentPending = !currentSuggestion?.status || currentSuggestion?.status === "pending";
  const isEditing = editingId === currentSuggestion?.id;

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Top Header Card with Tri-Color Progress Bar & ATS Score */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-800 text-white border border-gray-700/80 shadow-lg space-y-3">
        {/* Score & Counters Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Change {activeIndex + 1} of {totalCount}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-medium text-gray-300 truncate max-w-[200px] sm:max-w-xs">
                {currentSuggestion?.section || "Resume Review"}
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

        {/* Tri-Color Segmented Progress Bar (REQ-UBI-02) */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 w-full h-3 rounded-full bg-gray-800/80 p-0.5 overflow-hidden">
            {suggestions.map((s, idx) => {
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

          {/* Clean Metric Labels (REQ-UBI-03) */}
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

            {/* Quick Bulk Shortcuts */}
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
      </div>

      {/* Main Review Card (REQ-UBI-01: Exactly ONE Step-by-Step Method) */}
      <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-md space-y-3.5">
        {/* Card Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
              {currentSuggestion.section}
            </span>
            {isCurrentPending ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                ● Pending Choice
              </span>
            ) : isCurrentAccepted ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                ✓ Tailored Active
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30">
                ✕ Original Kept
              </span>
            )}
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => handleStartEdit(currentSuggestion)}
              className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
            >
              ✎ Adjust / Edit
            </button>
          )}
        </div>

        {/* Inline Edit Mode */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
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
                className="px-3 py-1 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveEdit(currentSuggestion.id)}
                className="px-4 py-1 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow"
              >
                Save & Accept
              </button>
            </div>
          </div>
        ) : (
          /* Symmetrical Side-by-Side Comparison (REQ-UBI-01) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Symmetrical Card 1: Original */}
            <div
              onClick={() => handleKeepOriginal(currentSuggestion.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isCurrentRejected
                  ? "bg-rose-500/10 dark:bg-rose-950/30 border-rose-500 ring-1 ring-rose-500/30 shadow-xs"
                  : isCurrentAccepted
                  ? "bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                  : "bg-gray-50/70 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700/80 hover:border-gray-400"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 dark:border-gray-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                    {isCurrentRejected && <span className="text-rose-600 dark:text-rose-400">●</span>}
                    Original (Before):
                  </span>
                  {isCurrentRejected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                      ✓ In Resume
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
                  {currentSuggestion.originalText.startsWith("(") && currentSuggestion.originalText.endsWith(")") ? (
                    <span className="italic text-gray-400 dark:text-gray-500">
                      {currentSuggestion.originalText}
                    </span>
                  ) : (
                    <span>{currentSuggestion.originalText.replace(/^[-*•–—]\s*/, "")}</span>
                  )}
                </div>
              </div>

              <div className="pt-3 mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKeepOriginal(currentSuggestion.id);
                  }}
                  className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    isCurrentRejected
                      ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                      : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  ✕ Keep Original
                </button>
              </div>
            </div>

            {/* Symmetrical Card 2: Tailored Enhancement */}
            <div
              onClick={() => handleAcceptChange(currentSuggestion.id)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                isCurrentAccepted
                  ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs"
                  : isCurrentRejected
                  ? "bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                  : "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/70"
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 dark:border-gray-800">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    {isCurrentAccepted && <span>●</span>}
                    Tailored (Enhanced):
                  </span>
                  {isCurrentAccepted && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      ✓ In Resume
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-normal">
                  {renderHighlightedKeywords(
                    currentSuggestion.suggestedText.replace(/^[-*•–—]\s*/, ""),
                    currentSuggestion.keywords
                  )}
                </div>
              </div>

              <div className="pt-3 mt-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptChange(currentSuggestion.id);
                  }}
                  className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                    isCurrentAccepted
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/20"
                  }`}
                >
                  ✓ Accept Change
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plain-English Rationale */}
        {currentSuggestion.reason && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic pt-1">
            💡 <span className="font-medium text-gray-700 dark:text-gray-300">Why this helps:</span> {currentSuggestion.reason}
          </p>
        )}

        {/* Step-by-Step Navigation & Action Bar */}
        <div className="pt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            disabled={activeIndex === 0}
            onClick={handlePrevious}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
          >
            ← Previous
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeIndex === totalCount - 1}
              onClick={handleNext}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
            >
              Next →
            </button>

            {onFinalize && (
              <button
                type="button"
                onClick={onFinalize}
                className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                ✓ Finish & View Resume →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
