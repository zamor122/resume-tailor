"use client";

import { useEffect, useState } from 'react';

declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
  }
}

// Check if we're in development mode
const isDevelopment = () => {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'development';
  }
  return process.env.NODE_ENV === 'development' || 
         process.env.NEXT_PUBLIC_NODE_ENV === 'development' ||
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

export default function UmamiVerifier() {
  const [status, setStatus] = useState<'checking' | 'ready' | 'failed'>('checking');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip verification in development mode
    if (isDevelopment()) {
      console.log('[Umami] 🚫 DEV MODE - Analytics verification skipped');
      setStatus('ready');
      return;
    }

    // Wait for Umami to load and verify it's working
    const verifyUmami = (): boolean => {
      // Check if Umami is available
      if (window.umami && typeof window.umami.track === 'function') {
        console.log('[Umami] ✅ Analytics verified and ready');
        setStatus('ready');
        
        // Test tracking a verification event (only in production)
        try {
          window.umami.track('umami_verified', { 
            timestamp: new Date().toISOString(),
            page: window.location.pathname
          });
          console.log('[Umami] ✅ Test event tracked successfully');
        } catch (error) {
          console.error('[Umami] ❌ Error tracking test event:', error);
        }
        return true;
      }
      return false;
    };

    // Try immediately
    if (verifyUmami()) {
      return;
    }

    // Retry with increasing delays (up to 5 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    const retryInterval = setInterval(() => {
      attempts++;
      
      if (verifyUmami()) {
        clearInterval(retryInterval);
      } else if (attempts >= maxAttempts) {
        console.warn('[Umami] ⚠️ Analytics not available after multiple retries');
        setStatus('failed');
        clearInterval(retryInterval);
      }
    }, 500);

    return () => clearInterval(retryInterval);
  }, []);

  // Log status in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Umami] Status: ${status}`);
    }
  }, [status]);

  return null; // This component doesn't render anything
}

