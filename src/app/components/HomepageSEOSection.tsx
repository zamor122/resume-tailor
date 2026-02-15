"use client";

import Link from "next/link";

/**
 * Below-the-fold SEO content section for the homepage.
 * Provides indexable text for search engines without cluttering the main tool UI.
 */
export default function HomepageSEOSection() {
  return (
    <section
      id="about-resume-tailoring"
      className="py-12 md:py-16 border-t border-gray-200 dark:border-gray-700 mt-12 md:mt-16"
      data-parallax="0.03"
    >
      <div className="max-w-3xl mx-auto px-4 space-y-10 text-gray-700 dark:text-gray-300">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Why You Need to Tailor Your Resume for Every Job
          </h2>
          <p className="leading-relaxed mb-4">
            Most job seekers send the same resume to dozens of openings. But recruiters and applicant tracking systems (ATS) look for specific keywords and phrases from each job description. A generic resume rarely makes it past the initial screen. Tailoring your resume for each role—emphasizing relevant skills, matching the language of the posting, and highlighting the right achievements—dramatically increases your chances of landing an interview.
          </p>
          <p className="leading-relaxed">
            Our free AI resume tailor acts as both a <strong>job description matcher</strong> and an <strong>ATS resume checker</strong>. It analyzes the job posting, identifies what recruiters are looking for, and rewrites your experience to align—without keyword stuffing or robotic phrasing. You get a resume that passes ATS filters while still sounding like you.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            How AI Resume Tailoring Works
          </h2>
          <p className="leading-relaxed mb-4">
            AI resume tailoring uses natural language processing to understand both your resume and the job description. The tool identifies overlapping skills, missing keywords, and opportunities to reframe your experience. It then rewrites your bullet points to emphasize relevance while preserving your voice. Unlike generic AI resume builders that produce stiff, repetitive text, our resume optimizer focuses on natural phrasing and variation.
          </p>
          <p className="leading-relaxed">
            You paste your resume and the job posting, click one button, and receive a tailored version with a relevancy score. No manual editing required. It&apos;s the fastest way to create job-specific resumes without spending hours on each application.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                How does AI resume tailoring work?
              </h3>
              <p className="leading-relaxed text-sm">
                You provide your resume and the job description. Our AI analyzes both, identifies key requirements and keywords, and rewrites your experience to match—while keeping your voice and avoiding robotic language. The result is a tailored resume optimized for that specific role.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Is this free?
              </h3>
              <p className="leading-relaxed text-sm">
                Yes. Your first 3 tailored resumes are completely free. Sign in with Google or email to get started—no credit card required. After that, you can purchase time-based access for unlimited tailoring.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Does this work with ATS systems?
              </h3>
              <p className="leading-relaxed text-sm">
                Yes. The output is formatted for applicant tracking systems and includes relevant keywords from the job description. We avoid the robotic keyword stuffing that screams &quot;AI wrote this&quot;—so your resume passes ATS filters while still reading naturally to recruiters.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Will it make my resume sound like every other AI resume?
              </h3>
              <p className="leading-relaxed text-sm">
                No. We&apos;re built to avoid the telltale AI resume: no &quot;leveraged&quot; and &quot;synergized&quot; every other word, no perfectly uniform bullet structures. The result reads like a real person wrote it—because we optimize for natural phrasing and your voice, not just keyword density.
              </p>
            </div>
          </div>
          <p className="mt-6">
            <Link
              href="/faq"
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              View all FAQs →
            </Link>
          </p>
        </div>

        <div className="pt-6 text-center">
          <Link
            href="/#tailorResume"
            className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl transition-all"
          >
            Try the Free Resume Optimizer
          </Link>
        </div>
      </div>
    </section>
  );
}
