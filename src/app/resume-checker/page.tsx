import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { FAQStructuredData } from "@/app/components/StructuredData";

export const metadata: Metadata = {
  title: "Free ATS Resume Checker & Scanner (Instant 2026 Score)",
  description:
    "Check your resume against Applicant Tracking Systems (ATS) for free. Get instant ATS compatibility score, formatting analysis, missing keyword detection, and action verb strength.",
  keywords: [
    "free ats resume checker",
    "ats resume scanner",
    "score my resume free",
    "ats resume test",
    "resume keyword scanner",
    "resume ats score online",
    "free resume review",
  ],
  alternates: {
    canonical: "https://airesumetailor.com/resume-checker",
  },
};

const FAQ_ITEMS = [
  {
    q: "What is an ATS Resume Checker?",
    a: "An ATS (Applicant Tracking System) Resume Checker scans your resume using the exact parsing algorithms that corporate ATS software (Workday, Greenhouse, Lever, Taleo) uses to filter applicants. It checks section formatting, header hierarchy, keyword density, and contact information readability.",
  },
  {
    q: "Is this ATS resume scan completely free?",
    a: "Yes, our ATS resume scanner is 100% free with no login or credit card required. You can scan your resume, see your baseline score, and identify formatting gaps immediately.",
  },
  {
    q: "What is a good ATS resume score?",
    a: "A score of 80% or higher is considered strong for most automated filters. Scores below 65% often fail initial keyword and formatting thresholds, preventing recruiters from ever seeing your application.",
  },
  {
    q: "How do I fix ATS errors on my resume?",
    a: "Use standard section headers (Experience, Education, Skills), avoid columns or complex tables, lead bullets with strong active verbs, and tailor your bullet points with critical keywords from the job posting.",
  },
];

export default function ResumeCheckerPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12">
      <FAQStructuredData items={FAQ_ITEMS} />

      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold uppercase tracking-wider">
          Free ATS Diagnostic Tool
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Free ATS Resume Checker & Score Scanner
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Over 75% of resumes are discarded by Applicant Tracking Systems before a human recruiter reads them. Check your ATS score and fix formatting gaps in seconds.
        </p>
      </div>

      {/* Primary Tool Call-to-Action Card */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 shadow-xl text-center space-y-6">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white text-2xl mx-auto shadow-md">
            🎯
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Scan & Optimize Your Resume
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Paste your resume or upload your PDF to get an instant ATS diagnostic score, keyword gap analysis, and tailored bullet point revisions.
          </p>
        </div>

        <div>
          <Link
            href="/"
            className="inline-block px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Launch Free Resume Tailor & ATS Scanner →
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400 pt-2">
          <span>✓ 100% Free to start</span>
          <span>✓ Instant Relevancy Score</span>
          <span>✓ No credit card required</span>
        </div>
      </div>

      {/* Feature Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 space-y-2">
          <div className="text-2xl">⚡</div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Keyword Density Scan</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Identifies essential hard skills, tech stacks, and industry terms missing from your work experience.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 space-y-2">
          <div className="text-2xl">📐</div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">ATS Layout & Header Test</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Ensures your contact info, dates, and experience sections parse cleanly without table or multi-column errors.
          </p>
        </div>

        <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/40 dark:bg-gray-900/40 space-y-2">
          <div className="text-2xl">🔥</div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Impact & Metrics Check</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            Flags passive responsibility language and helps convert bullets into Google XYZ impact statements.
          </p>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-10 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 space-y-1.5"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                {item.q}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
