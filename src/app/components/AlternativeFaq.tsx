import React from "react";
import { TIME_BASED_TIERS, FREE_RESUME_LIMIT } from "@/app/config/pricing";
import { FAQStructuredData } from "./StructuredData";

export interface AlternativeFaqProps {
  /** Competitor display name, e.g. "Jobscan". */
  competitorName: string;
  /** Their published price, verbatim and verified. Never invented. */
  competitorPrice: string;
  /** Whether their paid plan auto-renews. */
  competitorAutoRenews: boolean;
  /** Their free tier, as verified (or "Not verified" when we have no source). */
  competitorFreeTier: string;
}

/**
 * FAQPage JSON-LD + the visible FAQ block for the /alternatives/* pages.
 *
 * The same Q&As are rendered visibly and marked up — hidden-only FAQ markup is
 * cloaking. Answers are generated from the verified competitor facts already
 * passed to AlternativeComparisonTable, and every price on our side is derived
 * from TIME_BASED_TIERS so it can never drift from what Stripe charges.
 */
export default function AlternativeFaq({
  competitorName,
  competitorPrice,
  competitorAutoRenews,
  competitorFreeTier,
}: AlternativeFaqProps) {
  const entryPrice = Math.min(...TIME_BASED_TIERS.map((t) => t.price)).toFixed(2);

  // Only quote a competitor figure when the passed value actually contains one.
  // For resume.io and Zety we have no verified number, so we state none.
  const priceIsVerified = /\$\s?\d/.test(competitorPrice);
  const renewalNote = competitorAutoRenews
    ? " Their paid access auto-renews unless you cancel."
    : "";

  const costAnswer = priceIsVerified
    ? `As of our research, ${competitorName}'s paid plan is priced at ${competitorPrice}.${renewalNote} AI Resume Tailor starts at $${entryPrice} as a one-time payment with no subscription.`
    : `${competitorName}'s current pricing is not something we were able to verify from a primary source, so we do not quote a figure here.${renewalNote} AI Resume Tailor starts at $${entryPrice} as a one-time payment with no subscription.`;

  const items = [
    {
      q: `Is there a free ${competitorName} alternative?`,
      a: `Yes. AI Resume Tailor is a free ${competitorName} alternative for tailoring your existing resume to a specific job posting. Your first ${FREE_RESUME_LIMIT} tailored resumes are free, with no credit card required. Unlimited access after that starts at $${entryPrice} as a one-time payment.`,
    },
    {
      q: `How much does ${competitorName} cost?`,
      a: costAnswer,
    },
    {
      q: `Does ${competitorName} have a free trial or free tier?`,
      a: `Based on our research, ${competitorName}'s free offering is: ${competitorFreeTier}.${renewalNote} AI Resume Tailor gives you ${FREE_RESUME_LIMIT} tailored resumes free and never auto-renews.`,
    },
    {
      q: `What is the difference between ${competitorName} and AI Resume Tailor?`,
      a: `${competitorName} and AI Resume Tailor take different approaches. AI Resume Tailor focuses on one task: rewriting your existing resume so it matches the wording of a specific job posting, with ATS-friendly formatting and human-sounding output. Paste your resume and the job description and get a tailored version in seconds.`,
    },
  ];

  return (
    <section className="space-y-4">
      <FAQStructuredData items={items} />
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        {competitorName} vs AI Resume Tailor: Frequently Asked Questions
      </h2>
      <div className="space-y-4">
        {items.map((item, idx) => (
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
    </section>
  );
}
