import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ROLE_PAGES, getRoleBySlug } from "@/app/keywords/data/roles";
import { FAQStructuredData } from "@/app/components/StructuredData";

interface Props {
  params: Promise<{ role: string }>;
}

export async function generateStaticParams() {
  return ROLE_PAGES.map((role) => ({
    role: role.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role: roleSlug } = await params;
  const role = getRoleBySlug(roleSlug);
  if (!role) return {};

  return {
    title: `${role.title} Resume Keywords & ATS Guide (2026)`,
    description: `Discover the top ATS keywords, required technical skills, and high-impact action verbs to tailor your ${role.title} resume for top employers.`,
    keywords: [
      `${role.title.toLowerCase()} resume keywords`,
      `${role.title.toLowerCase()} ats skills`,
      `how to tailor resume for ${role.title.toLowerCase()}`,
      `${role.title.toLowerCase()} resume bullet points`,
    ],
    alternates: {
      canonical: `https://airesumetailor.com/keywords/${role.slug}`,
    },
  };
}

export default async function RoleKeywordPage({ params }: Props) {
  const { role: roleSlug } = await params;
  const role = getRoleBySlug(roleSlug);

  if (!role) {
    notFound();
  }

  const faqItems = [
    {
      q: `What are the most important ATS keywords for a ${role.title}?`,
      a: `The most critical keywords include ${role.keywords.slice(0, 5).join(", ")}, along with domain-specific metrics and tools.`,
    },
    {
      q: `How should I format bullet points on a ${role.title} resume?`,
      a: `Use the Google XYZ format: start with a strong action verb (e.g. ${role.actionVerbs.slice(0, 3).join(", ")}), describe the context and tools used, and quantify the measurable outcome.`,
    },
    {
      q: `Can I tailor my resume for a ${role.title} role for free?`,
      a: `Yes, you can use our free AI Resume Tailor to scan your resume, extract keyword gaps against any ${role.title} job posting, and generate tailored bullets in under 4 seconds.`,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-12">
      <FAQStructuredData items={faqItems} />

      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
        <Link href="/" className="hover:text-cyan-600 dark:hover:text-cyan-400">Home</Link>
        <span>/</span>
        <Link href="/keywords" className="hover:text-cyan-600 dark:hover:text-cyan-400">Keywords</Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-200 font-medium">{role.title}</span>
      </nav>

      {/* Hero */}
      <div className="space-y-4">
        <span className="px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold uppercase tracking-wider">
          {role.category}
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          Top {role.title} Resume Keywords & ATS Guide (2026)
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
          {role.description}
        </p>
      </div>

      {/* Interactive Tailor CTA Banner */}
      <div className="rounded-2xl border border-cyan-200/80 dark:border-cyan-900/60 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Tailor Your Resume for a {role.title} Role
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Our AI Agent will automatically weave in top {role.title} keywords while preserving your authentic work history.
          </p>
        </div>
        <Link
          href={`/?jobTitle=${encodeURIComponent(role.title)}`}
          className="whitespace-nowrap px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl shadow-md transition-all transform hover:scale-[1.02]"
        >
          Tailor Resume for Free →
        </Link>
      </div>

      {/* Top Keywords Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Critical ATS Hard Skills & Keywords
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {role.keywords.map((kw, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
              <span>{kw}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Action Verbs */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          High-Impact Action Verbs
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Avoid starting bullets with passive phrases like &quot;Responsible for&quot;. Use these strong action verbs instead:
        </p>
        <div className="flex flex-wrap gap-2">
          {role.actionVerbs.map((verb, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs sm:text-sm font-mono font-medium border border-gray-200 dark:border-gray-700"
            >
              {verb}
            </span>
          ))}
        </div>
      </div>

      {/* High-Scoring Bullet Example */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Example High-Scoring Experience Bullet
        </h2>
        <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
            Google XYZ Format (High ATS Relevancy)
          </div>
          <p className="text-sm md:text-base text-gray-800 dark:text-gray-200 italic">
            &quot;{role.sampleBullet}&quot;
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="border-t border-gray-200 dark:border-gray-800 pt-10 space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 space-y-1.5"
            >
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm md:text-base">
                {item.q}
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
