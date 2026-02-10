"use client";

import { useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "./AuthModal";
import { TIME_BASED_TIERS, NON_SUBSCRIPTION_MESSAGE } from "@/app/config/pricing";

const XIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface TierSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier?: (tier: "2D" | "7D" | "30D") => void;
  resumeId?: string;
}

export default function TierSelectionModal({
  isOpen,
  onClose,
  onSelectTier,
  resumeId,
}: TierSelectionModalProps) {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSelectTier = async (tier: "2D" | "7D" | "30D") => {
    if (!user?.email) {
      setShowAuthModal(true);
      return;
    }
    if (!session?.access_token) {
      setError("Session expired. Please sign in again.");
      return;
    }

    setLoading(tier);
    setError(null);

    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tier,
          resumeId: resumeId || "",
          userId: user.id,
          email: user.email,
          accessToken: session.access_token,
          returnUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }

    onSelectTier?.(tier);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-800 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Choose Access Plan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <XIcon size={24} />
          </button>
        </div>

        <p className="text-gray-300 text-sm mb-6">{NON_SUBSCRIPTION_MESSAGE}</p>

        {!user && (
          <div className="mb-6 p-4 rounded-lg bg-blue-500/20 border border-blue-500/40">
            <p className="text-white text-sm mb-3">Sign in to purchase access.</p>
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-2 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Sign In / Create Account
            </button>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {TIME_BASED_TIERS.map((tier) => (
            <button
              key={tier.tier}
              onClick={() => handleSelectTier(tier.tier)}
              disabled={!!loading}
              className={`w-full py-3 px-4 rounded-lg border text-left transition-all flex justify-between items-center ${
                tier.popular
                  ? "border-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                  : "border-gray-700 bg-gray-800/50 hover:bg-gray-800"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div>
                <span className="font-semibold text-white">{tier.label}</span>
                <span className="text-gray-400 text-sm block">{tier.description}</span>
              </div>
              <span className="font-bold text-white">${tier.price.toFixed(2)}</span>
            </button>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4">{error}</p>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
        title="Sign in to purchase access"
        description="Create an account or sign in to unlock your tailored resumes."
      />
    </div>
  );
}
