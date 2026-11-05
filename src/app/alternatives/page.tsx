import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumbs from "@/app/components/Breadcrumbs";

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
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
      <Breadcrumbs
        items={[{ name: "Home", href: "/" }, { name: "Alternatives" }]}
      />

      <div className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
          Free Alternatives to Popular Resume Tools
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          AI Resume Tailor tailors your existing resume to a specific job
          posting. If you are comparing it with the tools below, each
          comparison page covers pricing, free offerings, and how the two
          approaches differ.
        </p>
      </div>

      <ul className="space-y-3">
        {COMPETITORS.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/alternatives/${c.slug}`}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              Free alternative to {c.name}
            </Link>
          </li>
        ))}
      </ul>

      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link href="/" className="text-cyan-600 dark:text-cyan-400 hover:underline">
          ← Back to AI Resume Tailor
        </Link>
      </div>
    </div>
  );
}
