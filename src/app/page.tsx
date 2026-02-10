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
    // Track page view with analytics
    analytics.trackEvent(analytics.events.PAGE_VIEW, { 
      page: 'home',
      timestamp: new Date().toISOString()
    });
    
    // Track session start
    analytics.trackEvent(analytics.events.SESSION_START, {
      timestamp: new Date().toISOString(),
      referrer: typeof window !== 'undefined' ? (document.referrer || 'direct') : 'direct',
    });
  }, []);

  return (
    <main>
      <SplitScreenTailorView />
    </main>
  );
}
