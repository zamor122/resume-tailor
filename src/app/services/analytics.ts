// Define event names as constants for consistency
export const events = {
  // Page & Session
  PAGE_VIEW: 'page_view',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  ENGAGEMENT: 'engagement', // Tracks user engagement to prevent false bounces
  
  // Content Input
  RESUME_PASTED: 'resume_pasted',
  RESUME_INPUT_STARTED: 'resume_input_started',
  JOB_DESCRIPTION_PASTED: 'job_description_pasted',
  JOB_DESCRIPTION_INPUT_STARTED: 'job_description_input_started',
  JOB_DESC_CHAR_COUNT: 'job_desc_char_count',
  CONTENT_CLASSIFIED: 'content_classified',
  UPLOAD_ATTEMPT: 'upload_attempt',
  UPLOAD_SUCCESS: 'upload_success',
  UPLOAD_ERROR: 'upload_error',
  
  // Resume Tailoring
  RESUME_TAILOR: 'resume_tailor',
  RESUME_TAILOR_SUCCESS: 'resume_tailor_success',
  RESUME_TAILOR_ERROR: 'resume_tailor_error',
  RESUME_TAILOR_AUTO: 'resume_tailor_auto', // Automatic tailoring triggered
  
  // Analysis & Scoring
  JOB_DESCRIPTION_ANALYSIS: 'job_description_analysis',
  RELEVANCY_SCORE: 'relevancy_score',
  AI_DETECTION_RUN: 'ai_detection_run',
  AI_DETECTION_RESULT: 'ai_detection_result',
  
  // Tools Usage
  TOOL_OPENED: 'tool_opened',
  TOOL_COMPLETED: 'tool_completed',
  TOOL_ERROR: 'tool_error',
  ATS_SIMULATOR: 'ats_simulator',
  KEYWORD_ANALYZER: 'keyword_analyzer',
  SKILLS_GAP: 'skills_gap',
  INTERVIEW_PREP: 'interview_prep',
  FORMAT_VALIDATOR: 'format_validator',
  ATS_OPTIMIZER: 'ats_optimizer',
  RESUME_VERSIONS: 'resume_versions',
  RESUME_STORYTELLER: 'resume_storyteller',
  MULTI_JOB_COMPARISON: 'multi_job_comparison',
  SKILLS_MARKET_VALUE: 'skills_market_value',
  
  // Chat & Commands
  CHAT_MESSAGE_SENT: 'chat_message_sent',
  CHAT_COMMAND_USED: 'chat_command_used',
  COMMAND_REANALYZE: 'command_reanalyze',
  COMMAND_TAILOR: 'command_tailor',
  COMMAND_SHOW_COMPARISON: 'command_show_comparison',
  COMMAND_HELP: 'command_help',
  
  // Views & UI
  COMPARISON_VIEW_OPENED: 'comparison_view_opened',
  COMPARISON_VIEW_MODE_CHANGED: 'comparison_view_mode_changed',
  CONTROL_PANEL_TOGGLED: 'control_panel_toggled',
  TOOLS_PANEL_OPENED: 'tools_panel_opened',
  SETTINGS_CHANGED: 'settings_changed',
  
  // Actions
  COPY_RESUME: 'copy_resume',
  EXPORT_RESUME: 'export_resume',
  DOWNLOAD_COMPARISON: 'download_comparison',
  TOGGLE_THEME: 'toggle_theme',
  
  // Job Search
  JOB_SEARCH: 'job_search',
  JOB_SELECTED: 'job_selected',
  USE_LOCATION: 'use_location',
  
  // User Journey
  USER_JOURNEY_STEP: 'user_journey_step',
  CONVERSION_EVENT: 'conversion_event', // Key milestone reached
  
  // Engagement Metrics
  TIME_ON_PAGE: 'time_on_page',
  SCROLL_DEPTH: 'scroll_depth',
  INTERACTION: 'interaction', // Generic interaction tracker
  
  // Rate Limiting & Quota
  MODEL_RATE_LIMIT_HIT: 'MODEL_RATE_LIMIT_HIT', // Track when per-IP rate limit is hit
  MODEL_QUOTA_EXCEEDED: 'MODEL_QUOTA_EXCEEDED', // Track when API quota is exceeded
  RATE_LIMIT_BACKEND_ENFORCED: 'RATE_LIMIT_BACKEND_ENFORCED', // Track backend-enforced rate limits
  CEREBRAS_GLOBAL_LIMIT_HIT: 'CEREBRAS_GLOBAL_LIMIT_HIT', // Track when Cerebras global limit is hit

  // Feedback
  GENERATION_REJECTED: 'generation_rejected',
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  EXIT_SURVEY_SHOWN: 'exit_survey_shown',
  EXIT_SURVEY_DISMISSED: 'exit_survey_dismissed',
  EXIT_SURVEY_SUBMITTED: 'exit_survey_submitted',
  CTA_TAILOR_CLICK: 'cta_tailor_click',
  TAILOR_ANOTHER_JOB_CLICK: 'tailor_another_job_click',

  // Rich interaction events (what + why)
  CLICK: 'click',
  LINK_CLICK: 'link_click',
  VIEW_MODE_CHANGED: 'view_mode_changed',
  MODAL_OPENED: 'modal_opened',
  AUTH_PROMPT_SHOWN: 'auth_prompt_shown',
  RESET_CLICK: 'reset_click',
  VIEW_RESUME_CLICK: 'view_resume_click',
  INPUT_FOCUS: 'input_focus',
};

