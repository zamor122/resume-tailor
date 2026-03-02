"use client";

import SplitScreenTailorView from "@/app/components/SplitScreenTailorView";
import { analytics } from "@/app/services/analytics";
import { useEngagementTracking } from "./hooks/useEngagementTracking";
import { useEffect } from "react";

export default function Home() {
  // Track engagement to prevent false bounces
  useEngagementTracking();

  // Track page view on mount
  useEffect(() => {
    const now = Date.now();
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("airesumetailor_session_start", String(now));
      } catch {
        // ignore
      }
    }
    const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
    const search = typeof window !== "undefined" ? window.location.search : "";
    const referrer = typeof window !== "undefined" ? (document.referrer || "direct") : "direct";
    const hasPrefillResumeId = typeof search === "string" && search.includes("prefillResumeId");
    analytics.trackEvent(analytics.events.PAGE_VIEW, {
      ...analytics.getTrackingContext(),
      pathname,
      search: search || undefined,
      referrer,
      ...(hasPrefillResumeId && { hasPrefillResumeId: true }),
    });
    analytics.trackEvent(analytics.events.SESSION_START, {
      ...analytics.getTrackingContext(),
      pathname,
      search: search || undefined,
      referrer,
    });
  }, []);

  return (
    <main>
      <SplitScreenTailorView />
    </main>
  );
}
