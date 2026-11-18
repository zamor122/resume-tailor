"use client";

import React, { useState, useEffect } from "react";
import { analytics } from "@/app/services/analytics";

interface ResumeFeedbackCardProps {
  resumeId?: string;
  initialAppliedWithResume?: boolean | null;
  initialFeedbackComment?: string | null;
  userId?: string;
  accessToken?: string;
  sessionId?: string;
}

export default function ResumeFeedbackCard({
  resumeId,
  initialAppliedWithResume,
  initialFeedbackComment,
  userId,
  accessToken,
  sessionId,
}: ResumeFeedbackCardProps) {
  const [thumbsVote, setThumbsVote] = useState<"yes" | "no" | null>(null);
  const [thumbsDownComment, setThumbsDownComment] = useState("");
  const [showThumbsComment, setShowThumbsComment] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync initial state from props (e.g. after load or refetch)
  useEffect(() => {
    if (thumbsVote !== null) return;
    if (initialAppliedWithResume === true) {
      setThumbsVote("yes");
    } else if (initialAppliedWithResume === false) {
      setThumbsVote("no");
      if (initialFeedbackComment) setThumbsDownComment(initialFeedbackComment);
    }
  }, [initialAppliedWithResume, initialFeedbackComment, thumbsVote]);

  const saveFeedback = async (applied: boolean, comment?: string) => {
    if (!resumeId) return;
    const hasAuth = userId && accessToken;
    const hasSession = sessionId;
    if (!hasAuth && !hasSession) return;

    setSaving(true);
    try {
      const res = await fetch("/api/resume/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          applied,
          comment: comment?.trim().slice(0, 500) || undefined,
          ...(userId && { userId }),
          ...(accessToken && { accessToken }),
          ...(sessionId && { sessionId }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save feedback");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleThumbs = async (response: "yes" | "no") => {
    if (thumbsVote) return;
    setThumbsVote(response);
    if (response === "yes") {
      analytics.trackEvent(analytics.events.FEEDBACK_SUBMITTED, {
        ...analytics.getTrackingContext({ section: "output", element: "thumbs", resumeId }),
        feedbackType: "thumbs",
        response: "yes",
      });
      await saveFeedback(true);
    } else {
      setShowThumbsComment(true);
      analytics.trackEvent(analytics.events.GENERATION_REJECTED, {
        ...analytics.getTrackingContext({ section: "output", element: "thumbs", resumeId }),
        feedbackType: "thumbs",
        response: "no",
      });
      await saveFeedback(false);
    }
  };

  const submitThumbsDownComment = async () => {
    const comment = thumbsDownComment.trim().slice(0, 500);
    if (comment) {
      analytics.trackEvent(analytics.events.FEEDBACK_SUBMITTED, {
        ...analytics.getTrackingContext({ section: "output", element: "thumbs", resumeId }),
        feedbackType: "thumbs",
        response: "no",
        commentLength: comment.length,
      });
    }
    await saveFeedback(false, comment || undefined);
    setShowThumbsComment(false);
    setThumbsDownComment("");
  };

  const cancelThumbsChoice = () => {
    // Only hide the comment box; keep thumbsVote so we stay in "Thanks" state if already saved
    setShowThumbsComment(false);
    setThumbsDownComment("");
  };

  const alreadyAnswered = thumbsVote !== null;

  return (
    <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] p-5 sm:p-6 rounded-xl space-y-3">
      <div className="flex items-center gap-2">
        <span className="neo-tag bg-[#FF5722] text-white text-[9px] font-mono font-bold px-2 py-0.5 border border-[#1C2028]">
          FEEDBACK
        </span>
        <h3 className="text-base sm:text-lg font-mono font-bold text-[#1C2028]">
          Did you apply to a job using this resume?
        </h3>
      </div>
      {alreadyAnswered ? (
        <div className="bg-[#ECFDF5] border border-[#1C2028] p-3 rounded-lg text-xs font-mono font-bold text-[#065F46]">
          {thumbsVote === "yes"
            ? "✓ Thanks! You reported applying with this tailored resume."
            : "✓ Thanks for sharing your feedback with our team."}
        </div>
      ) : (
        <>
          <p className="text-xs sm:text-sm font-mono text-gray-700 leading-relaxed">
            Knowing whether you used this tailored resume helps us tune our keyword calibration and make recommendations better for your upcoming applications.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleThumbs("yes")}
              disabled={saving}
              className="neo-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#059669] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] font-mono font-bold text-xs uppercase tracking-wider disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px]"
              aria-label="Yes, I applied"
            >
              <span aria-hidden className="text-base">👍</span> Yes, I applied
            </button>
            <button
              type="button"
              onClick={() => handleThumbs("no")}
              disabled={saving}
              className="neo-btn inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:bg-[#F4F1EA] text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] font-mono font-bold text-xs uppercase tracking-wider disabled:opacity-50 active:translate-x-[1px] active:translate-y-[1px]"
              aria-label="Not yet"
            >
              <span aria-hidden className="text-base">👎</span> Not yet
            </button>
          </div>
          {showThumbsComment && (
            <div className="mt-4 space-y-3 pt-2 border-t border-[#1C2028]/15">
              <textarea
                placeholder="Optional: what would make it more effective for your next application?"
                value={thumbsDownComment}
                onChange={(e) => setThumbsDownComment(e.target.value)}
                rows={3}
                className="w-full p-3 text-xs sm:text-sm rounded-lg border-2 border-[#1C2028] bg-white text-[#1C2028] font-mono shadow-[2px_2px_0px_#1C2028] focus:outline-none resize-y min-h-[80px]"
                maxLength={500}
                aria-label="Optional feedback"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={submitThumbsDownComment}
                  disabled={saving}
                  className="neo-btn px-4 py-2 text-xs font-mono font-bold uppercase rounded-lg bg-[#FF5722] hover:bg-[#E64A19] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] disabled:opacity-50"
                >
                  Submit Feedback
                </button>
                <button
                  type="button"
                  onClick={cancelThumbsChoice}
                  disabled={saving}
                  className="neo-btn px-3 py-2 text-xs font-mono font-bold text-gray-600 hover:text-[#1C2028] underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
