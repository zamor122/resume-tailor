"use client";

import { useState } from "react";

interface InfoTooltipProps {
  content: string;
  className?: string;
}

export default function InfoTooltip({ content, className = "" }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
        className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="More information"
      >
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div
          className="absolute z-50 w-64 p-3 mt-2 text-xs text-gray-300 bg-gray-900 border border-white/20 rounded-lg shadow-xl glass-strong"
          style={{ bottom: "100%", left: "50%", transform: "translateX(-50%)" }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 border-r border-b border-white/20 rotate-45"></div>
          {content}
        </div>
      )}
    </div>
  );
}

