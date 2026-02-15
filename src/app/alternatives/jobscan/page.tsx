import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Free Alternative to Jobscan - AI Resume Tailor",
  description:
    "Looking for a free Jobscan alternative? AI Resume Tailor offers free resume optimization with job description matching and ATS-friendly output. Your first 3 tailored resumes are free.",
  keywords: [
    "free alternative to Jobscan",
    "Jobscan free alternative",
    "Jobscan alternative",
    "free resume scanner",
    "resume job match",
  ],
};

export default function JobscanAlternativePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Free Alternative to Jobscan: AI Resume Tailor
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        If you&apos;re looking for a <strong>free alternative to Jobscan</strong>, AI Resume Tailor gives you resume optimization and job description matching without the paywall. Paste your resume and the job posting—get a tailored version that matches what recruiters and ATS systems look for.
      </p>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            What Makes AI Resume Tailor a Great Jobscan Alternative?
          </h2>
          <p className="leading-relaxed mb-4">
            Jobscan is a popular resume scanner that compares your resume to job descriptions. AI Resume Tailor does that and more: it doesn&apos;t just score your match—it <em>rewrites</em> your resume to improve the match while keeping your voice. You get an ATS-optimized resume that sounds human, not robotic.
          </p>
          <p className="leading-relaxed">
            Your first 3 tailored resumes are completely free. No credit card, no trial that expires. After that, you can purchase time-based access for unlimited tailoring. It&apos;s a simpler, more affordable option if you want a <strong>Jobscan free alternative</strong> that actually improves your resume, not just analyzes it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Key Features
          </h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Job description matcher with relevancy scoring</li>
            <li>ATS-friendly output without keyword stuffing</li>
            <li>Human-sounding AI (no robotic or generic phrasing)</li>
            <li>First 3 tailored resumes free</li>
            <li>PDF and Markdown download</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Try It Free
          </h2>
          <p className="leading-relaxed mb-6">
            Sign in with Google or email to get started. No credit card required. Your first 3 tailored resumes are yours to keep.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl transition-all"
          >
            Start Tailoring Your Resume
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
