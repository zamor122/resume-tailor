"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import type { ResumeSectionGroup, ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange, isolatePreciseOriginalChange } from "@/app/utils/resumeReassemble";
import { useGamification } from "@/app/contexts/GamificationContext";
import {
  resolveSuggestionAddedKeywords,
  persistSuggestionReaction,
  type SuggestionReaction,
} from "@/app/utils/addedKeywordTracker";
import AddedKeywordReactionBanner from "./AddedKeywordReactionBanner";

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
  resumeId?: string;
  userId?: string;
  accessToken?: string;
  sessionId?: string | null;
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
  resumeId,
  onSectionGroupsChange,
  onSuggestionsChange,
  activeSectionId,
  onActiveSectionChange,
  beforeScore = 50,
  matchScore = 85,
  jobDescription,
  jobTitle,
  resumeAST,
  userId,
  accessToken,
  sessionId,
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
  const { playSfx, awardXp } = useGamification();
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>("");
  const [localReactions, setLocalReactions] = useState<Record<string, SuggestionReaction>>({});

  // EXP Anti-Farm Guard: Each suggestion can only ever award EXP ONCE per review lifecycle
  const awardedSuggestionIdsRef = useRef<Set<string>>(new Set());
  const hasAwardedBulkRef = useRef<boolean>(false);

  // Seed with any suggestions that are already accepted when component mounts or updates
  useEffect(() => {
    suggestions.forEach((s) => {
      if (s.status === "accepted") {
        awardedSuggestionIdsRef.current.add(s.id);
      }
    });
  }, [suggestions]);

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

    const currentSug = suggestions.find((s) => s.id === targetId);
    // Anti-fraud: If locked and not a free reveal bullet, trigger unlock request
    if (!isUnlocked && !(currentSug as any)?.isFreeReveal) {
      onUnlockRequest?.();
      return;
    }

    onAcceptSuggestion?.(targetId);
    const nextStatus: "pending" | "accepted" = currentSug?.status === "accepted" ? "pending" : "accepted";
    if (nextStatus === "accepted") {
      playSfx("success");
      // Anti-Farm Guard: Only award EXP if this specific suggestion has not been awarded yet
      if (!awardedSuggestionIdsRef.current.has(targetId)) {
        awardedSuggestionIdsRef.current.add(targetId);
        const dedupeKey = `accept_suggestion_${resumeId || ""}_${targetId}`;
        awardXp(15, "Bullet Optimized (+15 XP)", dedupeKey);
      }
    } else {
      playSfx("boop");
    }

    const updated = suggestions.map((s) =>
      s.id === targetId ? { ...s, status: nextStatus } : s
    );
    onSuggestionsChange?.(updated);
  };

  const handleKeepOriginal = (id?: string) => {
    const targetId = id || substantiveSuggestions[activeIndex]?.id;
    if (!targetId) return;

    playSfx("click");
    onRejectSuggestion?.(targetId);
    const currentSug = suggestions.find((s) => s.id === targetId);
    const nextStatus: "pending" | "rejected" = currentSug?.status === "rejected" ? "pending" : "rejected";

    const updated = suggestions.map((s) =>
      s.id === targetId ? { ...s, status: nextStatus } : s
    );
    onSuggestionsChange?.(updated);
  };

  const handleAcceptAllRemaining = () => {
    if (!isUnlocked) {
      onUnlockRequest?.();
      return;
    }
    playSfx("success");
    if (!hasAwardedBulkRef.current) {
      hasAwardedBulkRef.current = true;
      const dedupeKey = `accept_all_bulk_${resumeId || ""}_${substantiveSuggestions.map((s) => s.id).join("_")}`;
      awardXp(50, "Full Section Optimization (+50 XP)", dedupeKey);
    }
    // Mark all substantive suggestions as awarded so toggling them later won't award duplicate EXP
    substantiveSuggestions.forEach((s) => awardedSuggestionIdsRef.current.add(s.id));
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
    if (!isUnlocked && !(sug as any)?.isFreeReveal) {
      onUnlockRequest?.();
      return;
    }
    setEditingId(sug.id);
    setEditText(sug.suggestedText);
  };

  const handleSaveEdit = (id: string) => {
    awardedSuggestionIdsRef.current.add(id);
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
              className="bg-[#10B981]/25 text-[#065F46] px-1 py-0.5 rounded font-mono font-bold border-b-2 border-[#10B981]"
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

  const currentSuggestion = substantiveSuggestions[activeIndex] || substantiveSuggestions[0];

  // Resolve enclosing section group for the active suggestion
  const currentSectionGroup = useMemo(() => {
    if (!currentSuggestion) return null;
    if (sectionGroups && sectionGroups.length > 0) {
      if (currentSuggestion.jobIndex !== undefined) {
        const found = sectionGroups.find(
          (g) => g.sectionType === "experience" && g.jobIndex === currentSuggestion.jobIndex
        );
        if (found) return found;
      }
      if (currentSuggestion.category === "summary" || currentSuggestion.section?.toLowerCase().includes("summary")) {
        const found = sectionGroups.find((g) => g.sectionType === "summary");
        if (found) return found;
      }
      if (currentSuggestion.category === "keyword" || currentSuggestion.section?.toLowerCase().includes("skill")) {
        const found = sectionGroups.find((g) => g.sectionType === "skills");
        if (found) return found;
      }
      if (currentSuggestion.section) {
        const cleanSec = currentSuggestion.section.toLowerCase();
        const found = sectionGroups.find((g) => {
          const cleanTitle = g.title.toLowerCase();
          return cleanTitle.includes(cleanSec) || cleanSec.includes(cleanTitle);
        });
        if (found) return found;
      }
    }
    return null;
  }, [currentSuggestion, sectionGroups]);

  const activeSectionComputedId = useMemo(() => {
    if (currentSectionGroup) return currentSectionGroup.id;
    if (currentSuggestion?.jobIndex !== undefined) {
      return `section-exp-${currentSuggestion.jobIndex}`;
    }
    if (currentSuggestion?.category === "summary" || currentSuggestion?.section?.toLowerCase().includes("summary")) {
      return "section-summary";
    }
    if (currentSuggestion?.category === "keyword" || currentSuggestion?.section?.toLowerCase().includes("skill")) {
      return "section-skills";
    }
    return null;
  }, [currentSectionGroup, currentSuggestion]);

  const lastReportedSectionRef = React.useRef<string | null>(null);

  // Synchronize active section ID to parent/live document preview
  useEffect(() => {
    if (
      activeSectionComputedId &&
      activeSectionComputedId !== lastReportedSectionRef.current &&
      activeSectionComputedId !== activeSectionId
    ) {
      lastReportedSectionRef.current = activeSectionComputedId;
      onActiveSectionChange?.(activeSectionComputedId);
    }
  }, [activeSectionComputedId, activeSectionId, onActiveSectionChange]);

  const currentOriginalText = useMemo(() => {
    if (!currentSuggestion) return "";
    return isolatePreciseOriginalChange(
      currentSuggestion.originalText,
      currentSuggestion.suggestedText,
      originalResume
    );
  }, [currentSuggestion, originalResume]);

  // NOTE (rules-of-hooks): this early return must stay BELOW every hook call.
  // It previously sat above the useMemo/useRef/useEffect block, so whenever
  // `totalCount` crossed 0 the hook count changed between renders and React
  // threw "Rendered more hooks than during the previous render".
  if (totalCount === 0) {
    return (
      <div className={`p-6 rounded-xl border-2 border-[#1C2028] bg-[#FAF7F0] shadow-[4px_4px_0px_#1C2028] text-center space-y-3 ${className}`}>
        <span className="text-3xl">🎉</span>
        <h3 className="text-base font-mono font-bold text-[#1C2028] uppercase">
          All Sections Aligned
        </h3>
        <p className="text-xs font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
          Your resume content already matches the key qualifications and requirements for this role.
        </p>
        {onFinalize && (
          <button
            type="button"
            onClick={onFinalize}
            className="neo-btn px-5 py-2 text-xs font-mono font-bold uppercase rounded-lg text-white bg-[#10B981] hover:bg-[#059669] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-all"
          >
            Finish &amp; View Resume →
          </button>
        )}
      </div>
    );
  }

  const isAddition = !currentOriginalText || !currentOriginalText.trim();
  const isAcc = currentSuggestion?.status === "accepted";
  const isRej = currentSuggestion?.status === "rejected";
  const isPending = !currentSuggestion?.status || currentSuggestion?.status === "pending";
  const isEditing = Boolean(currentSuggestion && editingId === currentSuggestion.id);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Agent Audit Rationale Banner */}
      {currentSectionGroup?.auditRationale && (
        <div className="p-3.5 rounded-xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] text-xs flex items-start gap-3">
          <span className="text-xl shrink-0 select-none">🤖</span>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="neo-tag text-[10px] font-mono font-bold uppercase tracking-wider bg-[#FF5722] text-white px-1.5 py-0.5 rounded border border-[#1C2028]">
                AGENT AUDIT RATIONALE
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-[11px] font-mono font-bold text-gray-700 dark:text-gray-300 truncate">
                {currentSectionGroup.title}
              </span>
            </div>
            <p className="font-mono text-xs leading-relaxed text-gray-800 dark:text-gray-200 mt-1">
              {currentSectionGroup.auditRationale}
            </p>
          </div>
        </div>
      )}

      {/* Sticky Top Header: Tri-Color Progress Bar & ATS Score Boost */}
      <div className="sticky top-2 z-20 p-4 rounded-xl neo-box bg-[#1C2028] text-white border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] space-y-3">
        {/* Score & Counters Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#FF5722]">
                Change {activeIndex + 1} of {totalCount}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-mono font-bold text-gray-200 truncate">
                {substantiveSuggestions[activeIndex]?.section || "Resume Review"}
              </span>
            </div>
          </div>

          {/* Dynamic Score Badge */}
          <div className="flex items-center gap-2 bg-[#FAF7F0] text-[#1C2028] px-3 py-1 rounded-lg border-2 border-[#1C2028] shadow-[2px_2px_0px_rgba(255,255,255,0.2)] shrink-0 font-mono">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-700">
              MATCH:
            </span>
            <div className="flex items-center gap-1 font-bold">
              <span className="text-gray-500 text-xs">{beforeScore}%</span>
              <span className="text-[#FF5722] text-[10px]">➔</span>
              <span className="text-[#059669] text-sm font-extrabold">{liveScore}%</span>
            </div>
            {currentBoost > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded neo-tag bg-[#10B981] text-white border border-[#1C2028]">
                +{currentBoost}%
              </span>
            )}
          </div>
        </div>

        {/* Tri-Color Segmented Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-1 w-full h-3 rounded-full bg-black/60 p-0.5 border border-white/20 overflow-hidden">
            {substantiveSuggestions.map((s, idx) => {
              const isAcc = s.status === "accepted";
              const isRej = s.status === "rejected";
              const isCur = idx === activeIndex;

              const bg = isAcc
                ? "bg-[#10B981]"
                : isRej
                ? "bg-[#EF4444]"
                : "bg-gray-600";

              return (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={() => handleSelectIndex(idx)}
                  title={`Change ${idx + 1}: ${s.section} (${isAcc ? "Accepted" : isRej ? "Kept Original" : "Unreviewed"})`}
                  className={`h-full flex-1 rounded-[2px] transition-all cursor-pointer ${bg} ${
                    isCur
                      ? "ring-2 ring-[#FF5722] scale-y-125 z-10"
                      : "opacity-80 hover:opacity-100"
                  }`}
                />
              );
            })}
          </div>

          {/* Metric Labels & Bulk Shortcuts */}
          <div className="flex items-center justify-between text-xs text-gray-300 font-mono flex-wrap gap-2 pt-0.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981] shrink-0" />
                <strong className="text-[#10B981] font-bold">{acceptedCount}</strong> Accepted
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#EF4444] shrink-0" />
                <strong className="text-[#EF4444] font-bold">{dismissedCount}</strong> Kept
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-gray-400 shrink-0" />
                <strong className="text-gray-200 font-bold">{remainingCount}</strong> Remaining
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleAcceptAllRemaining}
                disabled={remainingCount === 0}
                className="neo-btn px-2 py-0.5 text-[10px] font-bold uppercase text-white bg-[#10B981] hover:bg-[#059669] disabled:opacity-30 disabled:pointer-events-none rounded border border-white/20 transition-colors"
                title="Accept all remaining unreviewed changes"
              >
                {!isUnlocked ? "🔒 Unlock to Accept All" : "Accept All Remaining"}
              </button>
              <span className="text-gray-500">•</span>
              <button
                type="button"
                onClick={handleKeepAllRemaining}
                disabled={remainingCount === 0}
                className="neo-btn px-2 py-0.5 text-[10px] font-bold uppercase text-gray-200 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none rounded border border-white/20 transition-colors"
                title="Keep all remaining unreviewed changes as original"
              >
                Keep All Remaining
              </button>
            </div>
          </div>
        </div>

        {/* Global Navigation Controls */}
        <div className="flex items-center justify-between pt-1 border-t border-white/20 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={handlePrevious}
              className="neo-btn px-3 py-1 text-xs font-bold rounded-lg bg-white text-[#1C2028] hover:bg-[#F4F1EA] disabled:opacity-30 disabled:pointer-events-none transition-colors border border-[#1C2028]"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={activeIndex === totalCount - 1}
              onClick={handleNext}
              className="neo-btn px-3 py-1 text-xs font-bold rounded-lg bg-white text-[#1C2028] hover:bg-[#F4F1EA] disabled:opacity-30 disabled:pointer-events-none transition-colors border border-[#1C2028]"
            >
              Next →
            </button>
          </div>

          {onFinalize && (
            <button
              type="button"
              onClick={onFinalize}
              className="neo-btn px-3.5 py-1 text-xs font-bold uppercase rounded-lg text-white bg-[#FF5722] hover:bg-[#E64A19] border border-[#1C2028] shadow-[1px_1px_0px_#1C2028] transition-all active:scale-95"
            >
              ✓ Finish &amp; View Resume →
            </button>
          )}
        </div>
      </div>

      {/* Focused Single-Change Card (Showing ONE change at a time) */}
      {currentSuggestion && (
        <div className="neo-box bg-white border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl overflow-hidden transition-all">
          {/* Card Header: Section, Change #, Status & Adjust/Edit */}
          <div className="px-5 py-3.5 bg-[#FAF7F0] border-b-2 border-[#1C2028] flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-[#1C2028] text-xs flex items-center gap-1.5">
                  <span>📁</span>
                  <span>{currentSuggestion.section || "Resume Section"}</span>
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#FF5722]">
                  Active Suggestion
                </span>
              </div>
              {currentSuggestion.jevJudge && (
                <div className="flex flex-wrap items-center gap-2 mt-1 mb-1 font-mono">
                  <span className="neo-tag inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#10B981]">
                    <svg className="w-3 h-3 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Jev Verified
                  </span>
                  <span className="text-xs text-[#065F46] font-bold">
                    +{currentSuggestion.jevJudge.scoreDeltaPercent}% Match
                  </span>
                  <span className="text-xs text-gray-600">
                    • {currentSuggestion.jevJudge.toneOfVoiceRating === 'strong_authentic' ? 'Authentic Tone' : 'Professional Tone'}
                  </span>
                  <span className="text-xs text-[#B45309] font-bold">
                    • {currentSuggestion.jevJudge.overallImpactScore}/5 Impact
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 font-mono">
              {isPending ? (
                <span className="neo-tag px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FFFBEB] text-[#B45309] border border-[#F59E0B]">
                  ● Pending Choice
                </span>
              ) : isAcc ? (
                <span className="neo-tag px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#10B981]">
                  ✓ Tailored Active
                </span>
              ) : (
                <span className="neo-tag px-2.5 py-0.5 rounded text-[10px] font-bold bg-[#FEE2E2] text-[#991B1B] border border-[#EF4444]">
                  ✕ Original Kept
                </span>
              )}

              {!isEditing && (
                <button
                  type="button"
                  onClick={() => handleStartEdit(currentSuggestion)}
                  className="neo-btn px-2.5 py-1 text-xs font-mono font-bold text-[#1C2028] bg-white hover:bg-[#F4F1EA] rounded-lg border border-[#1C2028] shadow-[1px_1px_0px_#1C2028] transition-colors"
                >
                  ✎ Adjust / Edit
                </button>
              )}
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4 font-mono">
            {/* Inline Edit Mode */}
            {isEditing ? (
              <div className="space-y-3">
                <label className="text-xs font-mono font-bold text-[#1C2028] block">
                  Edit tailored bullet text:
                </label>
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs sm:text-sm font-mono rounded-lg border-2 border-[#1C2028] bg-[#FAF7F0] text-[#1C2028] focus:outline-none leading-relaxed shadow-[2px_2px_0px_#1C2028]"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="neo-btn px-3.5 py-1.5 text-xs font-mono font-bold rounded-lg bg-white text-[#1C2028] border border-[#1C2028] hover:bg-[#F4F1EA]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(currentSuggestion.id)}
                    className="neo-btn px-4 py-1.5 text-xs font-mono font-bold uppercase rounded-lg bg-[#10B981] hover:bg-[#059669] text-white border border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
                  >
                    Save &amp; Accept
                  </button>
                </div>
              </div>
            ) : (
              /* Simplified Line Diff: Soft Red (-) & Soft Green (+) */
              <div className="space-y-3 font-mono">
                {/* Red Line: Original (Only shown if modifying an existing line) */}
                {!isAddition && (
                  <div className="neo-box-sm flex items-start gap-3 p-3.5 rounded-xl bg-[#FEE2E2] border-2 border-[#1C2028] text-[#991B1B] shadow-[2px_2px_0px_#1C2028]">
                    <span className="font-mono font-bold text-[#EF4444] select-none shrink-0 text-base leading-snug">
                      -
                    </span>
                    <div className="text-xs sm:text-sm leading-relaxed flex-1 min-w-0">
                      <span className="neo-tag text-[9px] font-mono font-bold uppercase tracking-wider bg-[#EF4444] text-white px-1.5 py-0.5 rounded border border-[#1C2028] inline-block mb-1">
                        Original (Before):
                      </span>
                      <p className="mt-1 text-gray-800 break-words [overflow-wrap:anywhere]">{currentOriginalText.replace(/^[-*•–—]\s*/, "")}</p>
                    </div>
                  </div>
                )}

                {/* Green Line: Tailored Replacement or Addition */}
                {!isUnlocked && !(currentSuggestion as any)?.isFreeReveal ? (
                  <div className="neo-box-sm flex items-start gap-3 p-3.5 rounded-xl bg-[#FEF3C7] border-2 border-[#1C2028] text-[#92400E] shadow-[2px_2px_0px_#1C2028]">
                    <span className="font-mono font-bold text-[#F59E0B] select-none shrink-0 text-base leading-snug">
                      🔒
                    </span>
                    <div className="text-xs sm:text-sm leading-relaxed flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="neo-tag text-[9px] font-mono font-bold uppercase tracking-wider bg-[#F59E0B] text-[#1C2028] px-1.5 py-0.5 rounded border border-[#1C2028]">
                          Tailored Accomplishment (Locked):
                        </span>
                        <span className="text-[10px] font-mono font-bold text-gray-600">
                          Access pass required
                        </span>
                      </div>
                      <p className="mt-1 text-gray-700 font-medium break-words [overflow-wrap:anywhere]">
                        {currentSuggestion.suggestedText}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="neo-box-sm flex items-start gap-3 p-3.5 rounded-xl bg-[#ECFDF5] border-2 border-[#1C2028] text-[#065F46] shadow-[2px_2px_0px_#1C2028]">
                    <span className="font-mono font-bold text-[#10B981] select-none shrink-0 text-base leading-snug">
                      +
                    </span>
                    <div className="text-xs sm:text-sm leading-relaxed flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="neo-tag text-[9px] font-mono font-bold uppercase tracking-wider bg-[#10B981] text-white px-1.5 py-0.5 rounded border border-[#1C2028]">
                          {isAddition ? "Tailored (Addition):" : "Tailored (Enhanced):"}
                        </span>
                        {isAddition && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded neo-tag bg-[#1C2028] text-white">
                            + New bullet added
                          </span>
                        )}
                        {Boolean((currentSuggestion as any)?.isFreeReveal) && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded neo-tag bg-[#FF5722] text-white">
                            ✓ Free sample preview
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[#1C2028] font-bold break-words [overflow-wrap:anywhere]">
                        {renderHighlightedKeywords(
                          currentSuggestion.suggestedText.replace(/^[-*•–—]\s*/, ""),
                          currentSuggestion.keywords
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Plain-English Rationale */}
            {currentSuggestion.reason && (
              <div className="neo-box-sm p-3 rounded-xl bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] flex items-start gap-2">
                <span className="neo-tag bg-[#FF5722] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 shrink-0 border border-[#1C2028]">
                  WHY
                </span>
                <p className="text-xs font-mono font-medium text-[#1C2028] leading-relaxed">
                  {currentSuggestion.reason}
                </p>
              </div>
            )}

            {/* Missing JD Keyword Addition Awareness & Reaction */}
            {(() => {
              const addedKws = resolveSuggestionAddedKeywords(currentSuggestion, originalResume);
              const activeReaction = localReactions[currentSuggestion.id] ?? currentSuggestion.reaction;
              return (
                <AddedKeywordReactionBanner
                  addedKeywords={addedKws}
                  reaction={activeReaction}
                  onReact={(reaction) => {
                    setLocalReactions((prev) => ({ ...prev, [currentSuggestion.id]: reaction }));
                    if (onSuggestionsChange) {
                      onSuggestionsChange(
                        suggestions.map((s) =>
                          s.id === currentSuggestion.id ? { ...s, reaction } : s
                        )
                      );
                    }
                    void persistSuggestionReaction({
                      resumeId,
                      suggestionId: currentSuggestion.id,
                      reaction,
                      addedKeywords: addedKws,
                      userId,
                      accessToken,
                      sessionId,
                    });
                  }}
                />
              );
            })()}

            {/* Action Controls for Active Change */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-[#1C2028]/15 flex-wrap">
              <div className="flex items-center gap-2.5">
                {!isUnlocked && !(currentSuggestion as any)?.isFreeReveal ? (
                  <button
                    type="button"
                    onClick={() => onUnlockRequest?.()}
                    className="neo-btn px-4 py-2 text-xs font-mono font-bold rounded-xl bg-[#FF5722] hover:bg-[#F4511E] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <span>🔒</span>
                    <span>UNLOCK PLAN TO APPLY</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAcceptChange(currentSuggestion.id)}
                    className={`neo-btn px-4 py-2 text-xs font-mono font-bold rounded-xl border-2 border-[#1C2028] transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_#1C2028] active:scale-95 ${
                      isAcc
                        ? "bg-[#10B981] text-white"
                        : "bg-[#FF5722] hover:bg-[#F4511E] text-white"
                    }`}
                  >
                    {isAcc ? (
                      <>
                        <span>✓</span> {isAddition ? "ADDITION ACCEPTED" : "ACCEPTED"}
                      </>
                    ) : (
                      <span>{isAddition ? "ACCEPT ADDITION" : "ACCEPT CHANGE"}</span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleKeepOriginal(currentSuggestion.id)}
                  className={`neo-btn px-4 py-2 text-xs font-mono font-bold rounded-xl border-2 border-[#1C2028] transition-all flex items-center gap-1.5 active:scale-95 shadow-[2px_2px_0px_#1C2028] ${
                    isRej
                      ? "bg-[#EF4444] text-white"
                      : "bg-white text-[#1C2028] hover:bg-[#F4F1EA]"
                  }`}
                >
                  {isRej ? (
                    <>
                      <span>✕</span> {isAddition ? "ADDITION DISMISSED" : "KEPT ORIGINAL"}
                    </>
                  ) : (
                    <span>{isAddition ? "DISMISS ADDITION" : "KEEP ORIGINAL"}</span>
                  )}
                </button>
              </div>

              {activeIndex < totalCount - 1 ? (
                <button
                  type="button"
                  onClick={() => handleSelectIndex(activeIndex + 1)}
                  className="neo-btn px-3.5 py-2 text-xs font-mono font-bold text-[#1C2028] bg-white hover:bg-[#F4F1EA] rounded-xl transition-colors flex items-center gap-1.5 ml-auto border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
                >
                  <span>NEXT CHANGE</span>
                  <span>→</span>
                </button>
              ) : (
                onFinalize && (
                  <button
                    type="button"
                    onClick={onFinalize}
                    className="neo-btn px-4 py-2 text-xs font-mono font-bold text-white bg-[#10B981] hover:bg-[#059669] rounded-xl border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-all ml-auto"
                  >
                    FINISH REVIEW →
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
