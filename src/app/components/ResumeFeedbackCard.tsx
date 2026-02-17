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
        feedbackType: "thumbs",
        response: "yes",
        ...(resumeId && { resumeId }),
        timestamp: new Date().toISOString(),
      });
      await saveFeedback(true);
    } else {
      setShowThumbsComment(true);
      analytics.trackEvent(analytics.events.GENERATION_REJECTED, {
        feedbackType: "thumbs",
        response: "no",
        ...(resumeId && { resumeId }),
        timestamp: new Date().toISOString(),
      });
      await saveFeedback(false);
    }
  };

  const submitThumbsDownComment = async () => {
    const comment = thumbsDownComment.trim().slice(0, 500);
    if (comment) {
      analytics.trackEvent(analytics.events.FEEDBACK_SUBMITTED, {
        feedbackType: "thumbs",
        response: "no",
        comment,
        ...(resumeId && { resumeId }),
        timestamp: new Date().toISOString(),
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
    <div className="output-container p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Did you apply to a job using this resume?
      </h3>
      {alreadyAnswered ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {thumbsVote === "yes"
            ? "Thanks — you said you applied with this resume."
            : "Thanks for your feedback."}
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Knowing whether you used this tailored resume in an application helps us understand how well our tailoring works and improve the experience for everyone.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleThumbs("yes")}
              disabled={saving}
              className="p-2.5 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50"
              aria-label="Yes, I applied"
              title="Yes, I applied"
            >
              <span aria-hidden className="text-lg">👍</span> Yes, I applied
            </button>
            <button
              type="button"
              onClick={() => handleThumbs("no")}
              disabled={saving}
              className="p-2.5 rounded-lg transition-colors text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50"
              aria-label="Not yet"
              title="Not yet"
            >
              <span aria-hidden className="text-lg">👎</span> Not yet
            </button>
          </div>
          {showThumbsComment && (
            <div className="mt-4 space-y-3">
              <textarea
                placeholder="Optional: what would make it more useful for your next application?"
                value={thumbsDownComment}
                onChange={(e) => setThumbsDownComment(e.target.value)}
                rows={4}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-y min-h-[80px]"
                maxLength={500}
                aria-label="Optional feedback"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={submitThumbsDownComment}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Send
                </button>
                <button
                  type="button"
                  onClick={cancelThumbsChoice}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
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
