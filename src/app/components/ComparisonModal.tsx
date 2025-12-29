"use client";

import { useEffect } from "react";
import ComparisonView from "./ComparisonView";
import { analytics } from "../services/analytics";

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  original: string;
  tailored: string;
  fontSize?: "small" | "medium" | "large";
}

export default function ComparisonModal({
  isOpen,
  onClose,
  original,
  tailored,
  fontSize = "medium",
}: ComparisonModalProps) {
  // Track modal open/close
  useEffect(() => {
    if (isOpen && original && tailored) {
      analytics.trackEvent(analytics.events.COMPARISON_VIEW_OPENED, {
        type: 'modal',
        timestamp: new Date().toISOString(),
      });
    }
  }, [isOpen, original, tailored]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fadeIn" />
      
      {/* Modal Content */}
      <div 
        className="relative w-full max-w-7xl h-full max-h-[90vh] glass-strong rounded-2xl border border-white/20 shadow-2xl flex flex-col animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold gradient-text-cyber">Resume Comparison</h2>
            <p className="text-sm text-gray-400 mt-1">Compare your original and tailored resume</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-lg glass hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Close comparison"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 min-h-0 p-6 overflow-hidden">
          <ComparisonView
            original={original}
            tailored={tailored}
            viewMode="split"
            showLineNumbers={true}
            fontSize={fontSize}
          />
        </div>
      </div>
    </div>
  );
}

