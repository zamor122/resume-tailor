import React from 'react';
import Link from 'next/link';
import { FAQStructuredData } from '@/app/components/StructuredData';

export const metadata = {
  title: "Frequently Asked Questions - AI Resume Tailor",
  description: "Answers about human-sounding resume tailoring, what's free, what's paid, and how we avoid robotic AI tone.",
};

const FAQ_ITEMS = [
  {
    section: "Product Overview",
    qa: [
      {
        q: "What is AI Resume Tailor?",
        a: "It's a tool that rewrites your resume to match a specific job posting. You paste your resume and the job description, and we tailor your experience so it speaks directly to what that employer is looking for. The big difference: the output sounds like you wrote it—not like a robot or generic AI. No keyword stuffing, no buzzword soup, no \"synergistic\" filler.",
      },
      {
        q: "Who is it for?",
        a: "Anyone applying to jobs. Whether you're early in your career, switching industries, or a seasoned pro, it saves you time tailoring each application so you don't have to manually rewrite for every role.",
      },
    ],
  },
  {
    section: "Access & Getting Started",
    qa: [
      {
        q: "How do I get started?",
        a: "Sign in with a free account (Google or email), then paste your resume and the job description. Hit the button and you're done. Your first 3 tailored resumes are free to view and download.",
      },
      {
        q: "Do I need an account?",
        a: "Yes. You need to sign in to tailor your resume. That lets us save your tailored resumes and give you access to your first 3 for free.",
      },
    ],
  },
  {
    section: "What's Free",
    qa: [
      {
        q: "What do I get for free?",
        a: "Your first 3 tailored resumes are completely free. You get full access to view each one and download it as PDF or Markdown. No credit card required.",
      },
      {
        q: "How do the free resumes work?",
        a: "It's the first 3 resumes you create (by creation date). Each one gets full access—view and download. After that, you can purchase time-based access to unlock more.",
      },
    ],
  },
  {
    section: "What's Paid",
    qa: [
      {
        q: "What do I get when I pay?",
        a: "Time-based access—unlimited tailoring during your chosen period. You can view and download all your resumes, no matter how many you create. Options: 2 days ($4.95), 1 week ($10), or 1 month ($20).",
      },
      {
        q: "Is it a subscription?",
        a: "No. It's a one-time purchase for a time period. When your access expires, you can purchase again if you need more. No recurring charges.",
      },
    ],
  },
  {
    section: "What It Does",
    qa: [
      {
        q: "Does it sound human or like AI?",
        a: "Human. This is the core of what we do. We're built to avoid the telltale AI resume: no \"leveraged\" and \"synergized\" every other word, no perfectly uniform bullet structures, no stiff corporate-speak. The result reads like a real person wrote it—because we optimize for natural phrasing and your voice, not just keyword density.",
      },
      {
        q: "What does it actually do?",
        a: "It rewrites your resume to emphasize the skills and achievements that match the job posting—while keeping your voice. It doesn't invent experience. It doesn't sprinkle buzzwords. It weaves in what recruiters look for in a way that sounds like you, not a template.",
      },
      {
        q: "Does it work with ATS systems?",
        a: "Yes. The output is clean and formatted for applicant tracking systems, but we avoid the robotic keyword stuffing that screams \"AI wrote this.\" You get a match score so you can see how well your tailored resume aligns with the job—without sacrificing readability.",
      },
    ],
  },
  {
    section: "What It Doesn't Do",
    qa: [
      {
        q: "Will it make my resume sound like every other AI resume?",
        a: "No. That's exactly what we avoid. Generic AI resumes have a recognizable pattern: same verbs, same structure, same corporate jargon. We're tuned to keep variation, natural phrasing, and your voice. You get job-relevant content without the \"AI slop\" feel.",
      },
      {
        q: "What is it not designed for?",
        a: "It doesn't write your resume from scratch—you need to bring your own. It doesn't guarantee job offers—it improves your resume's relevance. It doesn't edit your resume forever—you get a tailored version to use for that application.",
      },
      {
        q: "Does it make up experience?",
        a: "No. It works with what you provide. It rephrases and emphasizes your real experience to fit the job. It won't add fake roles or skills.",
      },
      {
        q: "Who sees my resume?",
        a: "It's processed by our AI to generate your tailored version. We don't share your resume or job descriptions with third parties. See our privacy policy and terms for details.",
      },
    ],
  },
];

export default function FAQPage() {
  const allFaqItems = FAQ_ITEMS.flatMap((section) => section.qa);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <FAQStructuredData items={allFaqItems} />
      <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-10">
        Everything you need to know about the product, what&apos;s free, what&apos;s paid, and how it works.
      </p>
      
      <div className="space-y-12">
        {FAQ_ITEMS.map(({ section, qa }) => (
          <section key={section}>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">{section}</h2>
            <div className="space-y-6">
              {qa.map(({ q, a }) => (
                <div
                  key={q}
                  className="bg-white dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">{q}</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Related</h2>
        <ul className="space-y-2">
          <li>
            <Link href="/resume-optimizer" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Free Resume Optimizer & ATS Checker
            </Link>
          </li>
          <li>
            <Link href="/alternatives/jobscan" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Free Alternative to Jobscan
            </Link>
          </li>
          <li>
            <Link href="/alternatives/kickresume" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Free Alternative to Kickresume
            </Link>
          </li>
          <li>
            <Link href="/alternatives/zety" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Free Alternative to Zety
            </Link>
          </li>
          <li>
            <Link href="/alternatives/resume-io" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Free Alternative to Resume.io
            </Link>
          </li>
        </ul>
      </div>
      
      <div className="mt-16 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">Ready to try it?</p>
        <Link
          href="/"
          className="inline-block bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:scale-[1.02]"
        >
          Tailor Your Resume
        </Link>
      </div>
    </div>
  );
}
