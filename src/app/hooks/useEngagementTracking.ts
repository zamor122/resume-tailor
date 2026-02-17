"use client";

import { useEffect, useRef } from 'react';
import { analytics } from '../services/analytics';

/**
 * Hook to track user engagement and prevent false bounce rates
 * For SPAs, we need to track interactions to show users are engaged
 */
export function useEngagementTracking() {
  const engagementTracked = useRef(false);
  const startTime = useRef<number>(Date.now());
  const scrollDepthTracked = useRef<{ [key: number]: boolean }>({});
  const interactionCount = useRef(0);

  useEffect(() => {
    // Track engagement event immediately to prevent false bounce
    const trackEngagement = () => {
      if (!engagementTracked.current) {
        analytics.trackEvent(analytics.events.ENGAGEMENT, {
          type: 'initial',
          timestamp: new Date().toISOString(),
        });
        engagementTracked.current = true;
      }
    };

    // Track engagement on any user interaction
    const handleInteraction = () => {
      interactionCount.current++;
      trackEngagement();
      
      // Track interaction event
      analytics.trackEvent(analytics.events.INTERACTION, {
        count: interactionCount.current,
        timestamp: new Date().toISOString(),
      });
    };

    // Track scroll depth
    const handleScroll = () => {
      trackEngagement();
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);
      
      // Track milestones: 25%, 50%, 75%, 100%
      const milestones = [25, 50, 75, 100];
      milestones.forEach(milestone => {
        if (scrollPercent >= milestone && !scrollDepthTracked.current[milestone]) {
          scrollDepthTracked.current[milestone] = true;
          if (milestone >= 25 && typeof sessionStorage !== "undefined") {
            try {
              sessionStorage.setItem("airesumetailor_engaged", "1");
            } catch {
              // ignore
            }
          }
          analytics.trackEvent(analytics.events.SCROLL_DEPTH, {
            depth: milestone,
            scrollPercent,
            timestamp: new Date().toISOString(),
          });
        }
      });
    };

    // Track time on page periodically
    const timeInterval = setInterval(() => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      
      // Track at 10s, 30s, 60s, 2min, 5min milestones
      const milestones = [10, 30, 60, 120, 300];
      milestones.forEach(milestone => {
        if (timeSpent === milestone) {
          if (milestone >= 10 && typeof sessionStorage !== "undefined") {
            try {
              sessionStorage.setItem("airesumetailor_engaged", "1");
            } catch {
              // ignore
            }
          }
          analytics.trackEvent(analytics.events.TIME_ON_PAGE, {
            seconds: timeSpent,
            minutes: Math.round(timeSpent / 60 * 10) / 10,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }, 1000);

    // Track on page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        trackEngagement();
      }
    };

    // Add event listeners
    const events = ['click', 'keydown', 'touchstart', 'mousemove'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: false, passive: true });
    });

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Track initial engagement
    trackEngagement();

    // Cleanup
    return () => {
      clearInterval(timeInterval);
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Track session end
      const totalTime = Math.round((Date.now() - startTime.current) / 1000);
      analytics.trackEvent(analytics.events.SESSION_END, {
        duration: totalTime,
        interactions: interactionCount.current,
        timestamp: new Date().toISOString(),
      });
    };
  }, []);
}

