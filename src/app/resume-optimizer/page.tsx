import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Free Resume Optimizer & ATS Checker - AI Resume Tailor",
  description:
    "Free resume optimizer and ATS resume checker. Tailor your resume for any job posting with AI. Get a free ATS score, missing-keyword audit, and sample bullet preview—no subscription.",
  keywords: [
    "free resume optimizer",
    "ATS resume checker",
    "resume optimizer free",
    "free ATS checker",
    "resume optimization tool",
  ],
  alternates: {
    canonical: "https://airesumetailor.com/resume-optimizer",
  },
};

export default function ResumeOptimizerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Free Resume Optimizer & ATS Checker
      </h1>

      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
        Use our <strong>free resume optimizer</strong> to audit and tailor your resume for any job posting. It acts as both a <strong>job description matcher</strong> and an <strong>ATS resume checker</strong>—analyzing the posting, surfacing missing keywords, and showing before/after bullet improvements. Start with a free preview and sample rewrite before choosing a one-time pass.
      </p>

      <div className="space-y-8 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            What Is a Resume Optimizer?
          </h2>
          <p className="leading-relaxed mb-4">
            A resume optimizer improves your resume for a specific job. It looks at the job description, finds the skills and keywords recruiters and ATS systems care about, and rewrites your bullet points to emphasize relevance. Unlike a simple spell-check or formatting tool, a true <strong>resume optimizer</strong> changes the content to better match each role.
          </p>
          <p className="leading-relaxed">
            Our AI resume optimizer goes further: it keeps your voice. Many AI tools produce stiff, repetitive text that screams &quot;AI wrote this.&quot; We optimize for natural phrasing and variation so your tailored resume reads like you wrote it—just more targeted.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            How the ATS Resume Checker Works
          </h2>
          <p className="leading-relaxed mb-4">
            Applicant tracking systems (ATS) scan resumes for keywords and structure. Our tool acts as an <strong>ATS resume checker</strong> by comparing your resume to the job description and identifying gaps. Then it doesn&apos;t just tell you what&apos;s missing—it rewrites your resume to include relevant keywords and phrasing in a natural way.
          </p>
          <p className="leading-relaxed">
            You get a relevancy score so you can see how well your tailored resume matches the job. The output is formatted for ATS compatibility without the robotic keyword stuffing that some tools produce.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Try the Free Resume Optimizer
          </h2>
          <p className="leading-relaxed mb-6">
            Paste your resume and the job description to get an instant ATS keyword audit and sample bullet preview—no credit card or subscription required. Unlock unlimited full exports whenever you&apos;re ready with one-time passes starting at $9.
          </p>
          <Link
            href="/"
            className="neo-btn inline-block px-8 py-3.5 bg-[#FF5722] hover:bg-[#E64A19] text-white font-mono font-bold uppercase tracking-wider rounded-lg border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] transition-all"
          >
            ⚡ Optimize Your Resume Now
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
