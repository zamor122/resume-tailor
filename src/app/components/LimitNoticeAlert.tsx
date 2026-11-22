"use client";

import React from "react";
import Link from "next/link";
import type { LimitAction } from "@/app/utils/tailorLimitError";

export interface LimitNoticeAlertProps {
  message: string;
  limitAction: LimitAction;
  entryPrice: string;
  onOpenUpgrade: () => void;
  onOpenAuth: () => void;
}

export default function LimitNoticeAlert({
  message,
  limitAction,
  entryPrice,
  onOpenUpgrade,
  onOpenAuth,
}: LimitNoticeAlertProps) {
  return (
    <div
      className="animate-shake p-4 rounded-xl bg-[#FFE4E6] dark:bg-pink-900/20 border-2 border-[#1C2028] shadow-[3px_3px_0px_#1C2028] text-[#9F1239] dark:text-pink-300 font-mono text-xs font-bold text-left max-w-xl mx-auto space-y-3"
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <span className="text-base leading-none shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <span className="uppercase tracking-wide font-extrabold block mb-0.5">Notice</span>
          <span className="leading-relaxed block">{message}</span>
        </div>
      </div>

      {limitAction === "upgrade" && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="neo-btn px-4 py-2 rounded-lg bg-[#FF5722] hover:bg-[#F4511E] text-white font-mono font-extrabold text-xs uppercase tracking-wider border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
          >
            ⚡ Unlock Pass From ${entryPrice} →
          </button>
          <Link
            href="/pricing"
            className="px-3 py-2 rounded-lg bg-white text-[#1C2028] font-mono font-bold text-xs border border-[#1C2028] hover:bg-[#FAF7F0]"
          >
            Compare Plans
          </Link>
        </div>
      )}

      {limitAction === "auth" && (
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={onOpenAuth}
            className="neo-btn px-4 py-2 rounded-lg bg-[#FF5722] hover:bg-[#F4511E] text-white font-mono font-extrabold text-xs uppercase tracking-wider border-2 border-[#1C2028] shadow-[2px_2px_0px_#1C2028]"
          >
            ⚡ Create Free Account →
          </button>
          <button
            type="button"
            onClick={onOpenUpgrade}
            className="px-3 py-2 rounded-lg bg-white text-[#1C2028] font-mono font-bold text-xs border border-[#1C2028] hover:bg-[#FAF7F0]"
          >
            Passes From ${entryPrice}
          </button>
        </div>
      )}
    </div>
  );
}
