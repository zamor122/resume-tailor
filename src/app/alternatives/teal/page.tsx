import React from "react";
import Link from "next/link";
import AlternativeComparisonTable from "@/app/components/AlternativeComparisonTable";

export const metadata = {
  title: "Free Alternative to Teal - AI Resume Tailor",
  description:
    "Looking for a free Teal resume builder alternative? AI Resume Tailor offers free ATS audits and sample bullet previews—plus one-time passes from $9 with zero monthly subscriptions.",
  keywords: [
    "free alternative to Teal",
    "Teal resume builder alternative",
    "Teal alternative",
    "free resume builder",
    "resume optimizer free",
  ],
  alternates: {
    canonical: "https://airesumetailor.com/alternatives/teal",
  },
};

export default function TealAlternativePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Free Alternative to Teal: AI Resume Tailor
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        If you&apos;re looking for a <strong>free alternative to Teal</strong>, AI Resume Tailor focuses on one thing: tailoring your existing resume to each job posting. No complex dashboards, no job tracking—just paste your resume and the job description, and get an optimized version that matches what recruiters want.
      </p>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        <AlternativeComparisonTable
          competitorName="Teal"
          competitorPrice="$29 / 30 days"
          competitorAutoRenews
          competitorFreeTier="Has a free tier"
        />

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Why Choose AI Resume Tailor Over Teal?
          </h2>
          <p className="leading-relaxed mb-4">
            Teal offers a full career platform with resume building, job tracking, and more. If you already have a resume and just need to tailor it for each application, AI Resume Tailor is a simpler <strong>Teal resume builder alternative</strong>. You don&apos;t need to rebuild your resume in a new format—paste what you have, add the job posting, and get a tailored version in seconds.
          </p>
          <p className="leading-relaxed">
            Start with free ATS audits and sample bullet previews—no subscription, no monthly fees. Whenever you want unlimited full bullet unlocks and clean PDF exports, grab a one-time pass starting at $9. It&apos;s ideal if you want a lightweight, <strong>free resume optimizer</strong> without the overhead of a full career platform.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Key Features
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Job description matcher with relevancy scoring</li>
            <li>Works with your existing resume (paste or upload PDF)</li>
            <li>Human-sounding output (no robotic AI tone)</li>
            <li>Free ATS audits, missing-keyword gap list &amp; sample bullet reveal</li>
            <li>One-time access passes from $9 with zero monthly fees</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Try It Free
          </h2>
          <p className="leading-relaxed mb-6">
            Paste your resume and job description to preview your ATS score and missing keywords—no credit card or monthly subscription required.
          </p>
          <Link
            href="/"
            className="neo-btn inline-block px-8 py-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-mono font-bold uppercase tracking-wider rounded-lg border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] transition-all"
          >
            ⚡ Start Tailoring Your Resume
          </Link>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link
          href="/"
          className="text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          ← Back to AI Resume Tailor
        </Link>
      </div>
    </div>
  );
}
