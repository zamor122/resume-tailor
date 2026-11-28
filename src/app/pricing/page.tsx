"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";
import TailorBot from "@/app/components/neo/TailorBot";
import { useGamification } from "@/app/contexts/GamificationContext";
import {
  FREE_RESUME_LIMIT,
  FREE_AUDIT_LIMIT,
  TIME_BASED_TIERS,
  NON_SUBSCRIPTION_MESSAGE,
} from "@/app/config/pricing";
import { getAccessInfo, formatRemainingTime } from "@/app/utils/accessManager";
import { getStoredUtmParams } from "@/app/utils/utm";

const VALUE_PROPS = [
  {
    title: "Google X-Y-Z Formula",
    description:
      "Our AI extracts real metrics and achievements—not generic buzzwords. We rewrite bullets into 'Accomplished [X] as measured by [Y] by doing [Z]' to impress hiring managers.",
    icon: "📊",
  },
  {
    title: "Technical Depth",
    description:
      "Engineered for modern talent. Clean structuring for languages, cloud tools, frameworks, and portfolio links that both ATS scanners and recruiters parse instantly.",
    icon: "⚡",
  },
  {
    title: "Tailor & Go",
    description:
      "Zero bloated forms or subscription locks. Paste your resume, paste the target job, and walk away with an optimized draft in under 15 seconds.",
    icon: "🚀",
  },
  {
    title: "Zero Subscription Traps",
    description:
      "One-time payment for exact access. No sneaky weekly rebilling that drains your account. Pay once, use freely, and cancel nothing—it never auto-renews.",
    icon: "🛡️",
  },
];

const FEATURES = [
  "Human-sounding output (no robotic AI fluff)",
  "Real-time ATS keyword relevancy gauge",
  "ATS-optimized PDF & Markdown export",
  "Clear line-by-line rationale for every change",
  "Google X-Y-Z impact quantification",
  "Granular line-by-line diff approval",
  "Zero auto-renewals or subscription traps",
];

