"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useState, useEffect } from "react";
import { hasActiveAccess } from "@/app/utils/accessManager";
import TierSelectionModal from "./TierSelectionModal";

interface PaymentGateProps {
  children: React.ReactNode;
  resumeId?: string;
  onUnlock?: () => void;
  /** When true, skip overlay (e.g. first 3 free resumes) */
  isUnlocked?: boolean;
}

export default function PaymentGate({
  children,
  resumeId,
  onUnlock,
  isUnlocked = false,
}: PaymentGateProps) {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [showTierModal, setShowTierModal] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setCheckingAccess(false);
        return;
      }

      try {
        // Check for active time-based access
        const access = await hasActiveAccess(user.id);
        setHasAccess(access);
      } catch (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [user]);

  const handleUnlock = () => {
    setShowTierModal(true);
  };

  const handleTierSelect = (tier: '2D' | '7D' | '30D') => {
    // Tier selection is handled by TierSelectionModal
    // This callback is for future use if needed
  };

  if (authLoading || checkingAccess) {
    return (
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    );
  }

  if (hasAccess || isUnlocked) {
    // User has paid access or this resume is in first 3 free, render children normally
    return <>{children}</>;
  }

  // User doesn't have access, show blurred content with layered overlay cards
  return (
    <>
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        {/* Semi-transparent backdrop layer */}
        <div className="absolute inset-0 bg-[#1C2028]/60 backdrop-blur-xs rounded-xl z-10"></div>
        {/* Card with text and button */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none p-4">
          <div className="pointer-events-auto w-full max-w-md">
            <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-xl p-6 sm:p-8 text-center space-y-4 w-full text-[#1C2028]">
              <div className="inline-flex items-center gap-1.5 neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold uppercase">
                <span>🔒</span>
                <span>ALL-ACCESS PASS REQUIRED</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-mono font-extrabold text-[#1C2028]">
                  Unlock Access to Every Service
                </h3>
                <p className="text-gray-700 text-xs sm:text-sm font-mono leading-relaxed">
                  One All-Access Pass unlocks unlimited Resume Tailor, Futureproof AI Experience Builder, interview scripts, and PDF exports for your entire chosen period.
                </p>
              </div>
              <button
                onClick={handleUnlock}
                className="neo-btn w-full py-3 px-6 rounded-lg bg-[#FF5722] text-white hover:bg-[#E64A19] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] font-mono font-bold text-xs sm:text-sm uppercase tracking-wider transition-all"
              >
                CHOOSE ACCESS PLAN
              </button>
            </div>
          </div>
        </div>
      </div>
      <TierSelectionModal
        isOpen={showTierModal}
        onClose={() => setShowTierModal(false)}
        onSelectTier={handleTierSelect}
        resumeId={resumeId}
      />
    </>
  );
}

