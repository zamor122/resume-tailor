"use client";

import { useState, useMemo } from "react";
import type { ResumeSuggestion } from "@/app/types/humanize";

interface ResumeSuggestionReviewerProps {
  originalResume: string;
  suggestions: ResumeSuggestion[];
  onSuggestionsChange: (updatedSuggestions: ResumeSuggestion[]) => void;
  isUnlocked?: boolean;
  onUnlockRequest?: () => void;
  beforeScore?: number;
  matchScore?: number;
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
  className = "",
}: ResumeSuggestionReviewerProps) {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");

  // Categorize sections for filter chips
  const sectionCategories = useMemo(() => {
    const set = new Set<string>();
    suggestions.forEach((s) => {
      if (s.section.toLowerCase().includes("summary")) {
        set.add("Summary");
      } else if (s.section.includes("–") || s.section.includes("-")) {
        set.add("Experience");
      } else {
        set.add("Other");
      }
    });
    return Array.from(set);
  }, [suggestions]);

  // Filtered suggestions
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter((s) => {
      if (selectedFilter === "all") return true;
      if (selectedFilter === "accepted") return s.status !== "rejected";
      if (selectedFilter === "rejected") return s.status === "rejected";
      if (selectedFilter === "Summary") return s.section.toLowerCase().includes("summary");
      if (selectedFilter === "Experience") return s.section.includes("–") || s.section.includes("-");
      return true;
    });
  }, [suggestions, selectedFilter]);

  const acceptedCount = useMemo(() => {
    return suggestions.filter((s) => s.status !== "rejected").length;
  }, [suggestions]);

  // Compute live match score based on accepted ratio
  const liveScore = useMemo(() => {
    if (suggestions.length === 0) return matchScore;
    const ratio = acceptedCount / suggestions.length;
    const boost = matchScore - beforeScore;
    return Math.round(beforeScore + boost * ratio);
  }, [suggestions, acceptedCount, beforeScore, matchScore]);

  const handleToggle = (id: string, newStatus: "accepted" | "rejected") => {
    const updated = suggestions.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s
    );
    onSuggestionsChange(updated);
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

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="font-medium text-gray-700 dark:text-gray-300">Original Resume Format Preserved</p>
        <p className="text-sm mt-1">No bullet modifications were required for this intensity level.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Dynamic Score Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-emerald-950/40 border border-cyan-500/30 backdrop-blur-md shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
              {suggestions.length} Tailored Improvements Available
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Accept or reject each line individually. Your original document structure is 100% preserved.
          </p>
        </div>

        {/* Live Score Counter */}
        <div className="flex items-center gap-3 bg-gray-900/80 px-4 py-2 rounded-xl border border-gray-700/80 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Match Score</div>
            <div className="flex items-center gap-1.5 font-bold">
              <span className="text-gray-400 text-sm">{beforeScore}%</span>
              <span className="text-cyan-400 text-xs">→</span>
              <span className="text-emerald-400 text-lg sm:text-xl font-extrabold">{liveScore}%</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md font-semibold">
            +{liveScore - beforeScore}%
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Chips & Bulk Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedFilter === "all"
                ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            All ({suggestions.length})
          </button>
          {sectionCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedFilter(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedFilter === cat
                  ? "bg-cyan-500 text-white shadow-md shadow-cyan-500/20"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedFilter("accepted")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              selectedFilter === "accepted"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Accepted ({acceptedCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
          >
            ✓ Accept All ({suggestions.length})
          </button>
          <button
            type="button"
            onClick={handleRejectAll}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 transition-all active:scale-95"
          >
            Keep All Original
          </button>
        </div>
      </div>

      {/* Suggestion Cards Deck */}
      <div className="space-y-4">
        {filteredSuggestions.map((sug, idx) => {
          const isAccepted = sug.status !== "rejected";
          const isEditing = editingId === sug.id;
          const isLocked = !isUnlocked && idx >= 2;

          return (
            <div
              key={sug.id}
              className={`relative rounded-xl border transition-all overflow-hidden ${
                isAccepted
                  ? "bg-white dark:bg-gray-900/90 border-emerald-500/40 shadow-sm"
                  : "bg-gray-50/80 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-80"
              }`}
            >
              {/* Card Header: Section & Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:px-4 bg-gray-50/90 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
                    {sug.section}
                  </span>
                  {sug.reason && (
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      💡 {sug.reason}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(sug.id, isAccepted ? "rejected" : "accepted")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      isAccepted
                        ? "bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {isAccepted ? "✓ Accepted" : "+ Apply Suggestion"}
                  </button>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(sug)}
                      className="p-1 px-2 rounded-lg text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      title="Edit inline"
                    >
                      ✎ Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body: Diff View or Inline Editor */}
              <div className="p-4 space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Customize AI Suggestion:
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full p-3 text-sm rounded-lg border border-cyan-500/50 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
                        onClick={() => handleSaveEdit(sug.id)}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow"
                      >
                        Save & Apply
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {/* Original Box */}
                    <div className="p-3 rounded-lg bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/20">
                      <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                        Original:
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 line-through decoration-rose-400/50 leading-relaxed">
                        {sug.originalText}
                      </p>
                    </div>

                    {/* AI-Optimized Box */}
                    <div
                      className={`p-3 rounded-lg border transition-all ${
                        isAccepted
                          ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 text-gray-900 dark:text-white"
                          : "bg-gray-100 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                          ✨ Tailored ({isAccepted ? "Active" : "Disabled"}):
                        </span>
                        {sug.keywords && sug.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sug.keywords.map((kw) => (
                              <span
                                key={kw}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                              >
                                +{kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-medium leading-relaxed">
                        {sug.suggestedText}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Locked Teaser Overlay for Anonymous / Paid Gated tiers */}
              {isLocked && (
                <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center">
                  <span className="text-2xl mb-1">🔒</span>
                  <h4 className="text-sm font-bold text-white">Unlock All ATS Suggestions</h4>
                  <p className="text-xs text-gray-300 max-w-sm mt-0.5 mb-3">
                    Sign in or upgrade to view, accept, and export all {suggestions.length} high-impact improvements.
                  </p>
                  <button
                    type="button"
                    onClick={onUnlockRequest}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Unlock All Suggestions
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
