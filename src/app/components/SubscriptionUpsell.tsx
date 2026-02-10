"use client";

import { useState } from "react";

interface SubscriptionUpsellProps {
  onSubscribe?: () => void;
}

export default function SubscriptionUpsell({ onSubscribe }: SubscriptionUpsellProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="my-8 p-6 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">
            Unlock Unlimited Resumes
          </h3>
          <p className="text-gray-300 mb-4">
            Get unlimited resume tailoring for just <span className="font-semibold text-white">$9/month</span>. 
            Perfect for active job seekers applying to multiple positions.
          </p>
          <ul className="space-y-2 mb-4 text-sm text-gray-400">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Unlimited resume tailoring
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Priority processing
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </li>
          </ul>
          <p className="text-xs text-gray-500">
            Easy cancellation. No hidden fees. Cancel anytime from your account.
          </p>
        </div>
        
        <button
          onClick={onSubscribe}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="px-6 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 shadow-lg"
        >
          Subscribe for $9/month
        </button>
      </div>
    </div>
  );
}





