"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";
import AuthModal from "@/app/components/AuthModal";
import {
  FREE_RESUME_LIMIT,
  TIME_BASED_TIERS,
  NON_SUBSCRIPTION_MESSAGE,
} from "@/app/config/pricing";

const VALUE_PROPS = [
  {
    title: "Impact-First AI",
    description:
      "Our AI extracts real metrics and achievements—not generic buzzwords. Get bullet points that quantify your impact (e.g., \"Increased deployment speed by 20%\") instead of hollow keyword stuffing.",
    icon: "📊",
  },
  {
    title: "Technical Depth",
    description:
      "Built for engineers. Structured skills by Languages, Frameworks, and Cloud. Clean formatting for GitHub links, project URLs, and tech stacks that recruiters actually scan.",
    icon: "⚡",
  },
  {
    title: "Tailor & Go",
    description:
      "No bloated CRM or endless bullet libraries. Paste your resume, paste the job—get a tailored version in seconds. Minimal workflow, maximum speed.",
    icon: "🚀",
  },
  {
    title: "Transparent Pricing",
    description:
      "One-time payment for access. No weekly subscriptions that add up. Pay for 2 days, a week, or a month—use it all. Perfect when you're actively job searching.",
    icon: "✓",
  },
];

const FEATURES = [
  "Human-sounding output (no robotic AI tone)",
  "Real-time relevancy scoring",
  "ATS-optimized formatting",
  "PDF & Markdown download",
  "Technical impact extraction",
  "No keyword stuffing",
  "One-time payment—no subscription",
];

export default function PricingPage() {
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
          resumeId: "",
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
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="container mx-auto px-4 relative">
          <h1 className="text-4xl md:text-5xl font-bold text-center mb-6">
            <span className="gradient-text-cyber">Simple, Transparent Pricing</span>
          </h1>
          <p className="text-xl text-gray-500 dark:text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Get job-ready resumes without the bloat. Start free—no credit card required.
          </p>

          {/* Value Props Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {VALUE_PROPS.map((prop) => (
              <div
                key={prop.title}
                className="glass rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300"
              >
                <span className="text-3xl mb-3 block">{prop.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{prop.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{prop.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Free Plan - Prominent */}
            <div className="lg:col-span-1 glass rounded-2xl p-8 border-2 border-emerald-500/40 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500/20 px-4 py-1 rounded-bl-lg text-emerald-400 text-sm font-semibold">
                Start Here
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Free</h2>
              <p className="text-4xl font-bold text-emerald-400 mb-1">$0</p>
              <p className="text-gray-400 text-sm mb-6">Forever free to try</p>

              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <p className="text-emerald-300 font-semibold text-lg">
                  {FREE_RESUME_LIMIT} Free AI Resume Tailors
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                  Full access to view & download each one. No credit card.
                </p>
              </div>

              <ul className="space-y-3 mb-8 text-gray-600 dark:text-gray-300 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  {FREE_RESUME_LIMIT} tailored resumes included
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  PDF & Markdown download
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Relevancy scoring
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  Human-sounding output
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  ATS-optimized formatting
                </li>
              </ul>

              <Link
                href="/"
                className="block w-full py-3 px-4 rounded-xl font-semibold text-center bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-500/70 transition-all"
              >
                Get Started Free
              </Link>
            </div>

            {/* Paid Tiers */}
            {TIME_BASED_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className={`glass rounded-2xl p-8 relative ${
                  tier.popular
                    ? "border-2 border-cyan-500/50 ring-2 ring-cyan-500/20 scale-[1.02]"
                    : "border border-gray-700/50"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                    Most Popular
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{tier.label}</h2>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">${tier.price.toFixed(2)}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">{tier.description}</p>

                <ul className="space-y-3 mb-8 text-gray-600 dark:text-gray-300 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500 dark:text-cyan-400">✓</span>
                    Unlimited AI resume tailors
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500 dark:text-cyan-400">✓</span>
                    Download all resumes
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500 dark:text-cyan-400">✓</span>
                    Full access to all features
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500 dark:text-cyan-400">✓</span>
                    One-time payment
                  </li>
                </ul>

                <button
                  onClick={() => handleSelectTier(tier.tier)}
                  disabled={!!loading}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                    tier.popular
                      ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 hover:shadow-lg hover:shadow-cyan-500/25"
                      : "bg-gray-700/50 text-white hover:bg-gray-700 border border-gray-600"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.tier ? "Processing…" : "Get Access"}
                </button>
              </div>
            ))}
          </div>

          {/* Non-subscription note */}
          <p className="text-center text-gray-600 dark:text-gray-500 text-sm mt-8 max-w-xl mx-auto">
            {NON_SUBSCRIPTION_MESSAGE}
          </p>

          {error && (
            <p className="text-center text-red-400 text-sm mt-4">{error}</p>
          )}

          {!user && (
            <div className="text-center mt-6">
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-cyan-400 hover:text-cyan-300 underline text-sm"
              >
                Sign in to purchase access
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Feature List */}
      <section className="py-16 border-t border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Everything You Need to Land Interviews
          </h2>
          <div className="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto">
            {FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-gray-600 dark:text-gray-300"
              >
                <span className="text-cyan-500 dark:text-cyan-400">✓</span>
                {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Try Your First Tailor Free
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            Paste your resume and a job description. Get a tailored version in seconds.
            Your first {FREE_RESUME_LIMIT} are on us—no credit card required.
          </p>
          <Link
            href="/"
            className="inline-block px-8 py-4 rounded-xl font-semibold bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 transition-all hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/25"
          >
            Start Tailoring Now
          </Link>
        </div>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
        title="Sign in to get started"
        description="Create an account to unlock your 3 free resume tailors and purchase access when you need more."
      />
    </div>
  );
}
