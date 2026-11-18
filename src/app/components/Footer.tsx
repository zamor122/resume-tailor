"use client";

import React from "react";
import Link from "next/link";
import TailorBot from "./neo/TailorBot";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-10 mt-12 bg-[#F4F1EA] border-t-2 border-[#1C2028]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b-2 border-black/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 neo-box-sm bg-[#FF5722] flex items-center justify-center shrink-0">
              <TailorBot size={32} state="idle" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-[#1C2028] block leading-none font-display">
                AI RESUME TAILOR
              </span>
              <span className="text-[10px] text-gray-600 font-mono font-bold tracking-wider uppercase block mt-0.5">
                Target Match & Relevancy Engine
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-mono font-bold text-gray-700 uppercase">
            <Link href="/pricing" className="hover:text-[#FF5722] transition-colors">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-[#FF5722] transition-colors">
              FAQ
            </Link>
            <Link href="/blog" className="hover:text-[#FF5722] transition-colors">
              Blog
            </Link>
            <Link href="/resume-optimizer" className="hover:text-[#FF5722] transition-colors">
              Optimizer
            </Link>
            <Link href="/alternatives/jobscan" className="hover:text-[#FF5722] transition-colors">
              Alternatives
            </Link>
            <Link href="/privacy" className="hover:text-[#FF5722] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#FF5722] transition-colors">
              Terms
            </Link>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-500">
          <p>© {currentYear} AI Resume Tailor. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
            <span>SYSTEM CONSOLE v2.0 • OPTIMISTIC RETROFUTURISM</span>
          </p>
        </div>
      </div>
    </footer>
  );
}