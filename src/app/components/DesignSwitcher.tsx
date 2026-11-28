"use client";

import React from "react";
import { useTheme, type DesignOption } from "./ThemeProvider";
import { useGamification } from "@/app/contexts/GamificationContext";

const OPTIONS: Array<{
  id: DesignOption;
  label: string;
  description: string;
  swatches: [string, string, string];
}> = [
  {
    id: "pomegranate",
    label: "Modern",
    description: "Berry & warm cream",
    swatches: ["#EA375D", "#FFFDF5", "#F7B93E"],
  },
  {
    id: "risograph",
    label: "Classic",
    description: "Warm paper & serif",
    swatches: ["#F6F0E4", "#2B6B5A", "#D65A38"],
  },
];

export default function DesignSwitcher({
  variant = "compact",
  className = "",
}: {
  variant?: "compact" | "menu";
  className?: string;
}) {
  const { design, setDesign } = useTheme();
  const { playSfx } = useGamification();
  const isModern = design === "pomegranate";

  const handleSelect = (next: DesignOption) => {
    if (next === design) return;
    playSfx("click");
    setDesign(next);
  };

  if (variant === "menu") {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--design-ink-muted)]">
            Design Theme
          </span>
          <span className="text-xs font-bold text-[var(--design-accent)]">
            {isModern ? "Modern" : "Classic"}
          </span>
        </div>
        <div
          role="radiogroup"
          aria-label="Choose design theme"
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
                className={`p-3 rounded-2xl text-left transition-all border ${
                  active
                    ? isModern
                      ? "bg-[#FFFDF5] border-[2px] border-[#3A0C22] shadow-[0_2px_0_#3A0C22]"
                      : "bg-[#FFFDF8] border-[#2B6B5A] shadow-[2px_2px_0_rgba(43,107,90,0.2)]"
                    : "bg-[var(--design-surface-tint)]/70 border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
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
                      className="text-xs font-extrabold text-[var(--design-accent)]"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-[var(--design-ink)] leading-tight">
                  {opt.label}
                </div>
                <div className="text-xs text-[var(--design-ink-muted)] leading-snug mt-0.5">
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
      aria-label="Switch design theme"
      className={`inline-flex items-center rounded-full p-0.5 shrink-0 ${
        isModern
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
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              active
                ? isModern
                  ? "bg-[#F6F1E4] text-[#3A0C22] border border-[#3A0C22]/30"
                  : "bg-[#2B6B5A] text-[#FFFDF8] border border-[#2B6B5A]"
                : isModern
                ? "text-[#6B3F52] hover:text-[#3A0C22] border border-transparent"
                : "text-[#5C544B] hover:text-[#241F1A] border border-transparent"
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
