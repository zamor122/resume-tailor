"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";
import { groupSuggestionsBySection, type ParsedResumeForReassemble } from "@/app/utils/resumeReassemble";

export interface ResumeSuggestionReviewerProps {
  originalResume: string;
  suggestions: ResumeSuggestion[];
  sectionGroups?: ResumeSectionGroup[];
  onSectionGroupsChange?: (groups: ResumeSectionGroup[]) => void;
  onSuggestionsChange: (updatedSuggestions: ResumeSuggestion[]) => void;
  activeSectionId?: string | null;
  onActiveSectionChange?: (id: string | null) => void;
  beforeScore?: number;
  matchScore?: number;
  jobDescription?: string;
  jobTitle?: string;
  resumeAST?: ParsedResumeForReassemble;
  isUnlocked?: boolean;
  onUnlockRequest?: () => void;
  activeSuggestionId?: string | null;
  onActiveSuggestionChange?: (id: string | null) => void;
  className?: string;
  onFinalize?: () => void;
}

/**
 * Fallback to group suggestions when sectionGroups prop is omitted
 */
function deriveSectionGroups(
  suggestions: ResumeSuggestion[] = [],
  resumeAST?: ParsedResumeForReassemble,
  originalResume?: string
): ResumeSectionGroup[] {
  const groupsFromReassemble = groupSuggestionsBySection(suggestions, resumeAST, originalResume);
  const hasExperienceOrSkills = groupsFromReassemble.some(
    (g) => g.sectionType === "experience" || g.sectionType === "skills"
  );
  if (hasExperienceOrSkills || suggestions.length === 0) {
    return groupsFromReassemble;
  }

  // Fallback: group suggestions by section/jobIndex if resumeAST was not provided
  const expSuggestions = suggestions.filter(
    (s) => s.category !== "summary" && (!s.section || !s.section.toLowerCase().includes("summary"))
  );
  const summarySuggestions = suggestions.filter(
    (s) => s.category === "summary" || (s.section && s.section.toLowerCase().includes("summary"))
  );

  const groupedMap = new Map<string, { jobIndex?: number; section: string; sugs: ResumeSuggestion[] }>();
  expSuggestions.forEach((s) => {
    const key = s.jobIndex !== undefined ? `job-${s.jobIndex}` : (s.section || "Experience");
    if (!groupedMap.has(key)) {
      groupedMap.set(key, { jobIndex: s.jobIndex, section: s.section || "Experience", sugs: [] });
    }
    groupedMap.get(key)!.sugs.push(s);
  });

  // Sort groups bottom-to-top: higher jobIndex first (earlier jobs)
  const sortedEntries = Array.from(groupedMap.entries()).sort((a, b) => {
    if (a[1].jobIndex !== undefined && b[1].jobIndex !== undefined) {
      return b[1].jobIndex - a[1].jobIndex;
    }
    return 0;
  });

  const dynamicGroups: ResumeSectionGroup[] = sortedEntries.map(([key, entry], idx) => ({
    id: `section-exp-${entry.jobIndex !== undefined ? entry.jobIndex : idx}`,
    sectionType: "experience",
    title: entry.section,
    subtitle: undefined,
    jobIndex: entry.jobIndex,
    orderIndex: idx,
    status: "ready",
    auditRationale: `Targeted enhancement for ${entry.section}`,
    suggestions: entry.sugs,
    originalContent: entry.sugs.map((s) => s.originalText).join("\n"),
    tailoredContent: entry.sugs.map((s) => s.suggestedText).join("\n"),
    hasChanges: entry.sugs.length > 0,
  }));

  if (summarySuggestions.length > 0) {
    dynamicGroups.push({
      id: "section-summary",
      sectionType: "summary",
      title: "Professional Summary Synthesis",
      subtitle: "Holistic Career Overview",
      orderIndex: dynamicGroups.length,
      status: "ready",
      auditRationale: "Holistic executive synthesis aligning career arc with target profile",
      suggestions: summarySuggestions,
      originalContent: summarySuggestions.map((s) => s.originalText).join("\n"),
      tailoredContent: summarySuggestions.map((s) => s.suggestedText).join("\n"),
      hasChanges: true,
    });
  }

  return dynamicGroups.length > 0 ? dynamicGroups : groupsFromReassemble;
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
  const [viewMode, setViewMode] = useState<"studio" | "list">("studio");
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [synthesizedSummary, setSynthesizedSummary] = useState<string | null>(null);
  const [selectedListFilter, setSelectedListFilter] = useState<string>("all");

  const prefetchedIds = useRef<Set<string>>(new Set());

  // Determine effective section groups
  const [localGroups, setLocalGroups] = useState<ResumeSectionGroup[]>(() => {
    return sectionGroups && sectionGroups.length > 0
      ? sectionGroups
      : deriveSectionGroups(suggestions, resumeAST, originalResume);
  });

  const prevPropGroupsRef = useRef<ResumeSectionGroup[] | undefined>(sectionGroups);
  useEffect(() => {
    if (sectionGroups !== prevPropGroupsRef.current) {
      prevPropGroupsRef.current = sectionGroups;
      if (sectionGroups && sectionGroups.length > 0) {
        setLocalGroups(sectionGroups);
      }
    } else if (!sectionGroups) {
      setLocalGroups(deriveSectionGroups(suggestions, resumeAST, originalResume));
    }
  }, [sectionGroups, suggestions, resumeAST, originalResume]);

  const effectiveGroups = useMemo(() => {
    if (localGroups && localGroups.length > 0) {
      return localGroups;
    }
    return deriveSectionGroups(suggestions, resumeAST, originalResume);
  }, [localGroups, suggestions, resumeAST, originalResume]);

  // Synchronize currentSectionIndex if parent updates activeSectionId
  useEffect(() => {
    if (activeSectionId && effectiveGroups.length > 0) {
      const idx = effectiveGroups.findIndex((g) => g.id === activeSectionId);
      if (idx !== -1 && idx !== currentSectionIndex) {
        setCurrentSectionIndex(idx);
      }
    }
  }, [activeSectionId, effectiveGroups]);

  const activeGroup = effectiveGroups[currentSectionIndex] || effectiveGroups[0];

  // Notify parent on active section change
  useEffect(() => {
    if (activeGroup?.id) {
      onActiveSectionChange?.(activeGroup.id);
    }
  }, [activeGroup?.id, onActiveSectionChange]);

  // Background prefetch for next pending section
  useEffect(() => {
    const nextIdx = currentSectionIndex + 1;
    if (nextIdx < effectiveGroups.length) {
      const nextGroup = effectiveGroups[nextIdx];
      if (nextGroup && nextGroup.status === "pending" && !prefetchedIds.current.has(nextGroup.id)) {
        prefetchedIds.current.add(nextGroup.id);

        fetch("/api/agent/tailor-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sectionGroup: nextGroup,
            resumeContext: originalResume,
            jobDescription: jobDescription || "",
            jobTitle: jobTitle,
          }),
        })
          .then((res) => {
            if (!res.ok) throw new Error("Prefetch failed");
            return res.json();
          })
          .then((data) => {
            if (data.sectionGroup) {
              const updatedGroups = effectiveGroups.map((g) =>
                g.id === nextGroup.id ? data.sectionGroup : g
              );
              setLocalGroups(updatedGroups);
              onSectionGroupsChange?.(updatedGroups);

              if (data.sectionGroup.suggestions?.length > 0) {
                const newSugs: ResumeSuggestion[] = data.sectionGroup.suggestions;
                const existingIds = new Set(suggestions.map((s) => s.id));
                const additions = newSugs.filter((s) => !existingIds.has(s.id));
                if (additions.length > 0) {
                  onSuggestionsChange([...suggestions, ...additions]);
                }
              }
            }
          })
          .catch((err) => {
            console.warn("[ResumeSuggestionReviewer] Background prefetch note:", err);
          });
      }
    }
  }, [
    currentSectionIndex,
    effectiveGroups,
    originalResume,
    jobDescription,
    jobTitle,
    suggestions,
    onSectionGroupsChange,
    onSuggestionsChange,
  ]);

  // Counts and scores
  const acceptedCount = useMemo(() => {
    return suggestions.filter((s) => s.status === "accepted").length;
  }, [suggestions]);

  const liveScore = useMemo(() => {
    if (suggestions.length === 0) return matchScore;
    const ratio = acceptedCount / suggestions.length;
    const boost = matchScore - beforeScore;
    return Math.round(beforeScore + boost * ratio);
  }, [suggestions, acceptedCount, beforeScore, matchScore]);

  // Section batch actions
  const handleAcceptSection = () => {
    if (!activeGroup) return;
    const activeSugIds = new Set(activeGroup.suggestions.map((s) => s.id));
    const updated = suggestions.map((s) =>
      activeSugIds.has(s.id) ? { ...s, status: "accepted" as const } : s
    );
    onSuggestionsChange(updated);

    if (currentSectionIndex < effectiveGroups.length - 1) {
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      onActiveSectionChange?.(effectiveGroups[nextIdx]?.id || null);
    }
  };

  const handleRejectSection = () => {
    if (!activeGroup) return;
    const activeSugIds = new Set(activeGroup.suggestions.map((s) => s.id));
    const updated = suggestions.map((s) =>
      activeSugIds.has(s.id) ? { ...s, status: "rejected" as const } : s
    );
    onSuggestionsChange(updated);

    if (currentSectionIndex < effectiveGroups.length - 1) {
      const nextIdx = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIdx);
      onActiveSectionChange?.(effectiveGroups[nextIdx]?.id || null);
    }
  };

  const handlePreviousSection = () => {
    if (currentSectionIndex > 0) {
      const prevIdx = currentSectionIndex - 1;
      setCurrentSectionIndex(prevIdx);
      onActiveSectionChange?.(effectiveGroups[prevIdx]?.id || null);
    }
  };

  const handleSelectSection = (idx: number) => {
    setCurrentSectionIndex(idx);
    onActiveSectionChange?.(effectiveGroups[idx]?.id || null);
  };

  // Individual suggestion toggles
  const handleToggleSuggestion = (id: string, newStatus: "accepted" | "rejected") => {
    const updated = suggestions.map((s) =>
      s.id === id ? { ...s, status: newStatus } : s
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

  // Summary Re-synthesis
  const handleReSynthesizeSummary = async () => {
    setIsSynthesizing(true);
    try {
      const res = await fetch("/api/agent/synthesize-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assembledResume: originalResume,
          jobDescription: jobDescription || "",
          jobTitle: jobTitle,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summaryText) {
          setSynthesizedSummary(data.summaryText);
          if (activeGroup?.suggestions?.length > 0) {
            const summarySug = activeGroup.suggestions[0];
            const updated = suggestions.map((s) =>
              s.id === summarySug.id
                ? { ...s, suggestedText: data.summaryText, status: "accepted" as const }
                : s
            );
            onSuggestionsChange(updated);
          }
        }
      }
    } catch (err) {
      console.error("[ResumeSuggestionReviewer] Synthesis error:", err);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Badge helper
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

  // Company extraction for skeleton card
  const activeCompanyName = useMemo(() => {
    if (!activeGroup?.title) return "experience";
    const parts = activeGroup.title.split(/–|-/);
    return parts[0].trim();
  }, [activeGroup?.title]);

  const isTailoring = activeGroup?.status === "pending" || activeGroup?.status === "tailoring";
  const isSummaryStage = activeGroup?.sectionType === "summary";

  // Derive concise breadcrumb label
  const getBreadcrumbLabel = (group: ResumeSectionGroup, idx: number) => {
    if (group.sectionType === "summary") return `${idx + 1}. Summary`;
    if (group.sectionType === "skills") return `${idx + 1}. Skills`;
    const company = group.title.split(/–|-/)[0].trim();
    return `${idx + 1}. ${company || group.title}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Studio Header: Narrative Stepper & Progress */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-800 text-white border border-gray-700/80 shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Narrative Section Studio
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

        {/* Stepper Progress & Clickable Breadcrumbs */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="font-semibold text-gray-300">
              Stage {currentSectionIndex + 1} / {effectiveGroups.length}: Bottom-to-Top Career Flow
            </span>
            <span>Upward Narrative</span>
          </div>

          {/* Stepper Breadcrumbs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {effectiveGroups.map((group, idx) => {
              const isCur = idx === currentSectionIndex;
              const isUnchanged = !group.hasChanges || group.status === "unchanged";
              const isPending = group.status === "pending" || group.status === "tailoring";
              const isDone =
                group.status === "reviewed" ||
                (group.suggestions.length > 0 && group.suggestions.every((s) => s.status === "accepted"));

              const icon = isPending ? "⏳" : isUnchanged ? "🛡️" : isDone ? "✓" : isCur ? "●" : `${idx + 1}`;

              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => handleSelectSection(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    isCur
                      ? "bg-cyan-500 text-white shadow-sm ring-1 ring-cyan-400 font-bold"
                      : isDone
                      ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60"
                      : "bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700/60"
                  }`}
                  title={`Jump to Section ${idx + 1}: ${group.title}`}
                >
                  <span className="text-[10px]">{icon}</span>
                  <span className="truncate max-w-[130px]">{getBreadcrumbLabel(group, idx)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mode Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            type="button"
            onClick={() => setViewMode("studio")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 ${
              viewMode === "studio"
                ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            🎯 Section Studio
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all shrink-0 ${
              viewMode === "list"
                ? "bg-white dark:bg-gray-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            📋 All Changes ({suggestions.length})
          </button>
        </div>

        {/* Global Quick Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onSuggestionsChange(suggestions.map((s) => ({ ...s, status: "accepted" as const })))}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
            title="Accept all suggested improvements across entire resume"
          >
            ✓ Accept All
          </button>
          <button
            type="button"
            onClick={() => onSuggestionsChange(suggestions.map((s) => ({ ...s, status: "rejected" as const })))}
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700 transition-all active:scale-95"
            title="Keep all original resume lines"
          >
            ↺ Keep All Original
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: SECTION STUDIO */}
      {viewMode === "studio" && activeGroup && (
        <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden transition-all space-y-0">
          {/* Unified Section Header */}
          <div className="p-4 bg-gray-50/90 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                  Section {currentSectionIndex + 1} of {effectiveGroups.length}
                </span>
                {activeGroup.status === "unchanged" || !activeGroup.hasChanges ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    🛡️ Authentic Baseline
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30">
                    ✦ Tailored Enhancement
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {activeGroup.title}
              </h3>
              {activeGroup.subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeGroup.subtitle}
                </p>
              )}
            </div>

            {/* Stepper navigation buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={currentSectionIndex === 0}
                onClick={handlePreviousSection}
                className="p-1.5 px-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous section"
              >
                ← Prev
              </button>
              <button
                type="button"
                disabled={currentSectionIndex === effectiveGroups.length - 1}
                onClick={() => handleSelectSection(currentSectionIndex + 1)}
                className="p-1.5 px-2.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next section"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Section Body */}
          <div className="p-4 sm:p-5 space-y-4">
            {/* Audit Rationale Banner */}
            {activeGroup.auditRationale && (
              <div
                className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs leading-relaxed ${
                  !activeGroup.hasChanges || activeGroup.status === "unchanged"
                    ? "bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                    : "bg-cyan-500/5 dark:bg-cyan-950/20 border-cyan-500/20 text-cyan-950 dark:text-cyan-200"
                }`}
              >
                <span className="text-base shrink-0">
                  {!activeGroup.hasChanges || activeGroup.status === "unchanged" ? "🛡️" : "✦"}
                </span>
                <div className="space-y-0.5">
                  <div className="font-bold text-[11px] uppercase tracking-wider">
                    {!activeGroup.hasChanges || activeGroup.status === "unchanged"
                      ? "Preserved Authenticity"
                      : "✦ Tailored for Target Role"}
                  </div>
                  <div>{activeGroup.auditRationale}</div>
                </div>
              </div>
            )}

            {/* Shimmer Skeleton if section is tailoring/pending */}
            {isTailoring && (
              <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40 shadow-inner space-y-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-spin">⏳</span>
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                      Analyzing {activeCompanyName} experience against target role requirements...
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Generating high-impact metrics and keyword alignment in the background.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                </div>
              </div>
            )}

            {/* Untouched / Preserved Section Content */}
            {!isTailoring && (!activeGroup.hasChanges || activeGroup.suggestions.length === 0) && !isSummaryStage && (
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/30 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-semibold">Original Phrasing Maintained</span>
                  <span className="text-[11px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded font-mono">
                    No Changes Proposed
                  </span>
                </div>
                <div className="p-3.5 rounded-lg bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                  {activeGroup.originalContent || "No content recorded for this section."}
                </div>
              </div>
            )}

            {/* Summary Finale Stage */}
            {!isTailoring && isSummaryStage && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Holistic Career Summary Synthesis
                    </span>
                    <button
                      type="button"
                      disabled={isSynthesizing}
                      onClick={handleReSynthesizeSummary}
                      className="px-3 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white shadow-sm transition-all disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                    >
                      {isSynthesizing ? "⏳ Synthesizing..." : "↺ Re-Synthesize Summary"}
                    </button>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This executive summary unifies your entire career trajectory across all accepted experience enhancements into a compelling 3–4 sentence pitch.
                  </p>

                  <div className="p-3.5 rounded-xl bg-white dark:bg-gray-950 border border-purple-500/20 text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                    {synthesizedSummary ||
                      activeGroup.tailoredContent ||
                      activeGroup.suggestions[0]?.suggestedText ||
                      activeGroup.originalContent ||
                      "Executive professional summary aligned with target role."}
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleAcceptSection();
                      onFinalize?.();
                    }}
                    className="px-6 py-2.5 text-sm font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"
                  >
                    ✓ Approve & Finalize Resume
                  </button>
                </div>
              </div>
            )}

            {/* In-Context Bullets List (Experience & Skills) */}
            {!isTailoring && !isSummaryStage && activeGroup.suggestions.length > 0 && (
              <div className="space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Suggestions in Context ({activeGroup.suggestions.length})
                </div>

                {activeGroup.suggestions.map((sug, sIdx) => {
                  const isAccepted = sug.status === "accepted";
                  const isRejected = sug.status === "rejected";
                  const isPending = !sug.status || sug.status === "pending";
                  const isEditing = editingId === sug.id;

                  return (
                    <div
                      key={sug.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        isAccepted
                          ? "bg-emerald-500/[0.03] dark:bg-emerald-950/20 border-emerald-500/40 shadow-xs"
                          : isRejected
                          ? "bg-sky-500/[0.03] dark:bg-sky-950/20 border-sky-500/30"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs"
                      }`}
                    >
                      {/* Suggestion Card Header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-gray-100 dark:border-gray-800/80">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Bullet {sug.bulletIndex !== undefined ? sug.bulletIndex + 1 : sIdx + 1} of {activeGroup.suggestions.length}
                          </span>
                          {isPending ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                              ● Choose an option
                            </span>
                          ) : isAccepted ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              ✓ Tailored Applied
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                              ✓ Original Kept
                            </span>
                          )}
                        </div>

                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(sug)}
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
                              onClick={() => handleSaveEdit(sug.id)}
                              className="px-4 py-1 text-xs font-bold rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white shadow"
                            >
                              Save & Accept
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Symmetrical Side-by-Side Comparison (REQ-UBI-01, REQ-OPT-01) */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Symmetrical Card 1: Original */}
                          <div
                            onClick={() => handleToggleSuggestion(sug.id, "rejected")}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isRejected
                                ? "bg-sky-500/10 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30 shadow-xs"
                                : isAccepted
                                ? "bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                                : "bg-gray-50/70 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700/80 hover:border-gray-400"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 dark:border-gray-800">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                  {isRejected && <span className="text-sky-600 dark:text-sky-400">●</span>}
                                  Original (Before):
                                </span>
                                {isRejected && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                                    ✓ In Resume
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
                                {sug.originalText.startsWith("(") && sug.originalText.endsWith(")") ? (
                                  <span className="italic text-gray-400 dark:text-gray-500">
                                    {sug.originalText}
                                  </span>
                                ) : (
                                  <span>{sug.originalText.replace(/^[-*•–—]\s*/, "")}</span>
                                )}
                              </div>
                            </div>

                            <div className="pt-3 mt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSuggestion(sug.id, "rejected");
                                }}
                                className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                                  isRejected
                                    ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                }`}
                              >
                                ✕ Keep Original
                              </button>
                            </div>
                          </div>

                          {/* Symmetrical Card 2: Tailored Enhancement */}
                          <div
                            onClick={() => handleToggleSuggestion(sug.id, "accepted")}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isAccepted
                                ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs"
                                : isRejected
                                ? "bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                                : "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/70"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-gray-200/60 dark:border-gray-800">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                  {isAccepted && <span>●</span>}
                                  Tailored (Enhanced):
                                </span>
                                {isAccepted && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                    ✓ In Resume
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-normal">
                                {renderHighlightedKeywords(sug.suggestedText.replace(/^[-*•–—]\s*/, ""), sug.keywords)}
                              </div>
                            </div>

                            <div className="pt-3 mt-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSuggestion(sug.id, "accepted");
                                }}
                                className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all ${
                                  isAccepted
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/20"
                                }`}
                              >
                                ✓ Accept
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Plain-English Rationale (REQ-UBI-03) */}
                      {sug.reason && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic pt-1">
                          💡 <span className="font-medium text-gray-700 dark:text-gray-300">Why this helps:</span> {sug.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Batch Section Actions Footer */}
            <div className="pt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-800">
              <button
                type="button"
                disabled={currentSectionIndex === 0}
                onClick={handlePreviousSection}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
              >
                ← Previous Section
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectSection}
                  className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all active:scale-95"
                >
                  ↺ Keep Original Section & Continue →
                </button>
                <button
                  type="button"
                  onClick={handleAcceptSection}
                  className="px-5 py-2 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                >
                  ✓ Accept Section & Continue →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FLAT LIST OF ALL CHANGES */}
      {viewMode === "list" && (
        <div className="space-y-3">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] px-1 scrollbar-none">
            {["all", "keyword", "metric", "summary", "action_verb"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedListFilter(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all shrink-0 capitalize ${
                  selectedListFilter === cat
                    ? "bg-cyan-500 text-white shadow-xs"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {suggestions
            .filter((s) => {
              if (selectedListFilter === "all") return true;
              return s.category === selectedListFilter;
            })
            .map((sug) => {
              const isAccepted = sug.status === "accepted";
              const isRejected = sug.status === "rejected";
              const isPending = !sug.status || sug.status === "pending";

              return (
                <div
                  key={sug.id}
                  className={`p-4 rounded-xl border transition-all space-y-3 ${
                    isAccepted
                      ? "bg-emerald-500/[0.03] dark:bg-emerald-950/20 border-emerald-500/40 shadow-xs"
                      : isRejected
                      ? "bg-sky-500/[0.03] dark:bg-sky-950/20 border-sky-500/30"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-gray-100 dark:border-gray-800/80">
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      {sug.section}
                    </span>
                    <div>
                      {isPending ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          ● Choose an option
                        </span>
                      ) : isAccepted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                          ✓ Tailored Applied
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30">
                          ✓ Original Kept
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Symmetrical Side-by-Side Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Card 1: Original */}
                    <div
                      onClick={() => handleToggleSuggestion(sug.id, "rejected")}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isRejected
                          ? "bg-sky-500/10 dark:bg-sky-950/30 border-sky-500 ring-1 ring-sky-500/30 shadow-xs"
                          : isAccepted
                          ? "bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                          : "bg-gray-50/70 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700/80 hover:border-gray-400"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 block">
                          Original (Before)
                        </span>
                        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
                          {sug.originalText.replace(/^[-*•–—]\s*/, "")}
                        </p>
                      </div>
                      <div className="pt-2.5 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSuggestion(sug.id, "rejected");
                          }}
                          className={`w-full py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                            isRejected
                              ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }`}
                        >
                          {isRejected ? "✓ Keeping Original" : "Keep Original"}
                        </button>
                      </div>
                    </div>

                    {/* Card 2: Tailored Enhancement */}
                    <div
                      onClick={() => handleToggleSuggestion(sug.id, "accepted")}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isAccepted
                          ? "bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500/30 shadow-xs"
                          : isRejected
                          ? "bg-gray-50/50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60 hover:opacity-100"
                          : "bg-emerald-500/[0.04] dark:bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/70"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                          Tailored (After)
                        </span>
                        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-normal">
                          {renderHighlightedKeywords(sug.suggestedText.replace(/^[-*•–—]\s*/, ""), sug.keywords)}
                        </p>
                      </div>
                      <div className="pt-2.5 mt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleSuggestion(sug.id, "accepted");
                          }}
                          className={`w-full py-1.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                            isAccepted
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/20"
                          }`}
                        >
                          {isAccepted ? "✓ Tailored Accepted" : "Accept Tailored"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {sug.reason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic pt-1">
                      💡 <span className="font-medium text-gray-700 dark:text-gray-300">Why this helps:</span> {sug.reason}
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
