// Analytics event types
export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, any>;
};

// Analytics service
export const analytics = {
  trackEvent: (event: AnalyticsEvent) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
      return;
    }

    // Send to Vercel Analytics
    if (typeof window !== 'undefined' && 'va' in window) {
      (window as any).va?.track(event.name, event.properties);
    }
  },

  // Common events
  events: {
    JOB_SEARCH: 'job_search',
    RESUME_TAILOR: 'resume_tailor',
    COPY_RESUME: 'copy_resume',
    TOGGLE_THEME: 'toggle_theme',
    USE_LOCATION: 'use_location',
  }
}; 