/** Overrides merged into base tracking context (page, sessionId, timestamp). */
export interface TrackingContextOverrides {
  section?: string;
  hasResume?: boolean;
  hasJobDescription?: boolean;
  resumeCharCount?: number;
  jobDescCharCount?: number;
  resumeId?: string;
  jobTitle?: string;
  source?: string;
  element?: string;
  label?: string;
}

/**
 * Base payload for events: page, sessionId, timestamp. Merge with event-specific props.
 * Call from client only (uses window and localStorage).
 */
export function getTrackingContext(overrides?: TrackingContextOverrides): Record<string, unknown> {
  if (typeof window === 'undefined') {
    return { timestamp: new Date().toISOString(), ...overrides };
  }
  const pathname = window.location?.pathname ?? '/';
  const search = window.location?.search ?? '';
  const sessionId = localStorage.getItem('resume-tailor-session-id');
  const base: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    page: pathname,
    ...(search && { search }),
    ...(sessionId && { sessionId }),
  };
  if (overrides) {
    Object.assign(base, overrides);
  }
  return base;
}

/**
 * Track a click with standard context. Merges getTrackingContext(overrides) with element, label, and extra.
 */
export function trackClick(
  eventName: string,
  element: string,
  label: string,
  extra?: Record<string, unknown>
): Promise<boolean> {
  const context = getTrackingContext({ element, label, ...extra });
  return trackEvent(eventName, context);
}

// Add TypeScript type definition for the Umami window object
declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
  }
}

// Helper function to wait for Umami to be available
const waitForUmami = (maxWait = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }

    if (window.umami) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.umami) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
};

// Check if we're in development mode
const isDevelopment = () => {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development';
  }
  // Check both server-side and client-side environment
  return process.env.NODE_ENV === 'development' || 
         process.env.NEXT_PUBLIC_NODE_ENV === 'development' ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

// Track events using the Umami window object
export const trackEvent = async (
  eventName: string | {name: string, properties?: Record<string, unknown>}, 
  eventData?: Record<string, unknown>
): Promise<boolean> => {
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
    
    if (typeof window === 'undefined') {
      return false;
    }

    if (isDevelopment()) return true;

    // Wait for Umami to be available
    const umamiReady = await waitForUmami(3000);
    
    if (umamiReady && window.umami) {
      try {
        window.umami.track(name, data);
        return true;
      } catch (trackError) {
        console.error("[Analytics] Error calling umami.track:", trackError);
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error("[Analytics] Error tracking event:", error);
    return false;
  }
};

// Export a simplified analytics service
export const analytics = {
  events,
  trackEvent,
  getTrackingContext,
  trackClick,
}; 