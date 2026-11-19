"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";
import TailorBot from "@/app/components/neo/TailorBot";
import { useGamification } from "@/app/contexts/GamificationContext";
import {
  FREE_RESUME_LIMIT,
  TIME_BASED_TIERS,
  NON_SUBSCRIPTION_MESSAGE,
} from "@/app/config/pricing";
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
  "TailorBot MK-II guidance & audit rationale",
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
      {/* Hero Header HUD */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="neo-box bg-[#F4F1EA] p-6 sm:p-10 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold uppercase tracking-wider">
                  HONEST PRICING
                </span>
                <span className="text-xs font-mono text-gray-500">
                  NO HIDDEN RECURRING FEES
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-mono tracking-tight text-[#1C2028]">
                One-Time Access. <span className="bg-[#10B981] text-white px-2 py-0.5 neo-box-sm inline-block">Zero Traps.</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-700 font-sans max-w-xl leading-relaxed">
                Most resume builders quietly bill you \$39/month until you notice. We never auto-renew. Your first {FREE_RESUME_LIMIT} audits are 100% free forever, and paid passes are strictly one-time.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center">
              <TailorBot
                size={130}
                state="idle"
                onPoke={() => playSfx("boop")}
                showPokeTag={true}
              />
            </div>
          </div>

          {/* Value Props Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.title}
                className="neo-box bg-white p-6 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-2"
              >
                <span className="text-3xl block">{prop.icon}</span>
                <h3 className="text-base font-bold font-mono text-[#1C2028]">{prop.title}</h3>
                <p className="text-gray-600 font-sans text-xs sm:text-sm leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards Hardware Rack */}
      <section className="py-6 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">
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
                    {FREE_RESUME_LIMIT} Free AI Tailors
                  </p>
                  <p className="text-gray-600 text-xs">
                    Full keyword audit, Google X-Y-Z rewrites, and PDF exports.
                  </p>
                </div>

                <ul className="space-y-2.5 mb-8 text-xs font-mono text-gray-700">
                  <li className="flex items-center gap-2">
                    <span className="text-[#10B981] font-bold">✓</span>
                    {FREE_RESUME_LIMIT} tailored resumes included
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#10B981] font-bold">✓</span>
                    PDF & Markdown export
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#10B981] font-bold">✓</span>
                    Live ATS relevancy scoring
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#10B981] font-bold">✓</span>
                    Granular diff acceptance
                  </li>
                </ul>
              </div>

              <Link
                href="/#tailorResume"
                onClick={() => playSfx("click")}
                className="neo-btn block w-full py-3 px-4 text-center font-mono font-bold text-xs uppercase tracking-wider bg-white hover:bg-[#FAF7F0] text-[#1C2028] border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px]"
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
                      <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold uppercase tracking-wider">
                        ★ MOST POPULAR
                      </span>
                    ) : (
                      <span className="neo-tag bg-[#FAF7F0] text-gray-600 text-[10px] px-2 py-0.5 font-mono font-bold uppercase">
                        PASS
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-mono font-bold text-[#1C2028] mb-1">{tier.label}</h2>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-mono font-extrabold text-[#1C2028]">
                      ${tier.price.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-gray-500 uppercase">one-time</span>
                  </div>
                  <p className="text-gray-600 font-sans text-xs mb-6">{tier.description}</p>

                  <ul className="space-y-2.5 mb-8 text-xs font-mono text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-[#FF5722] font-bold">✓</span>
                      Unlimited AI resume tailors
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#FF5722] font-bold">✓</span>
                      Download unlimited PDF & Docs
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#FF5722] font-bold">✓</span>
                      All ATS algorithms unlocked
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-[#10B981] font-bold">✓</span>
                      One-time payment • Never recurs
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectTier(tier.tier)}
                  disabled={!!loading}
                  className={`neo-btn w-full py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-wider border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px] ${
                    tier.popular
                      ? "bg-[#FF5722] text-white hover:bg-[#E64A19]"
                      : "bg-[#1C2028] text-white hover:bg-black"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.tier ? "CONNECTING TO STRIPE..." : `⚡ UNLOCK ${tier.label.toUpperCase()}`}
                </button>
              </div>
            ))}
          </div>

          {/* Non-subscription note */}
          <div className="neo-box bg-[#F4F1EA] p-4 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] rounded-xl text-center max-w-xl mx-auto mt-10">
            <p className="text-xs font-mono font-bold text-gray-700">
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
        description={`Create an account to unlock your ${FREE_RESUME_LIMIT} free resume tailor and purchase access when you need more.`}
      />
    </div>
  );
}
