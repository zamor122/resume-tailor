import React from "react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Alternative to Rezi AI Resume Builder (2026)",
  description:
    "Looking for a free alternative to Rezi? AI Resume Tailor offers fast ATS resume optimization with model-agnostic intelligence. Your first 3 tailored resumes are 100% free with no monthly subscription.",
  keywords: [
    "free alternative to rezi",
    "rezi alternative",
    "rezi ai resume free alternative",
    "rezi vs ai resume tailor",
    "free resume optimizer",
  ],
  alternates: {
    canonical: "https://airesumetailor.com/alternatives/rezi",
  },
};

export default function ReziAlternativePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Free Alternative to Rezi: AI Resume Tailor
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        If you&apos;re looking for a <strong>free alternative to Rezi</strong>, AI Resume Tailor gives you granular controlling levers over how much your resume changes—from minimal phrasing adjustments to complete experience overhauls that strictly preserve your authentic work history.
      </p>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Why Choose AI Resume Tailor Over Rezi?
          </h2>
          <p className="leading-relaxed mb-4">
            While Rezi charges up to $29/month or restricts free users with tight token and export limits, AI Resume Tailor gives you <strong>3 free complete tailors</strong> with zero monthly subscription traps.
          </p>
          <p className="leading-relaxed">
            Our LangGraph-powered agent runs in <strong>under 4 seconds</strong>, compares your resume against live job descriptions, weaves in missing ATS keywords, and provides quantifiable metrics customization.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Key Feature Comparison
          </h2>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden text-xs sm:text-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="p-3">Feature</th>
                  <th className="p-3 text-cyan-600 dark:text-cyan-400">AI Resume Tailor</th>
                  <th className="p-3 text-gray-500">Rezi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="p-3 font-medium">Free Access</td>
                  <td className="p-3 text-cyan-600 dark:text-cyan-400">3 Complete Tailors Free</td>
                  <td className="p-3 text-gray-500">Limited / Paywalled</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Transformation Levers</td>
                  <td className="p-3 text-cyan-600 dark:text-cyan-400">Minimal / Targeted / Overhaul</td>
                  <td className="p-3 text-gray-500">One-size-fits-all</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Processing Speed</td>
                  <td className="p-3 text-cyan-600 dark:text-cyan-400">&lt; 4 Seconds</td>
                  <td className="p-3 text-gray-500">15–30 Seconds</td>
                </tr>
                <tr>
                  <td className="p-3 font-medium">Subscription Required</td>
                  <td className="p-3 text-cyan-600 dark:text-cyan-400">No (Time-based or Free)</td>
                  <td className="p-3 text-gray-500">Yes ($29/mo)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Try It Free Today
          </h2>
          <p className="leading-relaxed mb-6">
            Paste your resume and any job description to get your tailored resume and ATS score in seconds.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg transition-all"
          >
            Start Tailoring Free →
          </Link>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">
          ← Back to AI Resume Tailor
        </Link>
      </div>
    </div>
  );
}
