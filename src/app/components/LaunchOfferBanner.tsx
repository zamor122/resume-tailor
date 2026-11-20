"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import NeoBadge from "@/app/components/neo/NeoBadge";
import { playAudioSfx } from "@/app/utils/audioSfx";

export interface LaunchOfferBannerProps {
  userCreatedAt?: string | null;
  resumeCount?: number;
  hasActiveAccess?: boolean;
  onClaim?: () => void;
  className?: string;
}

export default function LaunchOfferBanner({
  userCreatedAt,
  resumeCount = 0,
  hasActiveAccess = false,
  onClaim,
  className = "",
}: LaunchOfferBannerProps) {
  const [dismissed, setDismissed] = useState(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    // 1. If user already has paid access, don't show
    if (hasActiveAccess) {
      setDismissed(true);
      return;
    }

    // 2. Check localStorage dismissal
    const storedDismiss = typeof window !== "undefined" ? localStorage.getItem("dismissed_launch_offer_v1") : null;
    if (storedDismiss) {
      setDismissed(true);
      return;
    }

    // 3. Determine if candidate is within 24 hours of registration
    if (!userCreatedAt) {
      setDismissed(true);
      return;
    }

    const createdTime = new Date(userCreatedAt).getTime();
    const expiryTime = createdTime + 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (now >= expiryTime) {
      setDismissed(true);
      return;
    }

    // Candidate qualifies!
    setDismissed(false);

    const updateTimer = () => {
      const remainingMs = expiryTime - Date.now();
      if (remainingMs <= 0) {
        setDismissed(true);
        return;
      }
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setTimeLeft(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [userCreatedAt, hasActiveAccess, resumeCount]);

  if (dismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem("dismissed_launch_offer_v1", "true");
    } catch {}
    setDismissed(true);
  };

  const handleClaim = () => {
    playAudioSfx("success");
    if (onClaim) {
      onClaim();
    }
  };

  return (
    <div
      role="banner"
      aria-label="Launch Pass Offer"
      className={`bg-[#FFFBEB] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] p-3 sm:p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[#1C2028] ${className}`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <NeoBadge variant="yellow" className="font-extrabold uppercase tracking-wider text-[11px]">
          ⚡ 24H Launch Special
        </NeoBadge>
        <div className="text-xs sm:text-sm font-mono font-medium">
          Get <strong>48 Hours Unlimited Tailoring</strong> for <span className="bg-[#10B981] text-white px-1.5 py-0.5 font-bold rounded">$6</span>{" "}
          <span className="line-through text-gray-400">$9</span> (Save 33%)
        </div>
        {timeLeft && (
          <span className="text-xs font-mono font-bold bg-[#1C2028] text-[#F59E0B] px-2 py-0.5 rounded">
            ⏳ {timeLeft} left
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {onClaim ? (
          <button
            type="button"
            onClick={handleClaim}
            className="neo-btn bg-[#FF5722] hover:bg-[#E64A19] text-white px-3.5 py-1.5 text-xs font-mono font-bold rounded flex items-center gap-1.5"
          >
            Claim $6 Pass →
          </button>
        ) : (
          <Link
            href="/pricing"
            onClick={() => playAudioSfx("success")}
            className="neo-btn bg-[#FF5722] hover:bg-[#E64A19] text-white px-3.5 py-1.5 text-xs font-mono font-bold rounded flex items-center gap-1.5 inline-block"
          >
            Claim $6 Pass →
          </Link>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-black font-mono text-sm px-1.5 py-0.5"
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
