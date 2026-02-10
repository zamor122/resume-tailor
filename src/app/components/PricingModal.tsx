"use client";

import { useState } from "react";
// Removed pricing tier imports as they're no longer needed with per-resume payment model

// Simple X icon component
const XIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier: (tier: string) => void;
  resumeId?: string;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [isProcessing] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Pricing Modal Deprecated</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <XIcon size={24} />
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-gray-300 mb-6">
            This component is deprecated with the per-resume payment model. 
            Please use the individual resume unlock flow instead.
          </p>
          
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={isProcessing}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}