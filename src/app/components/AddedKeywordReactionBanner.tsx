"use client";

import React from "react";
import type { SuggestionReaction } from "@/app/utils/addedKeywordTracker";

export interface AddedKeywordReactionBannerProps {
  addedKeywords: string[];
  reaction?: SuggestionReaction;
  onReact: (reaction: SuggestionReaction) => void;
}

/**
 * Highlights missing JD keywords that were not present in the original resume
 * and captures a quick helpful / not-accurate user reaction per suggestion.
 */
export default function AddedKeywordReactionBanner({
  addedKeywords,
  reaction,
  onReact,
}: AddedKeywordReactionBannerProps) {
  if (!addedKeywords || addedKeywords.length === 0) return null;

  const isSingle = addedKeywords.length === 1;

  return (
    <div
      data-testid="added-keyword-callout"
      className="bg-[#FFFBEB] border-2 border-[#1C2028] p-3 rounded-lg shadow-[2px_2px_0px_#1C2028] space-y-2"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="neo-tag bg-[#F59E0B] text-[#1C2028] text-[9px] font-mono font-extrabold px-1.5 py-0.5 border border-[#1C2028] uppercase">
          ✨ {isSingle ? "Added Missing Keyword" : "Added Missing Keywords"}
        </span>
        {addedKeywords.map((kw) => (
          <span
            key={kw}
            className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white text-[#1C2028] border border-[#1C2028]"
          >
            +{kw}
          </span>
        ))}
      </div>

      <p className="text-[11px] sm:text-xs font-mono text-[#78350F] leading-relaxed">
        You didn&rsquo;t have{" "}
        <strong className="text-[#1C2028]">{addedKeywords.join(", ")}</strong> in your original
        resume, so we added {isSingle ? "it" : "them"} to match the job posting. Make sure{" "}
        {isSingle ? "this accurately fits" : "these accurately fit"} your background.
      </p>

      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <span className="text-[11px] font-mono font-bold text-[#1C2028]">
          Helpful addition?
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onReact("helpful")}
            aria-pressed={reaction === "helpful"}
            className={`neo-btn px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border border-[#1C2028] transition-all ${
              reaction === "helpful"
                ? "bg-[#10B981] text-white shadow-[1px_1px_0px_#1C2028]"
                : "bg-white text-[#1C2028] hover:bg-[#ECFDF5]"
            }`}
          >
            👍 Helpful
          </button>
          <button
            type="button"
            onClick={() => onReact("not_helpful")}
            aria-pressed={reaction === "not_helpful"}
            className={`neo-btn px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border border-[#1C2028] transition-all ${
              reaction === "not_helpful"
                ? "bg-[#EF4444] text-white shadow-[1px_1px_0px_#1C2028]"
                : "bg-white text-[#1C2028] hover:bg-[#FEE2E2]"
            }`}
          >
            👎 Not helpful
          </button>
        </div>
      </div>
    </div>
  );
}
