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
      <section className={`output-container p-6 text-center space-y-2 ${className}`}>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Here&rsquo;s what we changed, and why
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Nothing needed changing — your wording already reads the way this job
          posting does. You can still open your resume below.
        </p>
      </section>
    );
  }

  const count = changes.length;

  return (
    <section className={`output-container p-5 sm:p-6 space-y-5 ${className}`}>
      <header className="space-y-1">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
          Here&rsquo;s what we changed, and why
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {count} meaningful {count === 1 ? "change" : "changes"} — your original
          words on the left, the improved version on the right.
        </p>
      </header>

      <ul className="space-y-4">
        {changes.map((change) => (
          <li
            key={change.id}
            className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 p-4 space-y-3"
          >
            {change.section && (
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {change.section}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-lg bg-white/70 dark:bg-gray-800/40 border border-gray-200/70 dark:border-gray-700/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                  Before
                </p>
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {change.before}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
                  After
                </p>
                <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">
                  {change.after}
                </p>
              </div>
            </div>
            {change.reason && (
              <p className="flex items-start gap-1.5 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                <span aria-hidden className="shrink-0">✦</span>
                <span>{change.reason}</span>
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
