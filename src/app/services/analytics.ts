// Type declaration for Umami
declare global {
  interface Window {
    umami?: (eventName: string, eventData?: Record<string, unknown>) => void;
  }
}

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

    // Send to Umami Analytics
    try {
      if (typeof window !== 'undefined' && window.umami && typeof window.umami === 'function') {
        window.umami(event.name, event.properties);
      } else {
        console.warn('Umami Analytics not available');
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