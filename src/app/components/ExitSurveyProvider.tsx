"use client";

import React, { useCallback, useEffect, useState } from "react";
import { analytics } from "@/app/services/analytics";
import ExitSurveyModal from "./ExitSurveyModal";

const STORAGE_CONVERTED = "airesumetailor_converted";
const STORAGE_ENGAGED = "airesumetailor_engaged";
const STORAGE_SURVEY_SHOWN = "airesumetailor_exit_survey_shown";
const STORAGE_PENDING_EXIT_SURVEY = "airesumetailor_pending_exit_survey";

function isEligible(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(STORAGE_CONVERTED)) return false;
    if (sessionStorage.getItem(STORAGE_SURVEY_SHOWN)) return false;
    if (!sessionStorage.getItem(STORAGE_ENGAGED)) return false;
    return true;
  } catch {
    return false;
  }
}

function markSurveyShown(): void {
  try {
    if (typeof window !== "undefined") sessionStorage.setItem(STORAGE_SURVEY_SHOWN, "1");
  } catch {
    // ignore
  }
}

export default function ExitSurveyProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);

  const tryShowSurvey = useCallback(() => {
    if (!isEligible()) return;
    markSurveyShown();
    analytics.trackEvent(analytics.events.EXIT_SURVEY_SHOWN, {
      ...analytics.getTrackingContext(),
    });
    setShowModal(true);
  }, []);

  useEffect(() => {
    // Exit intent (desktop): cursor leaving viewport toward top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && e.relatedTarget === null) {
        tryShowSurvey();
      }
    };

    // Mobile: mark pending when tab hidden; show when they return
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        if (isEligible()) {
          try {
            sessionStorage.setItem(STORAGE_PENDING_EXIT_SURVEY, "1");
          } catch {
            // ignore
          }
        }
      } else if (document.visibilityState === "visible") {
        try {
          if (sessionStorage.getItem(STORAGE_PENDING_EXIT_SURVEY)) {
            sessionStorage.removeItem(STORAGE_PENDING_EXIT_SURVEY);
            tryShowSurvey();
          }
        } catch {
          // ignore
        }
      }
    };

    document.documentElement.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tryShowSurvey]);

  const handleClose = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleSubmitted = useCallback(() => {
    setShowModal(false);
  }, []);

  return (
    <>
      {children}
      <ExitSurveyModal
        isOpen={showModal}
        onClose={handleClose}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}
