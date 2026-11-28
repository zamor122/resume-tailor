"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FREE_RESUME_LIMIT, FREE_AUDIT_LIMIT } from "@/app/config/pricing";

/**
 * Progressive-disclosure FAQ & guide section below the fold.
 * Shows only concise questions by default so the homepage stays calm and
 * scannable, while keeping full helpful explanations 1 tap away.
 */
export default function HomepageSEOSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const items = [
    {
      q: "Why tailor your resume for every job?",
      a: "Recruiters and applicant tracking systems (ATS) scan for the exact skills and language in each job posting. Tailoring highlights your most relevant achievements without keyword stuffing so you pass automated screens and read naturally to hiring managers.",
    },
    {
      q: "How does AI Resume Tailor work?",
      a: "Paste your resume and target job description. We identify missing keywords, reframe your real impact using Google's X-Y-Z structure, preserve your 1-page layout, and show side-by-side diffs so you approve every single line.",
    },
    {
      q: "Is it free to try?",
      a:
        FREE_RESUME_LIMIT > 0
          ? `Yes — start with no credit card for a free preview, then create a free account to get your first ${FREE_RESUME_LIMIT} tailored ${FREE_RESUME_LIMIT === 1 ? "resume" : "resumes"} free. After that, one-time All-Access Passes starting at $9 unlock every service we offer (Tailor + Futureproof AI).`
          : `Yes — try a free ATS match audit and bullet preview with no credit card, and unlock up to ${FREE_AUDIT_LIMIT} free audits with a free account. One-time All-Access Passes start at $9, unlock every service we offer (Tailor + Futureproof AI), and never auto-renew.`,
    },
    {
      q: "Will my resume sound robotic or like AI?",
      a: "No. We avoid generic clichés and keep your authentic voice. Every edit is transparent, concise (≤2 lines per bullet), and grounded in your real work history.",
    },
  ];

  return (
    <section
      id="about-resume-tailoring"
      className="py-10 md:py-12 border-t border-[var(--design-border-soft)] mt-10 md:mt-14"
    >
      <div className="max-w-3xl mx-auto px-4 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--design-ink)]">
              Common Questions
            </h2>
            <p className="text-sm text-[var(--design-ink-muted)] mt-1">
              Tap any topic to learn more — zero clutter until you need it.
            </p>
          </div>
          <Link
            href="/faq"
            className="text-sm font-bold text-[var(--design-accent)] hover:underline"
          >
            All FAQs →
          </Link>
        </div>

        <div className="neo-box bg-[var(--design-surface)] overflow-hidden divide-y divide-[var(--design-border-soft)]">
          {items.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[var(--design-surface-tint)]/50 transition-colors"
                >
                  <span className="text-sm sm:text-base font-bold text-[var(--design-ink)]">
                    {item.q}
                  </span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={`shrink-0 text-[var(--design-ink-muted)] transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-5 text-sm sm:text-[15px] leading-relaxed text-[var(--design-ink-muted)] max-w-[62ch]">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
