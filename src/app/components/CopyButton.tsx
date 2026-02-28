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
      className={`inline-flex items-center px-3 py-1.5 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md 
        ${copied 
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
          : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50'
        }`}
    >
      <span className="text-sm font-medium">
        {copied ? 'Copied!' : 'Copy'}
      </span>
      {copied ? (
        <svg className="ml-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="ml-1.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-2M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )}
    </button>
  );
};

export default CopyButton; 