"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getTierConfig } from "@/app/config/pricing";
import { getAccessInfo } from "@/app/utils/accessManager";
import { useGamification } from "@/app/contexts/GamificationContext";
import TailorBot from "@/app/components/neo/TailorBot";

function SuccessPageInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);
  const [tier, setTier] = useState<string | null>(null);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessActivated, setAccessActivated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const xpAwardedRef = useRef(false);

  const { playSfx, awardXp, pokeMascot } = useGamification();

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      playSfx("alert");
      return;
    }

    const verify = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stripe/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to verify payment");
        }

        if (data.paid) {
          setPaid(true);
          playSfx("success");

          if (!xpAwardedRef.current) {
            xpAwardedRef.current = true;
            awardXp(100, "Access Pass Activated!", `activated_pass_${sessionId}`);
          }

          const meta = data.metadata || {};
          const tierCode = meta.tier as "2D" | "7D" | "30D" | undefined;
          const rid = meta.resumeId as string | undefined;
          const uid = meta.userId as string | undefined;

          if (uid && typeof uid === "string" && uid.trim()) {
            setUserId(uid.trim());
          }
          if (tierCode) {
            setTier(tierCode);
            const tierConfig = getTierConfig(tierCode);
            if (tierConfig) {
              const exp = new Date();
              exp.setDate(exp.getDate() + tierConfig.durationDays);
              setExpiresAt(
                exp.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })
              );
            }
          }
          if (rid && typeof rid === "string" && rid.trim()) {
            setResumeId(rid.trim());
          }
        } else {
          setPaid(false);
          setError("Payment was not completed");
          playSfx("alert");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify payment");
        setPaid(false);
        playSfx("alert");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [sessionId, playSfx, awardXp]);

  // Poll for access activation (webhook may lag slightly behind)
  useEffect(() => {
    if (!paid || !userId) return;

    const checkAccess = async () => {
      const info = await getAccessInfo(userId);
      if (info?.hasAccess && !info.isExpired) {
        setAccessActivated(true);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    checkAccess();
    pollRef.current = setInterval(checkAccess, 2000);

    const maxPoll = setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setAccessActivated((prev) => (prev === null ? false : prev));
    }, 15000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(maxPoll);
    };
  }, [paid, userId]);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-2xl p-8 max-w-md w-full text-center">
          <div className="mb-4 flex justify-center">
            <TailorBot state="scanning" size={120} onPoke={pokeMascot} showPokeTag />
          </div>
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5722] animate-ping" />
            <span className="neo-tag bg-[#1C2028] text-white text-[11px] px-2.5 py-0.5 font-mono uppercase tracking-wider">
              TRANSACTION PROTOCOL
            </span>
          </div>
          <h1 className="text-xl font-mono font-bold text-[#1C2028] uppercase tracking-wide">
            Verifying Your Payment
          </h1>
          <p className="mt-2 text-xs font-mono text-gray-600 leading-relaxed">
            Contacting Stripe secure server & establishing database privileges...
          </p>
        </div>
      </div>
    );
  }

  if (error || !paid) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="neo-box bg-[#FEE2E2] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-2xl p-8 max-w-md w-full text-center text-[#1C2028]">
          <div className="mb-4 flex justify-center">
            <TailorBot state="idle" size={110} onPoke={pokeMascot} showPokeTag />
          </div>
          <span className="neo-tag bg-[#EF4444] text-white text-[11px] px-2.5 py-0.5 font-mono uppercase tracking-wider">
            TRANSACTION INCOMPLETE
          </span>
          <h1 className="mt-3 text-xl font-mono font-bold text-[#1C2028] uppercase">
            Payment Issue Detected
          </h1>
          <p className="mt-3 text-xs font-mono text-gray-700 leading-relaxed bg-white/70 border border-[#1C2028] rounded-lg p-3">
            {error || "Your payment could not be confirmed. If you were charged, please contact support and your access will be granted instantly."}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/"
              onClick={() => playSfx("click")}
              className="neo-btn bg-[#1C2028] text-white hover:bg-[#2D333F] py-3 px-6 text-xs font-mono uppercase tracking-wider text-center"
            >
              Return to Studio
            </Link>
            <Link
              href="/pricing"
              onClick={() => playSfx("click")}
              className="neo-btn bg-white text-[#1C2028] hover:bg-[#F4F1EA] py-2 px-4 text-xs font-mono uppercase tracking-wider text-center"
            >
              Back to Pricing Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tierConfig = tier ? getTierConfig(tier as "2D" | "7D" | "30D") : null;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:py-16">
      <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-2xl p-6 sm:p-10 max-w-lg w-full text-center text-[#1C2028]">
        {/* Animated Celebrating Mascot */}
        <div className="mb-4 flex flex-col items-center justify-center">
          <TailorBot state="celebrating" size={130} onPoke={pokeMascot} showPokeTag />
          <div className="mt-2 inline-block bg-[#1C2028] text-[#FAF7F0] text-[10px] font-mono px-3 py-1 rounded-full border border-white/20 shadow-xs">
            &ldquo;ALL SYSTEMS UNLOCKED. LET&apos;S WIN THAT INTERVIEW!&rdquo;
          </div>
        </div>

        {/* Verification Status Badge */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="neo-tag bg-[#10B981] text-white text-[11px] px-3 py-1 font-mono uppercase tracking-wider inline-flex items-center gap-1.5 shadow-[2px_2px_0px_#1C2028]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            PAYMENT CONFIRMED
          </span>
          <span className="neo-tag bg-[#F59E0B] text-[#1C2028] text-[11px] px-2.5 py-1 font-mono uppercase font-bold shadow-[2px_2px_0px_#1C2028]">
            +100 XP GAINED
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-mono font-bold text-[#1C2028] uppercase tracking-tight mt-3">
          All-Access Pass Activated
        </h1>
        <p className="mt-2 text-xs font-mono text-gray-600 leading-relaxed">
          Your payment was processed successfully. Every service we offer — unlimited Resume Tailor, Futureproof AI Experience Builder, interview scripts, and PDF exports — is now unlocked for your full access period.
        </p>

        {/* Real-time Access Status */}
        <div className="mt-4 p-3 rounded-xl border-2 border-[#1C2028] bg-[#F4F1EA] text-left">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-[#1C2028] uppercase">
              Account Privileges
            </span>
            {accessActivated === true ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#059669]">
                <span>●</span> ACTIVE &amp; VERIFIED
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-[#D97706]">
                <span className="animate-spin text-xs">⟳</span> SYNCING PERMISSIONS...
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] font-mono text-gray-600">
            {accessActivated === true
              ? "Full PDF downloads, keyword breakdown, and authenticity audits are ready."
              : "Granting database access rights. If this takes more than 10 seconds, refresh."}
          </p>
        </div>

        {/* Tier Details Card */}
        {tierConfig && (
          <div className="mt-4 p-4 rounded-xl neo-box-sm bg-white text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-[#1C2028]">
                {tierConfig.label}
              </span>
              <span className="neo-tag bg-[#1C2028] text-white text-[10px] px-2 py-0.5 font-mono">
                {tierConfig.durationLabel}
              </span>
            </div>
            {expiresAt && (
              <p className="text-xs font-mono text-gray-600">
                Full unlimited access active through{" "}
                <span className="font-bold text-[#1C2028]">{expiresAt}</span>
              </p>
            )}
          </div>
        )}

        {/* Also Unlocked: Futureproof Discovery Card */}
        <div className="mt-4 p-4 rounded-xl bg-[#FFF4EF] border-2 border-[#1C2028] text-left space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FF5722]">
              ★ ALSO INCLUDED IN YOUR PASS
            </span>
          </div>
          <p className="text-sm font-sans font-semibold text-[#1C2028]">
            Futureproof AI Experience Builder + 30-Sec Interview Scripts
          </p>
          <p className="text-xs font-sans text-[#374151] leading-relaxed">
            Want to add real, industry-standard AI tools directly into your work history? Your pass
            already unlocks Futureproof in full.
          </p>
          <Link
            href="/futureproof"
            onClick={() => playSfx("click")}
            className="inline-block font-mono text-xs font-bold text-[#FF5722] hover:underline pt-0.5"
          >
            Open Futureproof AI Builder →
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {resumeId ? (
            <Link
              href={`/resume/${resumeId}`}
              onClick={() => playSfx("click")}
              className="neo-btn bg-[#FF5722] text-white hover:bg-[#E64A19] block w-full py-3.5 px-6 rounded-xl font-mono text-sm uppercase tracking-wider text-center shadow-[4px_4px_0px_#1C2028] transition-all"
            >
              View Your Tailored Resume ➔
            </Link>
          ) : (
            <Link
              href="/profile"
              onClick={() => playSfx("click")}
              className="neo-btn bg-[#FF5722] text-white hover:bg-[#E64A19] block w-full py-3.5 px-6 rounded-xl font-mono text-sm uppercase tracking-wider text-center shadow-[4px_4px_0px_#1C2028] transition-all"
            >
              View Your Resumes Dashboard ➔
            </Link>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/"
              onClick={() => playSfx("click")}
              className="neo-btn bg-white text-[#1C2028] hover:bg-[#F4F1EA] py-2.5 px-3 rounded-lg font-mono text-xs uppercase tracking-wider text-center shadow-[2px_2px_0px_#1C2028] transition-colors"
            >
              Tailor New Resume
            </Link>
            <Link
              href="/profile"
              onClick={() => playSfx("click")}
              className="neo-btn bg-white text-[#1C2028] hover:bg-[#F4F1EA] py-2.5 px-3 rounded-lg font-mono text-xs uppercase tracking-wider text-center shadow-[2px_2px_0px_#1C2028] transition-colors"
            >
              Profile &amp; XP Hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// `useSearchParams()` opts a route out of static prerendering unless it is wrapped
// in a Suspense boundary.
export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
          <div className="neo-box bg-[#FAF7F0] border-2 border-[#1C2028] shadow-[8px_8px_0px_#1C2028] rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-10 h-10 border-3 border-[#FF5722] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-mono uppercase tracking-wider text-gray-700">
              Initializing Payment Verification...
            </p>
          </div>
        </div>
      }
    >
      <SuccessPageInner />
    </Suspense>
  );
}
