"use client";

import React from "react";
import NeoBadge from "./NeoBadge";

export interface NeoGaugeProps {
  score: number;
  label?: string;
  className?: string;
}

export default function NeoGauge({
  score,
  label,
  className = "",
}: NeoGaugeProps) {
  const isHigh = score >= 80;
  const statusLabel =
    label || (isHigh ? "RECRUITER READY 🚀" : "BELOW THRESHOLD");
  const badgeVariant = isHigh ? "green" : "orange";
  const barColor = isHigh ? "bg-[#10B981]" : "bg-[#FF5722]";

  return (
    <div className={`neo-box bg-white p-6 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-xs uppercase tracking-wider text-gray-600 font-mono">
          ATS Relevancy Console
        </span>
        <NeoBadge variant={badgeVariant}>{statusLabel}</NeoBadge>
      </div>

      {/* Digital Score Display */}
      <div className="flex items-baseline justify-center gap-1 my-3 bg-[#FAF8F5] p-3 neo-box-sm border border-gray-300">
        <span className="font-black text-6xl tracking-tight text-[#1C2028] font-mono">
          {score}
        </span>
        <span className="font-bold text-2xl text-gray-500 font-mono">%</span>
      </div>

      {/* Vintage Meter Bar */}
      <div className="w-full bg-gray-200 neo-box-sm h-6 overflow-hidden p-0.5 relative">
        <div
          className={`h-full rounded-md transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}
