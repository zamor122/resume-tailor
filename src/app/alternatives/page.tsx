import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/components/Breadcrumbs";
import BlogCtaBanner from "@/app/components/BlogCtaBanner";

export const metadata: Metadata = {
  title: "Free Alternatives to Popular Resume Tools - AI Resume Tailor",
  description:
    "Compare AI Resume Tailor with Jobscan, Teal, Rezi, Kickresume, Resume.io and Zety. Tailor your existing resume to any job posting, with your first 3 tailored resumes free.",
  alternates: {
    canonical: "https://airesumetailor.com/alternatives",
  },
};

const COMPETITORS = [
  { slug: "jobscan", name: "Jobscan" },
  { slug: "teal", name: "Teal" },
  { slug: "rezi", name: "Rezi" },
  { slug: "kickresume", name: "Kickresume" },
  { slug: "resume-io", name: "Resume.io" },
  { slug: "zety", name: "Zety" },
];

export default function AlternativesIndexPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1C2028] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <Breadcrumbs
          items={[{ name: "Home", href: "/" }, { name: "Alternatives" }]}
        />

        <div className="neo-box bg-[#F4F1EA] p-6 sm:p-8 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold uppercase tracking-wider">
              COMPARISON AUDIT
            </span>
            <span className="text-xs font-mono text-gray-500">
              ZERO SUBSCRIPTION TRAPS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-mono text-[#1C2028]">
            Free Alternatives to Popular Resume Tools
          </h1>
          <p className="text-sm sm:text-base text-gray-700 font-sans leading-relaxed">
            Unlike recurring subscription traps that bill you \$29–\$49/month, AI Resume Tailor gives you 3 free tailors upfront and affordable one-time passes from \$9 with zero auto-renewals.
          </p>
        </div>

        <div className="neo-box bg-white p-6 border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl space-y-4">
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-gray-500">
            Compare Head-to-Head
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COMPETITORS.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/alternatives/${c.slug}`}
                  className="neo-btn block p-3 bg-[#FAF7F0] hover:bg-white text-xs font-mono font-bold text-[#1C2028] border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  ⚡ Free alternative to {c.name} →
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <BlogCtaBanner
          title="Try AI Resume Tailor Free"
          subtitle="No credit card, no recurring monthly fees. Get 3 free ATS tailors right now."
          buttonText="⚡ START FREE TAILOR"
        />

        <div className="pt-4">
          <Link
            href="/"
            className="text-xs font-mono font-bold text-[#1C2028] hover:text-[#FF5722] transition-colors"
          >
            ← Back to AI Resume Tailor Home
          </Link>
        </div>
      </div>
    </div>
  );
}
