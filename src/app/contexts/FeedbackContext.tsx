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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg flex flex-col sm:flex-row items-center gap-3"
    >
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">
        Did this save you time?
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onResponse("yes")}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60"
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => onResponse("no")}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          No
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
          feedbackType: "did_this_help",
          response,
          trigger: prompt.trigger,
          timestamp: new Date().toISOString(),
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
