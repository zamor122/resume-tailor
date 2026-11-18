"use client";

import React, { useState } from "react";
import { analytics } from "@/app/services/analytics";
import { useFeedback } from "@/app/contexts/FeedbackContext";

interface CopyButtonProps {
  text: string;
  context?: string;
  resumeId?: string;
  /** Where copy was triggered: resume_detail, profile, or inline */
  source?: "resume_detail" | "profile" | "inline";
  /** UI section for analytics */
  section?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ text, context = "tailored_resume", resumeId, source = "resume_detail", section }) => {
  const [copied, setCopied] = useState(false);
  const feedback = useFeedback();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      analytics.trackEvent(analytics.events.COPY_RESUME, {
        ...analytics.getTrackingContext({ section, resumeId }),
        element: "copy_resume",
        context,
        source,
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      try {
        if (typeof window !== "undefined") sessionStorage.setItem("airesumetailor_converted", "1");
      } catch {
        // ignore
      }
      feedback?.showDidThisHelpPrompt("copy");
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`neo-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-[#1C2028] font-mono font-bold text-xs transition-all ${
        copied
          ? "bg-[#10B981] text-white shadow-[2px_2px_0px_#1C2028]"
          : "bg-[#FAF7F0] text-[#1C2028] dark:bg-[#21262D] dark:text-[#FAF7F0] hover:bg-[#FFE0B2] shadow-[2px_2px_0px_#1C2028] active:translate-x-0.5 active:translate-y-0.5"
      }`}
    >
      <span>
        {copied ? "COPIED!" : "COPY"}
      </span>
      {copied ? (
        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )}
    </button>
  );
};

export default CopyButton; 