import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Free Alternative to Kickresume - AI Resume Tailor",
  description:
    "Looking for a free Kickresume alternative? AI Resume Tailor offers free resume optimization with job description matching. Your first 3 tailored resumes are free. No templates required.",
  keywords: [
    "free alternative to Kickresume",
    "Kickresume alternative",
    "Kickresume free alternative",
    "resume builder alternative",
    "resume optimizer free",
  ],
};

export default function KickresumeAlternativePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Free Alternative to Kickresume: AI Resume Tailor
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        If you&apos;re looking for a <strong>free alternative to Kickresume</strong>, AI Resume Tailor focuses on one thing: tailoring your existing resume to each job posting. No templates to fill out—paste your resume and the job description, and get an optimized version that matches what recruiters want.
      </p>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            What Makes AI Resume Tailor a Great Kickresume Alternative?
          </h2>
          <p className="leading-relaxed mb-4">
            Kickresume offers templates and a resume builder. If you already have a resume and need to tailor it for each application, AI Resume Tailor is a simpler <strong>Kickresume alternative</strong>. You don&apos;t rebuild from scratch—you paste what you have, add the job posting, and get a tailored version in seconds.
          </p>
          <p className="leading-relaxed">
            Your first 3 tailored resumes are free. No credit card, no subscription. After that, you can purchase time-based access when you need it. It&apos;s ideal if you want a <strong>free resume optimizer</strong> that works with your existing resume.
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
            <li>First 3 tailored resumes free</li>
            <li>PDF and Markdown download</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Try It Free
          </h2>
          <p className="leading-relaxed mb-6">
            Sign in with Google or email to get started. Your first 3 tailored resumes are free—no credit card required.
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
