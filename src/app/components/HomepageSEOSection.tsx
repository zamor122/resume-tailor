"use client";

import Link from "next/link";
import { FREE_RESUME_LIMIT, FREE_AUDIT_LIMIT } from "@/app/config/pricing";

/**
 * Below-the-fold SEO content section for the homepage.
 * Provides indexable text for search engines without cluttering the main tool UI.
 */
export default function HomepageSEOSection() {
  return (
    <section
      id="about-resume-tailoring"
      className="py-12 md:py-16 border-t-2 border-[#1C2028] mt-12 md:mt-16"
    >
      <div className="max-w-3xl mx-auto px-4 space-y-10 text-gray-800 dark:text-gray-300">
        <div className="p-6 rounded-2xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028]">
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-4 uppercase">
            Why You Need to Tailor Your Resume for Every Job
          </h2>
          <p className="font-mono text-xs sm:text-sm leading-relaxed mb-4">
            Most job seekers send the same resume to dozens of openings. But recruiters and applicant tracking systems (ATS) look for specific keywords and phrases from each job description. A generic resume rarely makes it past the initial screen. Tailoring your resume for each role—emphasizing relevant skills, matching the language of the posting, and highlighting the right achievements—dramatically increases your chances of landing an interview.
          </p>
          <p className="font-mono text-xs sm:text-sm leading-relaxed">
            Our free AI resume tailor acts as both a <strong>job description matcher</strong> and an <strong>ATS resume checker</strong>. It analyzes the job posting, identifies what recruiters are looking for, and rewrites your experience to align—without keyword stuffing or robotic phrasing. You get a resume that passes ATS filters while still sounding like you.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028]">
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-4 uppercase">
            How AI Resume Tailoring Works
          </h2>
          <p className="font-mono text-xs sm:text-sm leading-relaxed mb-4">
            AI resume tailoring uses natural language processing to understand both your resume and the job description. The tool identifies overlapping skills, missing keywords, and opportunities to reframe your experience. It then rewrites your bullet points to emphasize relevance while preserving your voice. Unlike generic AI resume builders that produce stiff, repetitive text, our resume optimizer focuses on natural phrasing and variation.
          </p>
          <p className="font-mono text-xs sm:text-sm leading-relaxed">
            You paste your resume and the job posting, click one button, and receive a tailored version with a relevancy score. No manual editing required. It&apos;s the fastest way to create job-specific resumes without spending hours on each application.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-[#FAF7F0] dark:bg-[#161B22] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028]">
          <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-4 uppercase">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-1.5 text-sm sm:text-base">
                How does AI resume tailoring work?
              </h3>
              <p className="font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                You provide your resume and the job description. Our AI analyzes both, identifies key requirements and keywords, and rewrites your experience to match—while keeping your voice and avoiding robotic language. The result is a tailored resume optimized for that specific role.
              </p>
            </div>
            <div>
              <h3 className="font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-1.5 text-sm sm:text-base">
                Is this free?
              </h3>
              <p className="font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Yes. You can try it right now with no login — paste your resume and the job posting for 1 free preview to see your score and the keywords you are missing.{" "}
                {FREE_RESUME_LIMIT > 0
                  ? `Create a free account (Google or email, no credit card) to save it and get your first ${FREE_RESUME_LIMIT} tailored ${FREE_RESUME_LIMIT === 1 ? "resume" : "resumes"} free.`
                  : `Create a free account (Google or email, no credit card) to save your progress and get up to ${FREE_AUDIT_LIMIT} free ATS audits & bullet previews.`}
                {" "}After that, access is a one-time pass starting at $9, and nothing auto-renews.
              </p>
            </div>
            <div>
              <h3 className="font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-1.5 text-sm sm:text-base">
                Does this work with ATS systems?
              </h3>
              <p className="font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                Yes. The output is formatted for applicant tracking systems and includes relevant keywords from the job description. We avoid the robotic keyword stuffing that screams &quot;AI wrote this&quot;—so your resume passes ATS filters while still reading naturally to recruiters.
              </p>
            </div>
            <div>
              <h3 className="font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-1.5 text-sm sm:text-base">
                Will it make my resume sound like every other AI resume?
              </h3>
              <p className="font-mono text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                No. We&apos;re built to avoid the telltale AI resume: no &quot;leveraged&quot; and &quot;synergized&quot; every other word, no perfectly uniform bullet structures. The result reads like a real person wrote it—because we optimize for natural phrasing and your voice, not just keyword density.
              </p>
            </div>
          </div>
          <p className="mt-6 pt-4 border-t border-[#1C2028]/20">
            <Link
              href="/faq"
              className="text-[#FF5722] hover:underline font-mono font-bold text-xs sm:text-sm"
            >
              View all FAQs →
            </Link>
          </p>
        </div>

        <div className="pt-6 text-center">
          <Link
            href="/#tailorResume"
            className="neo-btn inline-block px-8 py-3.5 bg-[#FF5722] hover:bg-[#F4511E] text-white font-mono font-bold text-sm rounded-xl border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] transition-all"
          >
            ⚡ TRY THE FREE RESUME OPTIMIZER
          </Link>
        </div>
      </div>
    </section>
  );
}
