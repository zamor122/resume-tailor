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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-xl text-[#1C2028]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded border border-[#1C2028] bg-white hover:bg-[#F4F1EA] text-[#1C2028] transition-colors"
          aria-label="Close modal"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="p-6">
          {/* Badge & Header */}
          <div className="mb-4 text-center">
            <div className="inline-flex items-center gap-1.5 neo-tag bg-[#F59E0B] text-[#1C2028] text-[10px] px-2 py-0.5 font-mono font-bold uppercase mb-2">
              <span>⚠️</span>
              <span>RADAR: HIGH TRAFFIC</span>
            </div>
            <h2 className="text-xl font-mono font-extrabold text-[#1C2028] mb-1">
              SYSTEM AT CAPACITY
            </h2>
            <p className="text-gray-700 text-xs font-mono leading-relaxed">
              {message || "High demand on neural processors. Please allow a moment before next request."}
            </p>
          </div>

          {/* Countdown Timer */}
          {timeRemaining > 0 && (
            <div className="mb-5 p-4 rounded-lg bg-white border-2 border-[#1C2028] neo-box-sm shadow-[3px_3px_0px_#1C2028]">
              <div className="text-center">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-600 mb-1">
                  COOLDOWN TIMER:
                </p>
                <p className="text-2xl font-mono font-extrabold text-[#FF5722]">
                  {formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          )}

          {/* Try Again Button */}
          <button
            onClick={handleTryAgain}
            disabled={timeRemaining > 0}
            className="neo-btn w-full py-3 px-4 rounded-lg bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-mono font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {timeRemaining > 0 ? `TRY AGAIN (${formatTime(timeRemaining)})` : "TRY AGAIN"}
          </button>

          {/* Info Text */}
          <p className="mt-3 text-[11px] font-mono text-center text-gray-500">
            Fair queue rate limiting active for system stability.
          </p>
        </div>
      </div>
    </div>
  );
}



