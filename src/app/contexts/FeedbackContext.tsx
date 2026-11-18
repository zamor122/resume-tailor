"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import { analytics } from "@/app/services/analytics";

const STORAGE_KEY = "airesumetailor_feedback_did_help_shown";

type Trigger = "copy" | "download";

interface FeedbackContextValue {
  showDidThisHelpPrompt: (trigger: Trigger) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  return ctx;
}

function DidThisHelpPrompt({
  trigger,
  onClose,
  onResponse,
}: {
  trigger: Trigger;
  onClose: () => void;
  onResponse: (response: "yes" | "no") => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Feedback"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-xl bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[5px_5px_0px_#1C2028] flex flex-col sm:flex-row items-center justify-between gap-3 text-[#1C2028]"
    >
      <div className="flex items-center gap-2">
        <span className="text-base">⚡</span>
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#1C2028]">
          Did this save you time?
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onResponse("yes")}
          className="neo-btn px-3.5 py-1.5 text-xs font-mono font-bold uppercase rounded bg-[#10B981] text-white hover:bg-[#059669] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onResponse("no")}
          className="neo-btn px-3.5 py-1.5 text-xs font-mono font-bold uppercase rounded bg-white text-[#1C2028] hover:bg-[#F4F1EA] border border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
        >
          No
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[#1C2028] hover:bg-[#F4F1EA] border border-[#1C2028] rounded"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [prompt, setPrompt] = useState<{ trigger: Trigger } | null>(null);

  const showDidThisHelpPrompt = useCallback((trigger: Trigger) => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    setPrompt({ trigger });
  }, []);

  const handleResponse = useCallback(
    (response: "yes" | "no") => {
      if (prompt) {
        analytics.trackEvent(analytics.events.FEEDBACK_SUBMITTED, {
          ...analytics.getTrackingContext({ element: "did_this_help" }),
          feedbackType: "did_this_help",
          response,
          trigger: prompt.trigger,
        });
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // ignore
      }
      setPrompt(null);
    },
    [prompt]
  );

  const handleClose = useCallback(() => {
    setPrompt(null);
  }, []);

  return (
    <FeedbackContext.Provider value={{ showDidThisHelpPrompt }}>
      {children}
      {prompt &&
        typeof document !== "undefined" &&
        createPortal(
          <DidThisHelpPrompt
            trigger={prompt.trigger}
            onClose={handleClose}
            onResponse={handleResponse}
          />,
          document.body
        )}
    </FeedbackContext.Provider>
  );
}
