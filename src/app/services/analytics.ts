// Analytics event types
export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, unknown>;
};

// Analytics service
export const analytics = {
  trackEvent: (event: AnalyticsEvent) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', event);
      return;
    }

    // Send to Vercel Analytics with better error handling
    try {
      if (typeof window !== 'undefined' && window.va && typeof window.va === 'object') {
        const va = window.va as { track: (name: string, properties?: Record<string, unknown>) => void };
        if (typeof va.track === 'function') {
          va.track(event.name, event.properties);
        } else {
          console.warn('Vercel Analytics track method not available');
        }
      }
    } catch (error) {
      console.warn('Error tracking analytics event:', error);
    }
  },

  // Common events
  events: {
    JOB_SEARCH: 'job_search',
    RESUME_TAILOR: 'resume_tailor',
    COPY_RESUME: 'copy_resume',
    TOGGLE_THEME: 'toggle_theme',
    USE_LOCATION: 'use_location',
    JOB_DESCRIPTION_ANALYSIS: 'job_description_analysis'
  }
}; 