"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "./AuthModal";
import { TIME_BASED_TIERS, NON_SUBSCRIPTION_MESSAGE } from "@/app/config/pricing";
import { getAccessInfo, formatRemainingTime } from "@/app/utils/accessManager";
import { getStoredUtmParams } from "@/app/utils/utm";
import { useGamification } from "@/app/contexts/GamificationContext";

const XIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface TierSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier?: (tier: "2D" | "7D" | "30D") => void;
  onAlreadyHasAccess?: () => void;
  resumeId?: string;
}

export default function TierSelectionModal({
  isOpen,
  onClose,
  onSelectTier,
  onAlreadyHasAccess,
  resumeId,
}: TierSelectionModalProps) {
  const { user, session } = useAuth();
  const { playSfx } = useGamification();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [activePass, setActivePass] = useState<{
    tierLabel: string | null;
    expiresAt: Date | null;
  } | null>(null);

  // Immediately check whether the signed-in user already has an active pass
  // (including right after they sign in via AuthModal inside this paywall).
  useEffect(() => {
    if (!isOpen || !user?.id) {
      setActivePass(null);
      return;
    }
    let cancelled = false;
    setCheckingAccess(true);
    getAccessInfo(user.id)
      .then((info) => {
        if (cancelled) return;
        if (info?.hasAccess && !info.isExpired) {
          setActivePass({
            tierLabel: info.tierLabel,
            expiresAt: info.expiresAt,
          });
        } else {
          setActivePass(null);
        }
      })
      .catch(() => {
        if (!cancelled) setActivePass(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, user?.id]);

  const handleSelectTier = async (tier: "2D" | "7D" | "30D") => {
    playSfx("click");
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
      // Double-check active pass right before creating a Stripe checkout link
      const existingAccess = await getAccessInfo(user.id);
      if (existingAccess?.hasAccess && !existingAccess.isExpired) {
        setActivePass({
          tierLabel: existingAccess.tierLabel,
          expiresAt: existingAccess.expiresAt,
        });
        setLoading(null);
        return;
      }

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
          utm: getStoredUtmParams(),
        }),
      });

      const data = await res.json();

      if (res.status === 409 && data?.alreadyHasAccess) {
        setActivePass({
          tierLabel: data.tierLabel || "Active Pass",
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        });
        setLoading(null);
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      playSfx("alert");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(null);
    }

    onSelectTier?.(tier);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-modal-title"
    >
      <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[6px_6px_0px_#1C2028] rounded-xl p-6 max-w-md w-full text-[#1C2028]">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <span className="neo-tag bg-[#FF5722] text-white text-xs px-2.5 py-0.5 font-mono font-bold uppercase">
              ALL-ACCESS PASS
            </span>
            <h2 id="tier-modal-title" className="text-lg font-mono font-bold text-[#1C2028]">
              Choose All-Access Period
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              playSfx("boop");
              onClose();
            }}
            className="p-2 rounded-sm border border-[#1C2028] bg-white hover:bg-[#F4F1EA] text-[#1C2028] transition-colors"
            aria-label="Close modal"
          >
            <XIcon size={18} />
          </button>
        </div>

        <p className="text-[#374151] text-sm font-sans mb-3 leading-relaxed">
          {NON_SUBSCRIPTION_MESSAGE}
        </p>

        <div className="mb-4 p-3 rounded-lg bg-[#ECFDF5] border border-[#10B981] text-sm font-sans text-[#065F46]">
          <strong>One All-Access Pass unlocks every service we offer:</strong> Unlimited{" "}
          <strong>Resume Tailor</strong>, full PDF/Markdown exports, and{" "}
          <strong>Futureproof AI Experience Builder</strong> + 30-sec interview scripts for your entire chosen period.
        </div>

        {!user && (
          <div className="mb-4 p-3.5 rounded-lg bg-[#F4F1EA] border-2 border-[#1C2028] space-y-2">
            <p className="text-sm font-sans font-semibold text-[#1C2028]">
              Sign in first to unlock full access.
            </p>
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                setShowAuthModal(true);
              }}
              className="neo-btn w-full py-2.5 px-3 font-mono font-bold text-sm uppercase bg-[#1C2028] text-white hover:bg-black border border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
            >
              Sign In / Create Account
            </button>
          </div>
        )}

        {checkingAccess ? (
          <div className="mb-5 p-4 rounded-lg bg-[#F4F1EA] border-2 border-[#1C2028] text-sm font-sans text-[#1C2028] text-center">
            Checking your account for an active pass...
          </div>
        ) : activePass ? (
          <div className="mb-5 p-4 rounded-xl bg-[#ECFDF5] border-2 border-[#10B981] space-y-3 text-[#065F46]">
            <div className="space-y-1">
              <p className="font-mono text-xs font-bold uppercase tracking-wider">
                ✓ ACTIVE PASS FOUND — NO PAYMENT NEEDED
              </p>
              <p className="text-sm font-sans font-semibold text-[#1C2028]">
                Your account already has an active{" "}
                <strong>{activePass.tierLabel || "Access Pass"}</strong>
                {activePass.expiresAt
                  ? ` (${formatRemainingTime(activePass.expiresAt)})`
                  : ""}
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playSfx("click");
                onAlreadyHasAccess?.();
                onClose();
              }}
              className="neo-btn w-full py-3 px-4 font-mono font-bold text-sm uppercase bg-[#10B981] hover:bg-[#059669] text-white border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
            >
              Continue With Your Active Pass →
            </button>
          </div>
        ) : (
        <div className="space-y-3 mb-5">
          {TIME_BASED_TIERS.map((tier) => (
            <button
              key={tier.tier}
              type="button"
              onClick={() => handleSelectTier(tier.tier)}
              disabled={!!loading}
              className={`neo-btn w-full p-4 rounded-lg border-2 border-[#1C2028] text-left transition-all flex justify-between items-center gap-3 ${
                tier.popular
                  ? "bg-[#FF5722] text-white shadow-[3px_3px_0px_#1C2028] hover:bg-[#E64A19]"
                  : "bg-white text-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4F1EA]"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base">{tier.label}</span>
                  {tier.popular && (
                    <span className="bg-black/25 text-white text-[11px] px-2 py-0.5 rounded-xs font-mono font-bold">
                      POPULAR
                    </span>
                  )}
                </div>
                <span className={`text-sm block font-sans mt-0.5 ${tier.popular ? "text-white/95" : "text-[#374151]"}`}>
                  {tier.description}
                </span>
              </div>
              <span className="font-mono font-extrabold text-base">
                ${tier.price.toFixed(2)}
              </span>
            </button>
          ))}
        </div>
        )}

        {error && (
          <p className="text-xs font-mono font-bold text-[#FF5722] mb-3 text-center">
            {error}
          </p>
        )}

        <button
          onClick={() => {
            playSfx("boop");
            onClose();
          }}
          className="w-full py-2 text-xs font-mono text-gray-500 hover:text-[#1C2028] transition-colors text-center"
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
