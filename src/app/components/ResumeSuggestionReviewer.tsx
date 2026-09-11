"use client";

import { useState, useMemo, useEffect } from "react";
import type { ResumeSuggestion } from "@/app/types/humanize";

interface ResumeSuggestionReviewerProps {
  originalResume: string;
  suggestions: ResumeSuggestion[];
  onSuggestionsChange: (updatedSuggestions: ResumeSuggestion[]) => void;
  isUnlocked?: boolean;
  onUnlockRequest?: () => void;
  beforeScore?: number;
  matchScore?: number;
  activeSuggestionId?: string | null;
  onActiveSuggestionChange?: (id: string | null) => void;
  className?: string;
}

export default function ResumeSuggestionReviewer({
  originalResume,
  suggestions,
  onSuggestionsChange,
  isUnlocked = true,
  onUnlockRequest,
  beforeScore = 50,
  matchScore = 85,
  activeSuggestionId,
  onActiveSuggestionChange,
  className = "",
}: ResumeSuggestionReviewerProps) {
  const [mode, setMode] = useState<"step" | "list">("step");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  // Keep currentIndex in sync if parent changes activeSuggestionId
  useEffect(() => {
    if (activeSuggestionId) {
      const idx = suggestions.findIndex((s) => s.id === activeSuggestionId);
      if (idx !== -1 && idx !== currentIndex) {
        setCurrentIndex(idx);
      }
    }
  }, [activeSuggestionId, suggestions]);

  // Sync active suggestion with parent on step change
  const currentSug = suggestions[currentIndex] || suggestions[0];
  const activeId = mode === "step" ? currentSug?.id : activeSuggestionId;

  useEffect(() => {
    if (currentSug?.id && mode === "step") {
      onActiveSuggestionChange?.(currentSug.id);
    }
  }, [currentIndex, currentSug?.id, mode]);

  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (selectedFilter === "all") return true;
      if (selectedFilter === "accepted") return s.status !== "rejected";
      if (selectedFilter === "rejected") return s.status === "rejected";
      if (selectedFilter === "keyword") return s.category === "keyword";
      if (selectedFilter === "metric") return s.category === "metric";
      if (selectedFilter === "summary") return s.category === "summary" || s.section.toLowerCase().includes("summary");
      if (selectedFilter === "action_verb") return s.category === "action_verb";
      return true;
    });
  }, [suggestions, selectedFilter]);

  const acceptedCount = useMemo(() => {
    return suggestions.filter((s) => s.status !== "rejected").length;
  }, [suggestions]);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    return {
      keyword: suggestions.filter((s) => s.category === "keyword").length,
      metric: suggestions.filter((s) => s.category === "metric").length,
      summary: suggestions.filter((s) => s.category === "summary" || s.section.toLowerCase().includes("summary")).length,
    };
  }, [suggestions]);

  // Compute live match score based on accepted ratio
  const liveScore = useMemo(() => {
    if (suggestions.length === 0) return matchScore;
    const ratio = acceptedCount / suggestions.length;
    const boost = matchScore - beforeScore;
    return Math.round(beforeScore + boost * ratio);
  }, [suggestions, acceptedCount, beforeScore, matchScore]);

  const isCurrentAccepted = currentSug ? currentSug.status !== "rejected" : true;

  const handleToggle = (id: string, newStatus: "accepted" | "rejected", autoAdvance = false) => {
    const updated = suggestions.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s
    );
    onSuggestionsChange(updated);
    if (autoAdvance && currentIndex < suggestions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      onActiveSuggestionChange?.(suggestions[nextIdx]?.id || null);
    }
  };

  const handleSelectStep = (idx: number) => {
    setCurrentIndex(idx);
    onActiveSuggestionChange?.(suggestions[idx]?.id || null);
  };

  const handleAcceptAll = () => {
    const updated = suggestions.map((s) => ({ ...s, status: "accepted" as const }));
    onSuggestionsChange(updated);
  };

  const handleRejectAll = () => {
    const updated = suggestions.map((s) => ({ ...s, status: "rejected" as const }));
    onSuggestionsChange(updated);
  };

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

  const getCategoryBadge = (cat?: string) => {
    switch (cat) {
      case "metric":
        return { label: "📈 Metric & Impact Boost", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" };
      case "summary":
        return { label: "✨ Summary Alignment", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" };
      case "action_verb":
        return { label: "⚡ Action Verb Polish", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" };
      case "keyword":
      default:
        return { label: "🎯 Target Keyword Match", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30" };
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
        <span className="text-3xl">✨</span>
        <h4 className="font-bold text-gray-800 dark:text-gray-200">No Changes Needed</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
          Your resume already has high keyword alignment with the target job posting.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Studio Header: You are in the driver's seat */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-800 text-white border border-gray-700/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Resume Change Studio
              </span>
            </div>
            <div className="text-sm font-semibold text-gray-200">
              {acceptedCount} of {suggestions.length} changes accepted
            </div>
          </div>

          {/* Dynamic Match Score Badge */}
          <div className="flex items-center gap-3 bg-black/40 px-3.5 py-1.5 rounded-xl border border-gray-700/60 shrink-0">
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">Estimated ATS</div>
              <div className="flex items-center gap-1 font-bold">
                <span className="text-gray-400 text-xs">{beforeScore}%</span>
                <span className="text-cyan-400 text-[10px]">→</span>
                <span className="text-emerald-400 text-base font-extrabold">{liveScore}%</span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              +{liveScore - beforeScore}%
            </span>
          </div>
        </div>

        {/* Interactive Progress Bar with Clickable Step Dots */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span>Change {currentIndex + 1} of {suggestions.length}</span>
            <span>{Math.round((acceptedCount / suggestions.length) * 100)}% Applied</span>
          </div>
          <div className="grid grid-flow-col auto-cols-fr gap-1.5">
            {suggestions.map((s, idx) => {
              const isAcc = s.status !== "rejected";
              const isCur = idx === currentIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    isCur
                      ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-gray-900 bg-cyan-400"
                      : isAcc
                      ? "bg-emerald-500 hover:bg-emerald-400"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                  title={`Jump to Change ${idx + 1}: ${s.section}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs & Batch Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setMode("step")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 ${
              mode === "step"
                ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            🎯 Step-by-Step
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 ${
              mode === "list"
                ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📋 All Changes ({suggestions.length})
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
            title="Accept all suggested improvements"
          >
            ✓ Accept All
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 transition-all active:scale-95"
            title="Keep all original resume lines"
          >
            ↺ Keep All Original
          </button>
        </div>
      </div>

      {/* MODE 1: STEP-BY-STEP CHANGE CARD */}
      {mode === "step" && currentSug && (
        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden transition-all">
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 p-3.5 px-4 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-gray-200/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 shrink-0">
                {currentSug.section}
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getCategoryBadge(currentSug.category).color}`}>
                {getCategoryBadge(currentSug.category).label}
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => handleSelectStep(Math.max(0, currentIndex - 1))}
                className="p-1.5 px-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                title="Previous change"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={currentIndex === suggestions.length - 1}
                onClick={() => handleSelectStep(Math.min(suggestions.length - 1, currentIndex + 1))}
                className="p-1.5 px-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
                title="Next change"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Card Body: ATS Strategy + Diff */}
          <div className="p-4 space-y-4">
            {currentSug.reason && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-900 dark:text-cyan-200 leading-relaxed">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <span className="font-bold">Why the AI suggests this: </span>
                  {currentSug.reason}
                </div>
              </div>
            )}

            {editingId === currentSug.id ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Customize wording for this line:
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-sm rounded-xl border border-cyan-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(currentSug.id)}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow"
                  >
                    Save & Accept
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Original Resume Snippet */}
                <div className="p-3.5 rounded-xl bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                    Your Original Resume Text:
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {currentSug.originalText}
                  </p>
                </div>

                {/* AI Proposed Suggestion */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrentAccepted
                      ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/40 text-gray-900 dark:text-white ring-1 ring-emerald-500/30"
                      : "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      ✨ Proposed Enhancement ({isCurrentAccepted ? "Applied" : "Declined"}):
                    </span>
                    {currentSug.keywords && currentSug.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {currentSug.keywords.map((kw) => (
                          <span
                            key={kw}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          >
                            +{kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    {currentSug.suggestedText}
                  </p>
                </div>
              </div>
            )}

            {/* 3 Driver Actions: Accept / Keep Original / Adjust */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => handleStartEdit(currentSug)}
                className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                ✎ Adjust / Edit
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(currentSug.id, "rejected", true)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all active:scale-95 ${
                    !isCurrentAccepted
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-400"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100"
                  }`}
                >
                  ✕ Keep My Original
                </button>
                <button
                  type="button"
                  onClick={() => handleToggle(currentSug.id, "accepted", true)}
                  className={`px-5 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all active:scale-95 ${
                    isCurrentAccepted
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20"
                      : "bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/20"
                  }`}
                >
                  ✓ Accept Change →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: ALL CHANGES LIST VIEW */}
      {mode === "list" && (
        <div className="space-y-3">
          {filteredSuggestions.map((sug) => {
            const isAccepted = sug.status !== "rejected";
            const isActive = activeId === sug.id;
            const badge = getCategoryBadge(sug.category);

            return (
              <div
                key={sug.id}
                onClick={() => onActiveSuggestionChange?.(sug.id)}
                className={`relative rounded-xl border transition-all p-3.5 space-y-2 cursor-pointer ${
                  isActive
                    ? "ring-2 ring-cyan-500 border-cyan-500 bg-cyan-500/5 dark:bg-cyan-950/20 shadow-md"
                    : isAccepted
                    ? "bg-white dark:bg-gray-900 border-emerald-500/30 hover:border-emerald-500/60 shadow-sm"
                    : "bg-gray-50/80 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-200/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-200">
                      {sug.section}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggle(sug.id, isAccepted ? "rejected" : "accepted")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        isAccepted
                          ? "bg-emerald-500 text-white hover:bg-emerald-600"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {isAccepted ? "✓ Accepted" : "+ Accept"}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {sug.suggestedText}
                </p>
                {sug.reason && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    💡 {sug.reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
