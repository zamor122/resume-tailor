"use client";

import React, { useMemo } from "react";
import type { ResumeSuggestion } from "@/app/agent/state";
import { isSubstantiveChange } from "@/app/utils/resumeReassemble";
import { plainEnglishReason } from "@/app/utils/changeReason";

export interface ChangedAndWhyProps {
  suggestions?: ResumeSuggestion[];
  className?: string;
}

interface ShownChange {
  id: string;
  section?: string;
  before: string;
  after: string;
  reason: string | null;
}

/**
 * "Here's what we changed, and why" — the primary result view.
 *
 * A two-column before/after of the user's own bullets with a one-line,
 * plain-English reason under each change. No percentages, no gauge, no jargon
 * (PRODUCT-DIRECTION.md §4.1 Screen 4 / §4.2).
 */
export default function ChangedAndWhy({ suggestions = [], className = "" }: ChangedAndWhyProps) {
  const changes = useMemo<ShownChange[]>(() => {
    return (suggestions || [])
      .filter((s) => isSubstantiveChange(s.originalText, s.suggestedText))
      .map((s) => ({
        id: s.id,
        section: s.section,
        before: (s.originalText || "").trim(),
        after: (s.suggestedText || "").trim(),
        reason: plainEnglishReason(s),
      }));
  }, [suggestions]);

  if (changes.length === 0) {
    return (
      <section className={`neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] p-6 sm:p-8 rounded-2xl text-center space-y-3 ${className}`}>
        <span className="neo-tag bg-[#10B981] text-white text-[10px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
          OPTIMIZATION COMPLETE
        </span>
        <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028]">
          Here&rsquo;s What We Changed &amp; Why
        </h2>
        <p className="text-xs sm:text-sm font-mono text-gray-700 max-w-md mx-auto leading-relaxed">
          Nothing needed changing — your wording already reads the way this target job posting does. You can still inspect and review your full resume below.
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
          </li>
        ))}
      </ul>
    </section>
  );
}
