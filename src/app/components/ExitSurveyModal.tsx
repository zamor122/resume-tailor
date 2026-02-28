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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-survey-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="exit-survey-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Quick question: What stopped you from tailoring your resume today?
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {EXIT_REASONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="rounded-full border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{r.label}</span>
              </label>
            ))}
          </div>
          {reason === "other" && (
            <input
              type="text"
              placeholder="Tell us more (optional)"
              value={otherComment}
              onChange={(e) => setOtherComment(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              maxLength={500}
              aria-label="Other reason"
            />
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={!reason}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : null;
}
