// Define event names as constants for consistency
export const events = {
  RESUME_TAILOR: 'resume_tailor',
  RESUME_TAILOR_SUCCESS: 'resume_tailor_success',
  RESUME_TAILOR_ERROR: 'resume_tailor_error',
  JOB_DESCRIPTION_ANALYSIS: 'job_description_analysis',
  RELEVANCY_SCORE: 'relevancy_score',
  COPY_RESUME: 'copy_resume',
  TOGGLE_THEME: 'toggle_theme',
  USE_LOCATION: 'use_location',
  JOB_SEARCH: 'job_search'
};

// Add TypeScript type definition for the Umami window object
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
  }
}

// Track events using the Umami window object
export const trackEvent = (eventName: string | {name: string, properties?: Record<string, unknown>}, 
                          eventData?: Record<string, unknown>) => {
  try {
    // Handle both new direct style and old object style
    let name: string;
    let data: Record<string, unknown> | undefined;
    
    if (typeof eventName === 'object' && eventName.name) {
      // Old style: analytics.trackEvent({name: 'event', properties: {}})
      name = eventName.name;
      data = eventName.properties;
    } else {
      // New style: analytics.trackEvent('event', {})
      name = eventName as string;
      data = eventData;
    }
    
    if (typeof window !== 'undefined' && window.umami) {
      window.umami.track(name, data);
      console.log(`[Analytics] Tracked event: ${name}`, data);
      return true;
    } else {
      console.warn(`[Analytics] Umami not available for event: ${name}`);
      return false;
    }
  } catch (error) {
    console.error(`[Analytics] Error tracking event:`, error);
    return false;
  }
};

// Export a simplified analytics service
export const analytics = {
  events,
  trackEvent
}; 