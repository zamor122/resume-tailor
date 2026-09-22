"use client";

import React from "react";
import type { JevJudgeResult } from "@/app/services/jev";
import type { ResumeSuggestion } from "@/app/agent/state";

export interface Change {
  changeDescription: string;
  changeDetails: string;
  jevJudge?: JevJudgeResult;
  isJevVerified?: boolean;
}

export interface TailoredResumeChangesProps {
  changes?: Change[];
  suggestions?: ResumeSuggestion[];
  summary?: string;
  scoreImprovement?: number;
  jevJudge?: JevJudgeResult;
  isJevVerified?: boolean;
  loading?: boolean;
}

const TailoredResumeChanges: React.FC<TailoredResumeChangesProps> = ({
  changes = [],
  suggestions = [],
  summary,
  scoreImprovement,
  jevJudge,
  isJevVerified,
  loading,
}) => {
  if (loading && !changes.length && !suggestions.length && !summary) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="mt-1.5 h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const showJevVerifiedSummary = Boolean(isJevVerified || jevJudge);
  const showJevVerifiedScore = Boolean(isJevVerified || jevJudge);

  return (
    <div className="space-y-4">
      {/* Score Improvement Callout */}
      {scoreImprovement !== undefined && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              Score Improvement
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              +{scoreImprovement}% match boost
            </p>
          </div>
          {showJevVerifiedScore && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
              <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Jev Verified
            </span>
          )}
        </div>
      )}

      {/* Summary Block */}
      {summary && (
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Summary
            </span>
            {showJevVerifiedSummary && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Jev Verified
              </span>
            )}
          </div>
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{summary}</p>
        </div>
      )}

      {/* Changes List */}
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300">
        {changes
          .filter((change) => change?.changeDescription)
          .map((change, index) => (
            <li key={index} className="space-y-1">
              <div>
                <strong>{change.changeDescription}</strong>: {change.changeDetails}
                {(change.jevJudge || change.isJevVerified) && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 ml-2 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 align-middle">
                    <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Jev Verified
                  </span>
                )}
              </div>
              {change.jevJudge && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    +{change.jevJudge.scoreDeltaPercent}% Match
                  </span>
                  <span>
                    • {change.jevJudge.toneOfVoiceRating === "strong_authentic" ? "Authentic Tone" : "Professional Tone"}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    • {change.jevJudge.overallImpactScore}/5 Impact
                  </span>
                </div>
              )}
            </li>
          ))}
        {changes.length === 0 && !loading && !suggestions.length && !summary && (
          <li className="text-gray-500 dark:text-gray-400">No changes to display.</li>
        )}
      </ul>

      {/* Suggestions List (if provided) */}
      {suggestions.length > 0 && (
        <div className="space-y-2 pt-2">
          {suggestions.map((sug) => (
            <div
              key={sug.id}
              className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  {sug.section}
                </span>
                {sug.jevJudge && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    Jev Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{sug.suggestedText}</p>
              {sug.jevJudge && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    +{sug.jevJudge.scoreDeltaPercent}% Match
                  </span>
                  <span>
                    • {sug.jevJudge.toneOfVoiceRating === "strong_authentic" ? "Authentic Tone" : "Professional Tone"}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    • {sug.jevJudge.overallImpactScore}/5 Impact
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TailoredResumeChanges;
