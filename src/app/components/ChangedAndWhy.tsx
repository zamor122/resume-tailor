"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange } from "@/app/utils/resumeReassemble";
import { plainEnglishReason } from "@/app/utils/changeReason";
import {
  resolveSuggestionAddedKeywords,
  persistSuggestionReaction,
  type SuggestionReaction,
} from "@/app/utils/addedKeywordTracker";
import AddedKeywordReactionBanner from "./AddedKeywordReactionBanner";

export interface ChangedAndWhyProps {
  suggestions?: ResumeSuggestion[];
  originalResume?: string;
  resumeId?: string;
  userId?: string;
  accessToken?: string;
  sessionId?: string | null;
  onSuggestionsChange?: (suggestions: ResumeSuggestion[]) => void;
  className?: string;
}

interface ShownChange {
  id: string;
  section?: string;
  before: string;
  after: string;
  reason: string | null;
  addedMissingKeywords: string[];
  reaction?: SuggestionReaction;
}

/**
 * "Here's what we changed, and why" — the primary result view.
 *
 * A two-column before/after of the user's own bullets with a one-line,
 * plain-English reason under each change, plus transparent awareness + reactions
 * whenever missing JD keywords were newly added.
 */
export default function ChangedAndWhy({
  suggestions = [],
  originalResume,
  resumeId,
  userId,
  accessToken,
  sessionId,
  onSuggestionsChange,
  className = "",
}: ChangedAndWhyProps) {
  const [localReactions, setLocalReactions] = useState<Record<string, SuggestionReaction>>({});

  // Sync any persisted reactions from incoming suggestions
  useEffect(() => {
    const seeded: Record<string, SuggestionReaction> = {};
    for (const s of suggestions || []) {
      if (s.reaction) seeded[s.id] = s.reaction;
    }
    if (Object.keys(seeded).length > 0) {
      setLocalReactions((prev) => ({ ...seeded, ...prev }));
    }
  }, [suggestions]);

  const changes = useMemo<ShownChange[]>(() => {
    return (suggestions || [])
      .filter((s) => isSubstantiveChange(s.originalText, s.suggestedText))
      .map((s) => ({
        id: s.id,
        section: s.section,
        before: (s.originalText || "").trim(),
        after: (s.suggestedText || "").trim(),
        reason: plainEnglishReason(s),
        addedMissingKeywords: resolveSuggestionAddedKeywords(s, originalResume),
        reaction: localReactions[s.id] ?? s.reaction,
      }));
  }, [suggestions, originalResume, localReactions]);

  const handleReact = (change: ShownChange, reaction: SuggestionReaction) => {
    setLocalReactions((prev) => ({ ...prev, [change.id]: reaction }));
    if (onSuggestionsChange) {
      onSuggestionsChange(
        (suggestions || []).map((s) => (s.id === change.id ? { ...s, reaction } : s))
      );
    }
    void persistSuggestionReaction({
      resumeId,
      suggestionId: change.id,
      reaction,
      addedKeywords: change.addedMissingKeywords,
      userId,
      accessToken,
      sessionId,
    });
  };

  if (changes.length === 0) {
    return (
      <section className={`neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] p-6 sm:p-8 rounded-2xl text-center space-y-3 ${className}`}>
        <span className="neo-tag bg-[#FF5722] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
          READY FOR RE-TAILOR
        </span>
        <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028]">
          Here&rsquo;s What We Changed &amp; Why
        </h2>
        <p className="text-xs sm:text-sm font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
          No bullet-level diffs were attached to this snapshot. Click <strong>Re-Tailor This Resume</strong> above or switch to <strong>Match &amp; Keywords</strong> to apply targeted keyword upgrades.
        </p>
      </section>
    );
  }

  const count = changes.length;

  return (
    <section className={`neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] p-6 sm:p-8 rounded-2xl space-y-6 ${className}`}>
      <header className="space-y-2 border-b-2 border-[#1C2028] pb-4">
        <div className="flex items-center gap-2">
          <span className="neo-tag bg-[#FF5722] text-white text-[10px] font-mono font-bold px-2.5 py-0.5 border border-[#1C2028] shadow-[1px_1px_0px_#1C2028]">
            CHANGE LOG
          </span>
          <span className="neo-tag bg-[#10B981] text-white text-[10px] font-mono font-bold px-2.5 py-0.5 border border-[#1C2028] shadow-[1px_1px_0px_#1C2028]">
            {count} {count === 1 ? "IMPROVEMENT" : "IMPROVEMENTS"}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028]">
          Here&rsquo;s What We Changed &amp; Why
        </h2>
        <p className="text-xs sm:text-sm font-mono text-gray-700 leading-relaxed">
          {count} meaningful {count === 1 ? "change" : "changes"} applied. Your original wording on the left, the tailored high-impact version on the right.
        </p>
      </header>

      <ul className="space-y-4">
        {changes.map((change, idx) => (
          <li
            key={change.id}
            className="neo-box bg-[#F4F1EA] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] p-4 sm:p-5 rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="neo-tag bg-[#1C2028] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
                {change.section ? change.section.toUpperCase() : `CHANGE 0${idx + 1}`}
              </span>
              <span className="text-[10px] font-mono text-gray-500 font-bold">
                BEFORE / AFTER
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white border-2 border-[#1C2028] p-3.5 rounded-lg shadow-[2px_2px_0px_#1C2028]">
                <span className="neo-tag bg-[#E5E0D8] text-[#1C2028] text-[9px] font-mono font-bold px-1.5 py-0.5 mb-2 inline-block border border-[#1C2028]">
                  ORIGINAL
                </span>
                <p className="text-xs sm:text-sm font-mono leading-relaxed text-gray-700">
                  {change.before}
                </p>
              </div>
              <div className="bg-[#ECFDF5] border-2 border-[#1C2028] p-3.5 rounded-lg shadow-[2px_2px_0px_#1C2028]">
                <span className="neo-tag bg-[#10B981] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 mb-2 inline-block border border-[#1C2028]">
                  ✓ TAILORED
                </span>
                <p className="text-xs sm:text-sm font-mono leading-relaxed text-[#1C2028] font-bold">
                  {change.after}
                </p>
              </div>
            </div>
            {change.reason && (
              <div className="bg-white border-2 border-[#1C2028] p-2.5 rounded-lg shadow-[2px_2px_0px_#1C2028] flex items-start gap-2">
                <span className="neo-tag bg-[#FF5722] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 shrink-0 border border-[#1C2028]">
                  WHY
                </span>
                <span className="text-xs font-mono font-medium text-[#1C2028] leading-relaxed">
                  {change.reason}
                </span>
              </div>
            )}
            <AddedKeywordReactionBanner
              addedKeywords={change.addedMissingKeywords}
              reaction={change.reaction}
              onReact={(reaction) => handleReact(change, reaction)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
