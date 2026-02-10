"use client";

import { useState, useEffect } from "react";
import { trackEvent, events } from "@/app/services/analytics";

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  retryAfter?: number; // seconds until retry is allowed
  message?: string;
  endpoint?: string;
  modelKey?: string;
}

export default function RateLimitModal({
  isOpen,
  onClose,
  retryAfter = 60,
  message,
  endpoint,
  modelKey,
}: RateLimitModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(retryAfter);

  useEffect(() => {
    if (!isOpen) {
      setTimeRemaining(retryAfter);
      return;
    }

    // Track rate limit modal shown
    trackEvent(events.MODEL_RATE_LIMIT_HIT || 'MODEL_RATE_LIMIT_HIT', {
      endpoint: endpoint || 'unknown',
      modelKey: modelKey || 'unknown',
      retryAfter,
    });

    // Countdown timer
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, retryAfter, endpoint, modelKey]);

  if (!isOpen) return null;

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
  };

  const handleTryAgain = () => {
    trackEvent(events.MODEL_RATE_LIMIT_HIT || 'MODEL_RATE_LIMIT_HIT', {
      endpoint: endpoint || 'unknown',
      modelKey: modelKey || 'unknown',
      action: 'try_again_clicked',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-gray-900 rounded-xl border border-gray-700 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Header */}
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">
              It's very crowded right now
            </h2>
            <p className="text-gray-400 text-sm">
              {message || "Please try again in a little bit"}
            </p>
          </div>

          {/* Countdown Timer */}
          {timeRemaining > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">Try again in:</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          )}

          {/* Try Again Button */}
          <button
            onClick={handleTryAgain}
            disabled={timeRemaining > 0}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600"
          >
            {timeRemaining > 0 ? `Try Again (${formatTime(timeRemaining)})` : "Try Again"}
          </button>

          {/* Info Text */}
          <p className="mt-4 text-xs text-center text-gray-500">
            This helps ensure everyone gets fair access to our services
          </p>
        </div>
      </div>
    </div>
  );
}



