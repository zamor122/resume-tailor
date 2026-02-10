"use client";

import { useState } from "react";
import TrustBadges from "./TrustBadges";

interface PaywallOverlayProps {
  improvementsCount: number;
  onUnlock: () => void;
}

export default function PaywallOverlay({ improvementsCount, onUnlock }: PaywallOverlayProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleUnlock = async () => {
    setIsLoading(true);
    try {
      await onUnlock();
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="sticky top-4 z-10 my-6 p-8 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">🔒</span>
            <h3 className="text-2xl font-bold text-white">
              Unlock Your Complete Tailored Resume
            </h3>
          </div>
          
          <p className="text-base text-gray-300 mb-4">
            You&apos;ve seen the changes. Now get your complete, optimized resume ready to download.
          </p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Complete tailored resume with all optimizations</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Downloadable PDF ready for applications</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Unlimited edits during your access period</span>
            </div>
          </div>
          
          <div className="mb-3">
            <TrustBadges />
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <button
            onClick={handleUnlock}
            disabled={isLoading}
            className="px-10 py-5 rounded-lg font-bold text-white text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Processing...
              </span>
            ) : (
              "Choose Access Plan"
            )}
          </button>
          
          <p className="text-xs text-gray-500 text-center mt-3">
            Starting at $4.95 for 2 days. Not a subscription.
          </p>
        </div>
      </div>
    </div>
  );
}

