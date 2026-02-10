"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { useState, useEffect } from "react";
import { hasActiveAccess } from "@/app/utils/accessManager";
import TierSelectionModal from "./TierSelectionModal";

interface PaymentGateProps {
  children: React.ReactNode;
  resumeId?: string;
  onUnlock?: () => void;
}

export default function PaymentGate({
  children,
  resumeId,
  onUnlock,
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

  if (hasAccess) {
    // User has paid access, render children normally
    return <>{children}</>;
  }

  // User doesn't have access, show blurred content with layered overlay cards
  return (
    <>
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        {/* Semi-transparent backdrop layer */}
        <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm rounded-xl z-10"></div>
        {/* Card with text and button */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none p-4">
          <div className="pointer-events-auto w-full max-w-lg">
            <div className="rounded-2xl bg-gray-900/95 backdrop-blur-md border border-blue-500/40 shadow-2xl p-8 text-center space-y-4 w-full">
              <div className="text-4xl">🔒</div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white whitespace-normal break-words">Unlock Access</h3>
                <p className="text-gray-300 text-sm md:text-base whitespace-normal break-words">
                  Purchase time-based access to view and download all your resumes.
                </p>
              </div>
              <button
                onClick={handleUnlock}
                className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition-all whitespace-normal break-words shadow-lg"
              >
                Choose Access Plan
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

