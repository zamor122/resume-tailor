"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { analytics } from "@/app/services/analytics";

const EXIT_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "didnt_trust", label: "Didn't trust the site" },
  { value: "technical_error", label: "Technical error" },
  { value: "just_browsing", label: "Just browsing" },
  { value: "other", label: "Other" },
] as const;

interface ExitSurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted: (reason: string, comment?: string) => void;
}

export default function ExitSurveyModal({
  isOpen,
  onClose,
  onSubmitted,
}: ExitSurveyModalProps) {
  const [reason, setReason] = useState<string>("");
  const [otherComment, setOtherComment] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    const comment = reason === "other" ? otherComment.trim().slice(0, 500) : undefined;
    analytics.trackEvent(analytics.events.EXIT_SURVEY_SUBMITTED, {
      ...analytics.getTrackingContext(),
      reason,
      ...(comment && { commentLength: comment.length }),
    });
    onSubmitted(reason, reason === "other" ? otherComment.trim() : undefined);
    setReason("");
    setOtherComment("");
    onClose();
  };

  const handleSkip = () => {
    analytics.trackEvent(analytics.events.EXIT_SURVEY_DISMISSED, {
      ...analytics.getTrackingContext(),
    });
    onClose();
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-survey-title"
    >
      <div
        className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-xl max-w-md w-full p-6 text-[#1C2028]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase tracking-wider">
              FEEDBACK CONSOLE
            </span>
            <span className="text-xs font-mono font-bold text-gray-500 uppercase">
              QUICK QUESTION
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="p-1 rounded border border-[#1C2028] bg-white hover:bg-[#F4F1EA] text-[#1C2028] transition-colors"
            aria-label="Close survey"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <h2 id="exit-survey-title" className="text-base font-mono font-bold text-[#1C2028] mb-4 leading-snug">
          What stopped you from tailoring your resume today?
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {EXIT_REASONS.map((r) => (
              <label
                key={r.value}
                className={`neo-box-sm border border-[#1C2028] p-3 rounded-lg flex items-center gap-3 cursor-pointer transition-all ${
                  reason === r.value
                    ? "bg-[#FFE7D6] shadow-[2px_2px_0px_#1C2028]"
                    : "bg-white hover:bg-[#F4F1EA]"
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="rounded-full border-2 border-[#1C2028] text-[#FF5722] focus:ring-[#FF5722] accent-[#FF5722]"
                />
                <span className="text-xs font-mono font-bold text-[#1C2028]">{r.label}</span>
              </label>
            ))}
          </div>
          {reason === "other" && (
            <input
              type="text"
              placeholder="Tell us more (optional)"
              value={otherComment}
              onChange={(e) => setOtherComment(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border-2 border-[#1C2028] bg-white text-[#1C2028] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5722]"
              maxLength={500}
              aria-label="Other reason"
            />
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="neo-btn flex-1 py-2.5 px-4 font-mono font-bold text-xs uppercase bg-white text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA]"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={!reason}
              className="neo-btn flex-1 py-2.5 px-4 font-mono font-bold text-xs uppercase bg-[#FF5722] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#E64A19] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
