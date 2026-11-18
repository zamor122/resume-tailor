"use client";

import React from "react";
import Link from "next/link";
import TailorBot from "./neo/TailorBot";
import { useGamification } from "@/app/contexts/GamificationContext";

interface BlogCtaBannerProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  className?: string;
}

export default function BlogCtaBanner({
  title = "Beat the ATS with TailorBot MK-II",
  subtitle = "Stop sending generic resumes into the void. Align your real experience to the job posting with Google's X-Y-Z formula in 15 seconds.",
  buttonText = "⚡ TAILOR MY RESUME FREE",
  className = "",
}: BlogCtaBannerProps) {
  const { playSfx } = useGamification();

  return (
    <div
      className={`neo-box my-10 p-6 md:p-8 bg-[#F4F1EA] border-2 border-[#1C2028] shadow-[4px_4px_0px_#1C2028] rounded-xl flex flex-col sm:flex-row items-center gap-6 ${className}`}
    >
      <div className="shrink-0 flex flex-col items-center">
        <TailorBot
          size={110}
          state="celebrating"
          onPoke={() => playSfx("boop")}
          showPokeTag={false}
        />
      </div>

      <div className="flex-1 text-center sm:text-left space-y-2">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span className="neo-tag bg-[#FF5722] text-white text-[10px] px-2.5 py-0.5 font-mono font-bold tracking-wider uppercase">
            🔥 ATS OPTIMIZER
          </span>
          <span className="neo-tag bg-[#10B981] text-white text-[10px] px-2 py-0.5 font-mono font-bold">
            3 FREE AUDITS
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-mono font-bold text-[#1C2028] leading-snug">
          {title}
        </h3>

        <p className="text-xs md:text-sm text-gray-700 leading-relaxed font-sans">
          {subtitle}
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3">
          <Link
            href="/?utm_source=blog&utm_medium=cta&utm_campaign=resume_audit#tailorResume"
            onClick={() => playSfx("click")}
            className="neo-btn inline-flex items-center gap-2 bg-[#FF5722] hover:bg-[#E64A19] text-white px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] active:translate-x-[2px] active:translate-y-[2px]"
          >
            <span>{buttonText}</span>
            <span className="bg-black/25 text-white text-[10px] px-1.5 py-0.5 rounded-sm">+50 XP</span>
          </Link>
          <span className="text-[11px] font-mono text-gray-500">
            No credit card • Free instant preview
          </span>
        </div>
      </div>
    </div>
  );
}
