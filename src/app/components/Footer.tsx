"use client";

import React from "react";
import Link from "next/link";
import TailorBot from "./neo/TailorBot";
import DesignSwitcher from "./DesignSwitcher";
import { useTheme } from "./ThemeProvider";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { design } = useTheme();
  const isPom = design === "pomegranate";

  return (
    <footer
      className={`w-full py-10 transition-colors ${
        isPom
          ? "bg-[#F6F1E4] border-t-[2px] border-[#3A0C22]/20 text-[#3A0C22]"
          : "bg-[#FFFDF8] border-t border-[#241F1A]/12 text-[#241F1A]"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-[var(--design-border-soft)]">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                isPom
                  ? "bg-[#EA375D] border-[2px] border-[#3A0C22] shadow-[0_3px_0_#3A0C22]"
                  : "bg-[#FAEAE4] border border-[#D65A38]/25"
              }`}
            >
              <TailorBot size={32} state="idle" />
            </div>
            <div>
              <span
                className={`font-bold text-lg block leading-none ${
                  isPom
                    ? "font-pom-display text-[#3A0C22]"
                    : "font-riso-serif italic text-[#2B6B5A] text-xl"
                }`}
              >
                {isPom ? "AI Resume Tailor" : "Tailor Studio"}
              </span>
              <span className="text-xs text-[var(--design-ink-muted)] font-medium block mt-1">
                Calm, truthful resume tailoring &amp; AI career craft
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-[var(--design-ink-muted)]">
            <Link
              href="/futureproof"
              className="text-[var(--design-accent)] font-bold hover:underline transition-colors"
            >
              Futureproof AI
            </Link>
            <Link href="/pricing" className="hover:text-[var(--design-ink)] transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-[var(--design-ink)] transition-colors">
              FAQ
            </Link>
            <Link href="/blog" className="hover:text-[var(--design-ink)] transition-colors">
              Blog
            </Link>
            <Link href="/resume-optimizer" className="hover:text-[var(--design-ink)] transition-colors">
              Optimizer
            </Link>
            <Link href="/alternatives/jobscan" className="hover:text-[var(--design-ink)] transition-colors">
              Alternatives
            </Link>
            <Link href="/privacy" className="hover:text-[var(--design-ink)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--design-ink)] transition-colors">
              Terms
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--design-ink-muted)]">
          <p>© {currentYear} AI Resume Tailor. All rights reserved.</p>
          <div className="flex items-center gap-2.5">
            <span className="font-semibold">Style:</span>
            <DesignSwitcher variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
