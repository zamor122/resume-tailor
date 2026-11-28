"use client";

import React from "react";
import { useTheme, type DesignOption } from "./ThemeProvider";
import { useGamification } from "@/app/contexts/GamificationContext";

const OPTIONS: Array<{
  id: DesignOption;
  label: string;
  shortLabel: string;
  description: string;
  swatches: [string, string, string];
}> = [
  {
    id: "pomegranate",
    label: "Pomegranate",
    shortLabel: "Berry",
    description: "Playful berry & cream, tactile pills",
    swatches: ["#EA375D", "#FFFDF5", "#F7B93E"],
  },
  {
    id: "risograph",
    label: "Risograph",
    shortLabel: "Paper",
    description: "Warm sand paper, sage & editorial serif",
    swatches: ["#F6F0E4", "#2B6B5A", "#D65A38"],
  },
];

export default function DesignSwitcher({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "menu" | "footer";
  className?: string;
}) {
  const { design, setDesign } = useTheme();
  const { playSfx } = useGamification();
  const isPom = design === "pomegranate";

  const handleSelect = (next: DesignOption) => {
    if (next === design) return;
    playSfx("click");
    setDesign(next);
  };

  if (variant === "menu") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--design-ink-muted)]">
            Site Design
          </span>
          <span className="text-[11px] font-semibold text-[var(--design-accent)]">
            {isPom ? "Pomegranate" : "Warm Paper"}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Choose site design"
          className="grid grid-cols-2 gap-2"
        >
          {OPTIONS.map((opt) => {
            const active = design === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => handleSelect(opt.id)}
                className={`p-2.5 rounded-2xl text-left transition-all border ${
                  active
                    ? isPom
                      ? "bg-[#FFFDF5] border-[2px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
                      : "bg-[#FFFDF8] border-[#2B6B5A] shadow-[2px_2px_0_rgba(43,107,90,0.2)]"
                    : "bg-[var(--design-surface-tint)]/70 border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="flex -space-x-1" aria-hidden="true">
                    {opt.swatches.map((color, idx) => (
                      <span
                        key={idx}
                        className="w-3 h-3 rounded-full border border-black/20"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                  {active && (
                    <span
                      className="text-[10px] font-extrabold text-[var(--design-accent)]"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-[var(--design-ink)] leading-tight">
                  {opt.label}
                </div>
                <div className="text-[10px] text-[var(--design-ink-muted)] leading-tight mt-0.5">
                  {opt.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Switch website design"
      className={`inline-flex items-center rounded-full p-0.5 shrink-0 ${
        variant === "footer"
          ? isPom
            ? "bg-white border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
            : "bg-[#FFFDF8] border border-[#241F1A]/15"
          : isPom
          ? "bg-white border-[1.75px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
          : "bg-[#FFFDF8] border border-[#241F1A]/15"
      } ${className}`}
    >
      {OPTIONS.map((opt) => {
        const active = design === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => handleSelect(opt.id)}
            title={`Switch to ${opt.label} design`}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              active
                ? isPom
                  ? "bg-[#F6F1E4] text-[#3A0C22] border border-[#3A0C22]/30"
                  : "bg-[#2B6B5A] text-[#FFFDF8] border border-[#2B6B5A]"
                : isPom
                ? "text-[#7D4D61] hover:text-[#3A0C22] border border-transparent"
                : "text-[#6C6358] hover:text-[#241F1A] border border-transparent"
            }`}
          >
            <span className="flex -space-x-1" aria-hidden="true">
              {opt.swatches.slice(0, 2).map((color, idx) => (
                <span
                  key={idx}
                  className="w-2.5 h-2.5 rounded-full border border-black/25"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
