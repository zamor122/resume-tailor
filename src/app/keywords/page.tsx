import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ROLE_PAGES } from "@/app/keywords/data/roles";

export const metadata: Metadata = {
  title: "Resume Keywords by Job Title & Industry (2026 ATS Guide)",
  description:
    "Comprehensive directory of top ATS keywords, critical hard skills, and high-scoring bullet point examples across 100+ professions and industries.",
  keywords: [
    "resume keywords by role",
    "ats keywords list",
    "job description keywords directory",
    "resume skills by job title",
  ],
  alternates: {
    canonical: "https://airesumetailor.com/keywords",
  },
};

export default function KeywordsIndexPage() {
  const categories = Array.from(new Set(ROLE_PAGES.map((r) => r.category)));

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-12">
      <div className="text-center space-y-4">
        <span className="px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold uppercase tracking-wider">
          ATS Skill Guides
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Resume Keywords & Skills by Job Title
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Select your target role below to see the exact technical keywords, ATS metrics, and action verbs recruiters look for.
        </p>
      </div>

      <div className="space-y-10">
        {categories.map((category) => {
          const roles = ROLE_PAGES.filter((r) => r.category === category);
          return (
            <div key={category} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {roles.map((role) => (
                  <Link
                    key={role.slug}
                    href={`/keywords/${role.slug}`}
                    className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 hover:border-cyan-500/60 hover:shadow-md transition-all group"
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400">
                      {role.title} →
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {role.keywords.slice(0, 4).join(", ")}...
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
