import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: "Frequently Asked Questions - AI Resume Tailor",
  description: "Understand what AI Resume Tailor is, who it helps, what you see before and after purchasing, and how your information is handled.",
};

export default function FAQPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Frequently Asked Questions</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-2xl font-semibold mb-4">What AI Resume Tailor Does</h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">A quick way to match your resume to a job</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Paste your resume and the job description, and the AI rewrites your resume so it clearly speaks to what that employer is asking for.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Keeps things clear and ATS-friendly</h3>
              <p className="text-gray-700 dark:text-gray-300">
                The tool highlights the skills and keywords employers expect, while keeping your wording clean and easy for applicant tracking systems to read.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Shows you how it improved your resume</h3>
              <p className="text-gray-700 dark:text-gray-300">
                You get a side-by-side look at the original and the tailored version so you can see what changed and why it is more relevant.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Who It Helps &amp; Why</h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">For anyone applying to jobs</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Whether you are early in your career, switching industries, or a seasoned professional, it saves you time tailoring each application.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Helps you speak the employer&apos;s language</h3>
              <p className="text-gray-700 dark:text-gray-300">
                The AI emphasizes the experiences, achievements, and keywords that match the job post so your resume feels specific, not generic.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Gives confidence before you apply</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Clear suggestions and a relevance check help you submit with confidence that your resume covers what hiring managers expect.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">What You See in Your Results</h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Instant preview</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>A tailored resume preview based on your job description.</li>
                <li>A relevance check that shows how well it matches the role.</li>
                <li>Highlighted keywords and skills the job posting cares about.</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">Clear action items</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Suggestions on phrasing achievements so they stand out.</li>
                <li>Areas to tighten or remove if they are not relevant to the role.</li>
                <li>Simple edits that keep formatting neat for ATS systems.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Before You Purchase vs. After</h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">What you see right away</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>A quick preview of how your resume changes for the role.</li>
                <li>A relevance check to show if the tailoring is on target.</li>
                <li>Key highlights so you know what the AI focused on.</li>
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">What unlocks after purchase</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>The full tailored resume ready to copy, download, or share.</li>
                <li>Complete suggestions and wording you can reuse for similar roles.</li>
                <li>Access for continued tailoring without re-entering payment each time during your access window.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Data &amp; Privacy</h2>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-medium mb-2">What we keep and what we do not</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>We do not store your resume or job description after tailoring; they are used in the moment to generate your results.</li>
                <li>We keep only what is needed to provide access you purchase (like payment confirmations and, if you share it, your email).</li>
                <li>We may track anonymous usage patterns to keep the service reliable, but not the contents of your resume.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-lg mb-4">Ready to improve your resume&apos;s relevancy score?</p>
        <Link href="/" className="inline-block bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          Tailor Your Resume Now
        </Link>
      </div>
    </div>
  );
} 