export default function PricingPage() {
  const { user, session } = useAuth();
  const { playSfx } = useGamification();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showWhyDetails, setShowWhyDetails] = useState(false);
  const [activePass, setActivePass] = useState<{
    tierLabel: string | null;
    expiresAt: Date | null;
  } | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setActivePass(null);
      return;
    }
    let cancelled = false;
    getAccessInfo(user.id)
      .then((info) => {
        if (cancelled) return;
        if (info?.hasAccess && !info.isExpired) {
          setActivePass({ tierLabel: info.tierLabel, expiresAt: info.expiresAt });
        } else {
          setActivePass(null);
        }
      })
      .catch(() => {
        if (!cancelled) setActivePass(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

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
      // Check active pass before sending user to Stripe Checkout
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
          resumeId: "",
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
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028]">
      {/* Calm Pricing Hero */}
      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4 max-w-6xl space-y-6">
          <div className="neo-box bg-[var(--design-surface)] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="neo-tag bg-[var(--design-accent)] text-[var(--design-accent-ink)] text-xs px-3 py-1 font-bold">
                  Honest Pricing
                </span>
                <span className="text-xs font-semibold text-[var(--design-ink-muted)]">
                  No hidden recurring fees
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[var(--design-ink)]">
                One-Time Access.{" "}
                <span className="text-[var(--design-success)]">Zero Traps.</span>
              </h1>
              <p className="text-sm sm:text-base text-[var(--design-ink-muted)] max-w-xl leading-relaxed">
                Start with {FREE_AUDIT_LIMIT} free ATS audits &amp; bullet previews. Paid passes never auto-renew.
              </p>

              {/* Compact Trust Strip + Optional Details Disclosure */}
              <div className="pt-1 flex flex-wrap items-center justify-center md:justify-start gap-2">
                {VALUE_PROPS.map((prop) => (
                  <span
                    key={prop.title}
                    className="px-3 py-1 rounded-full bg-[var(--design-surface-tint)] text-xs font-semibold text-[var(--design-ink)] border border-[var(--design-border-soft)]"
                  >
                    ✓ {prop.title}
                  </span>
                ))}
                <button
                  type="button"
                  aria-expanded={showWhyDetails}
                  onClick={() => setShowWhyDetails((v) => !v)}
                  className="px-3 py-1 rounded-full text-xs font-bold text-[var(--design-accent)] hover:underline"
                >
                  {showWhyDetails ? "Hide details ↑" : "Why job seekers switch ↓"}
                </button>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <TailorBot
                size={112}
                state="idle"
                onPoke={() => playSfx("boop")}
                showPokeTag={true}
              />
            </div>
          </div>

          {/* Optional Value Props Grid (Progressive Disclosure) */}
          {showWhyDetails && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {VALUE_PROPS.map((prop) => (
                <div
                  key={prop.title}
                  className="neo-box bg-[var(--design-surface)] p-5 space-y-2"
                >
                  <span className="text-2xl block" aria-hidden="true">{prop.icon}</span>
                  <h3 className="text-base font-bold text-[var(--design-ink)]">{prop.title}</h3>
                  <p className="text-[var(--design-ink-muted)] text-sm leading-relaxed">{prop.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Pricing Cards Hardware Rack */}
      <section className="py-6 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
          {activePass && (
            <div className="mb-8 neo-box bg-[#ECFDF5] border-2 border-[#10B981] shadow-[4px_4px_0px_#1C2028] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="font-mono text-xs font-bold uppercase tracking-wider text-[#065F46]">
                  ✓ ACTIVE PASS DETECTED — NO PURCHASE NEEDED
                </p>
                <p className="text-base font-sans font-semibold text-[#1C2028]">
                  You already have an active{" "}
                  <strong>{activePass.tierLabel || "Access Pass"}</strong>
                  {activePass.expiresAt
                    ? ` (${formatRemainingTime(activePass.expiresAt)})`
                    : ""}
                  . Both ATS Tailoring and Futureproof are unlocked!
                </p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link
                  href="/#tailorResume"
                  className="neo-btn bg-[#10B981] hover:bg-[#059669] text-white border-2 border-[#1C2028] px-4 py-2.5 font-mono text-xs font-bold uppercase"
                >
                  Open Tailor Console →
                </Link>
                <Link
                  href="/futureproof"
                  className="neo-btn bg-white hover:bg-[#FAF7F0] text-[#1C2028] border-2 border-[#1C2028] px-4 py-2.5 font-mono text-xs font-bold uppercase"
                >
                  Open Futureproof →
                </Link>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Free Plan - Chassis */}
            <div className="lg:col-span-1 neo-box bg-white p-6 sm:p-8 border-2 border-[#10B981] shadow-[4px_4px_0px_#1C2028] rounded-xl relative flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="neo-tag bg-[#10B981] text-white text-[10px] px-2 py-0.5 font-mono font-bold uppercase">
                    FOREVER FREE
                  </span>
                </div>
                <h2 className="text-2xl font-mono font-bold text-[#1C2028] mb-1">Starter</h2>
                <p className="text-4xl font-mono font-extrabold text-[#10B981] mb-1">$0</p>
                <p className="text-gray-500 font-mono text-xs mb-6">No credit card needed</p>

                <div className="mb-6 p-3.5 rounded-lg bg-[#FAF7F0] border-2 border-[#1C2028] space-y-1">
                  <p className="text-[#1C2028] font-mono font-bold text-sm">
                    {FREE_RESUME_LIMIT > 0 ? `${FREE_RESUME_LIMIT} Free AI Tailors` : `${FREE_AUDIT_LIMIT} Free ATS Audits`}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {FREE_RESUME_LIMIT > 0
                      ? "Full keyword audit, Google X-Y-Z rewrites, and PDF exports."
                      : "Full ATS match score, missing keyword gap, and sample bullet rewrites."}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 text-sm font-sans text-[#1C2028]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981] font-bold" aria-hidden="true">✓</span>
                    <span>
                      {FREE_RESUME_LIMIT > 0
                        ? `${FREE_RESUME_LIMIT} tailored resumes included`
                        : `${FREE_AUDIT_LIMIT} free ATS audits & diff previews`}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981] font-bold" aria-hidden="true">✓</span>
                    <span>
                      {FREE_RESUME_LIMIT > 0 ? "PDF & Markdown export" : "Sample rewritten bullets unlocked"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981] font-bold" aria-hidden="true">✓</span>
                    <span>Free Futureproof AI Experience preview</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#10B981] font-bold" aria-hidden="true">✓</span>
                    <span>Live ATS match scoring</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/#tailorResume"
                onClick={() => playSfx("click")}
                className="neo-btn block w-full py-3.5 px-4 text-center font-mono font-bold text-sm uppercase tracking-wider bg-white hover:bg-[#FAF7F0] text-[#1C2028] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px]"
              >
                Start Free Tailor
              </Link>
            </div>

            {/* Paid Tiers */}
            {TIME_BASED_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className={`neo-box p-6 sm:p-8 rounded-xl border-2 border-[#1C2028] flex flex-col justify-between relative ${
                  tier.popular
                    ? "bg-[#FAF7F0] shadow-[6px_6px_0px_#1C2028] scale-[1.02]"
                    : "bg-white shadow-[4px_4px_0px_#1C2028]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {tier.popular ? (
                      <span className="neo-tag bg-[#FF5722] text-white text-xs px-2.5 py-0.5 font-mono font-bold uppercase tracking-wider">
                        ★ MOST POPULAR
                      </span>
                    ) : (
                      <span className="neo-tag bg-[#FAF7F0] text-[#374151] text-xs px-2.5 py-0.5 font-mono font-bold uppercase">
                        PASS
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-mono font-bold text-[#1C2028] mb-1">{tier.label}</h2>
                  <div className="flex items-baseline gap-1.5 mb-1.5">
                    <span className="text-4xl font-mono font-extrabold text-[#1C2028]">
                      ${tier.price.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-[#4B5563] uppercase">one-time</span>
                  </div>
                  <p className="text-[#374151] font-sans text-sm mb-6 leading-relaxed">{tier.description}</p>

                  <ul className="space-y-3 mb-8 text-sm font-sans text-[#1C2028]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF5722] font-bold" aria-hidden="true">✓</span>
                      <span>Unlimited AI resume tailors &amp; PDF exports</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF5722] font-bold" aria-hidden="true">✓</span>
                      <span>
                        <strong>Futureproof AI Experience Builder</strong> + 30-sec interview scripts
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#FF5722] font-bold" aria-hidden="true">✓</span>
                      <span>All ATS keyword &amp; scoring tools unlocked</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#10B981] font-bold" aria-hidden="true">✓</span>
                      <span>One-time payment · Never recurs</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectTier(tier.tier)}
                  disabled={!!loading}
                  className={`neo-btn w-full py-3.5 px-4 font-mono font-bold text-sm uppercase tracking-wider border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px] ${
                    tier.popular
                      ? "bg-[#FF5722] text-white hover:bg-[#E64A19]"
                      : "bg-[#1C2028] text-white hover:bg-black"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.tier ? "CONNECTING TO STRIPE..." : `UNLOCK ${tier.label.toUpperCase()}`}
                </button>
              </div>
            ))}
          </div>

          {/* Non-subscription note */}
          <div className="neo-box bg-[#F4F1EA] p-5 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl text-center max-w-2xl mx-auto mt-10">
            <p className="text-sm font-sans font-medium text-[#1C2028] leading-relaxed">
              🛡️ {NON_SUBSCRIPTION_MESSAGE}
            </p>
          </div>

          {error && (
            <p className="text-center font-mono font-bold text-[#FF5722] text-sm mt-4">{error}</p>
          )}

          {!user && (
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  playSfx("click");
                  setShowAuthModal(true);
                }}
                className="text-xs font-mono font-bold text-[#FF5722] hover:underline"
              >
                Sign in to purchase access →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Feature List HUD */}
      <section className="py-12 border-t-2 border-[#1C2028] bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-center text-[#1C2028] mb-8">
            Engineered For Modern Career Applications
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="neo-tag bg-[#FAF7F0] border border-[#1C2028] px-3.5 py-1.5 text-xs font-mono font-bold text-gray-800 flex items-center gap-2"
              >
                <span className="text-[#10B981]">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
        title="Sign in to get started"
        description={
          FREE_RESUME_LIMIT > 0
            ? `Create an account to unlock your ${FREE_RESUME_LIMIT} free resume tailor and purchase access when you need more.`
            : `Create a free account to run up to ${FREE_AUDIT_LIMIT} ATS audits & previews, then unlock full downloads with any one-time pass.`
        }
      />
    </div>
  );
}
