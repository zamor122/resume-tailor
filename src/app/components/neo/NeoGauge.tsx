"use client";

import React from "react";
import NeoBadge from "./NeoBadge";
import { useTheme } from "@/app/components/ThemeProvider";

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
  const { design } = useTheme();
  const isPom = design === "pomegranate";
  const clamped = Math.min(100, Math.max(0, Math.round(score)));
  const isHigh = clamped >= 80;
  const statusLabel =
    label || (isHigh ? "Ready to Apply" : "Room to Boost");
  const badgeVariant = isHigh ? "green" : "orange";

  const cx = 120;
  const cy = 112;
  const rings = [
    {
      r: 92,
      pct: Math.max(0.15, clamped / 100),
      color: isPom ? "#F7B93E" : "#D65A38",
    },
    {
      r: 72,
      pct: Math.max(0.18, Math.min(0.96, (clamped + 4) / 100)),
      color: isPom ? "#7BC6FA" : "#2B6B5A",
    },
    {
      r: 52,
      pct: Math.max(0.2, Math.min(0.98, (clamped + 8) / 100)),
      color: isPom ? "#74D4A0" : "#D69B24",
    },
  ];
  const track = isPom ? "#F3EDE0" : "#EAE2D2";
  const ink = isPom ? "#3A0C22" : "#241F1A";

  return (
    <div
      className={`neo-box bg-[var(--design-surface)] p-6 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-xs uppercase tracking-wider text-[var(--design-ink-muted)]">
          ATS Match Score
        </span>
        <NeoBadge variant={badgeVariant}>{statusLabel}</NeoBadge>
      </div>

      {/* Concentric Arc Gauge + Clear Score Readout */}
      <div className="flex flex-col items-center pt-1">
        <svg
          viewBox="0 0 240 124"
          className="w-full max-w-[230px] overflow-visible"
          role="img"
          aria-label={`ATS Match Score ${clamped} percent`}
        >
          {rings.map((ring, idx) => {
            const len = Math.PI * ring.r;
            const dash = len * ring.pct;
            const angle = Math.PI * (1 - ring.pct);
            const ex = cx + ring.r * Math.cos(angle);
            const ey = cy - ring.r * Math.sin(angle);
            return (
              <g key={idx}>
                <path
                  d={`M ${cx - ring.r} ${cy} A ${ring.r} ${ring.r} 0 0 1 ${cx + ring.r} ${cy}`}
                  fill="none"
                  stroke={track}
                  strokeWidth={isPom ? 13 : 11.5}
                  strokeLinecap="round"
                />
                {isPom && (
                  <path
                    d={`M ${cx - ring.r} ${cy} A ${ring.r} ${ring.r} 0 0 1 ${cx + ring.r} ${cy}`}
                    fill="none"
                    stroke={ink}
                    strokeWidth={16}
                    strokeLinecap="round"
                    strokeDasharray={`${dash} ${len}`}
                  />
                )}
                <path
                  d={`M ${cx - ring.r} ${cy} A ${ring.r} ${ring.r} 0 0 1 ${cx + ring.r} ${cy}`}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={isPom ? 12.5 : 11}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${len}`}
                />
                <circle
                  cx={ex}
                  cy={ey}
                  r={isPom ? 5.5 : 4.5}
                  fill={isPom ? ink : "#FFFDF8"}
                  stroke={isPom ? "#FFFDF5" : ring.color}
                  strokeWidth={isPom ? 1.8 : 2.5}
                />
              </g>
            );
          })}
        </svg>

        <div className="-mt-8 flex items-baseline justify-center gap-0.5">
          <span
            className={`font-extrabold text-5xl tracking-tight text-[var(--design-ink)] ${
              isPom ? "font-pom-display" : "font-riso-serif"
            }`}
          >
            {clamped}
          </span>
          <span className="font-bold text-xl text-[var(--design-ink-muted)]">
            %
          </span>
        </div>
      </div>
    </div>
  );
}
