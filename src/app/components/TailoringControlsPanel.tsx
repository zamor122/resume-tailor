"use client";

import React, { useState } from "react";
import type {
  TailoringPreferences,
  IntensityLevel,
  MetricsMode,
  SeniorityLevel,
} from "@/app/types/tailoringPreferences";
import {
  INTENSITY_DESCRIPTIONS,
  METRICS_DESCRIPTIONS,
  SENIORITY_DESCRIPTIONS,
  INTENSITY_CHANGE_ESTIMATE,
  DEFAULT_PREFERENCES,
} from "@/app/types/tailoringPreferences";

interface TailoringControlsPanelProps {
  preferences?: TailoringPreferences;
  onChange: (prefs: TailoringPreferences) => void;
  disabled?: boolean;
  keywordsToWeave?: string[];
  onKeywordsChange?: (keywords: string[]) => void;
  customInstructions?: string;
  onCustomInstructionsChange?: (instructions: string) => void;
}

export default function TailoringControlsPanel({
  preferences = DEFAULT_PREFERENCES,
  onChange,
  disabled = false,
  keywordsToWeave = [],
  onKeywordsChange,
  customInstructions = "",
  onCustomInstructionsChange,
}: TailoringControlsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keywordInput, setKeywordInput] = useState("");

  const activePrefs: TailoringPreferences = {
    intensity: preferences?.intensity || DEFAULT_PREFERENCES.intensity,
    metricsMode: preferences?.metricsMode || DEFAULT_PREFERENCES.metricsMode,
    seniorityLevel: preferences?.seniorityLevel || DEFAULT_PREFERENCES.seniorityLevel,
    sectionsToModify: {
      summary: preferences?.sectionsToModify?.summary ?? true,
      experience: preferences?.sectionsToModify?.experience ?? true,
      skills: preferences?.sectionsToModify?.skills ?? true,
    },
  };

  const setIntensity = (intensity: IntensityLevel) => {
    onChange({ ...activePrefs, intensity });
  };

  const setMetricsMode = (metricsMode: MetricsMode) => {
    onChange({ ...activePrefs, metricsMode });
  };

  const setSeniority = (seniorityLevel: SeniorityLevel) => {
    onChange({ ...activePrefs, seniorityLevel });
  };

  const toggleSection = (key: keyof TailoringPreferences["sectionsToModify"]) => {
    onChange({
      ...activePrefs,
      sectionsToModify: {
        ...activePrefs.sectionsToModify,
        [key]: !activePrefs.sectionsToModify[key],
      },
    });
  };

  const handleAddKeyword = () => {
    const v = keywordInput.trim();
    if (v && !keywordsToWeave.includes(v) && onKeywordsChange) {
      onKeywordsChange([...keywordsToWeave, v]);
      setKeywordInput("");
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    if (onKeywordsChange) {
      onKeywordsChange(keywordsToWeave.filter((k) => k !== kw));
    }
  };

  const intensityDesc = INTENSITY_DESCRIPTIONS[activePrefs.intensity] || INTENSITY_DESCRIPTIONS.targeted;
  const metricsDesc = METRICS_DESCRIPTIONS[activePrefs.metricsMode] || METRICS_DESCRIPTIONS.placeholders;

  return (
    <div className="w-full mb-4 rounded-xl border-2 border-[#1C2028] bg-[#F4F1EA] dark:bg-[#161B22] shadow-[4px_4px_0px_#1C2028] transition-all overflow-hidden">
      {/* Top Header / Quick Status Bar */}
      <div className="px-4 py-3 sm:px-5 flex items-center justify-between gap-3 border-b-2 border-[#1C2028] bg-[#FAF7F0] dark:bg-[#1A1F2C]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#FF5722] text-white flex items-center justify-center font-mono font-bold text-xs border border-[#1C2028] shadow-[1px_1px_0px_#1C2028] flex-shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold font-mono text-[#1C2028] dark:text-[#FAF7F0] flex items-center gap-2">
              <span>TAILORING STYLE</span>
              <span className="neo-tag px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFD54F] text-[#1C2028] border border-[#1C2028]">
                {intensityDesc.title}
              </span>
            </h3>
            <p className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate mt-0.5">
              {metricsDesc.title} • {activePrefs.seniorityLevel === "senior" ? "Senior Framing" : activePrefs.seniorityLevel === "executive" ? "Executive Framing" : "Mid-Level"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="neo-btn flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] bg-white dark:bg-[#21262D] hover:bg-[#FFE0B2] border-1.5 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] transition-colors flex items-center gap-1.5 min-h-[36px]"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? "Close Options" : "Fine-Tune Options"}</span>
          <svg
            className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Primary 1-Click Level Cards (Always visible for quick decision without hidden steps) */}
      <div className="p-3.5 sm:p-4 bg-[#FAF7F0] dark:bg-[#1A1F2C]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Minimal / Light Polish */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIntensity("minimal")}
            className={`p-3.5 rounded-xl border-2 text-left transition-all min-h-[70px] flex flex-col justify-between cursor-pointer ${
              activePrefs.intensity === "minimal"
                ? "border-[#1C2028] bg-[#FFE0B2] text-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-bold"
                : "border-[#1C2028]/40 hover:border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-gray-200 shadow-[1px_1px_0px_rgba(28,32,40,0.15)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <span>🟢</span> Light Polish
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#1C2028] bg-white text-[#1C2028]">
                ~15% edits
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
              Fix grammar, highlight keywords, keep 85%+ of your original wording intact.
            </p>
          </button>

          {/* Targeted / Balanced (Recommended) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIntensity("targeted")}
            className={`p-3.5 rounded-xl border-2 text-left transition-all min-h-[70px] flex flex-col justify-between relative cursor-pointer ${
              activePrefs.intensity === "targeted"
                ? "border-[#1C2028] bg-[#FFE0B2] text-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-bold ring-1 ring-[#FF5722]"
                : "border-[#1C2028]/40 hover:border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-gray-200 shadow-[1px_1px_0px_rgba(28,32,40,0.15)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <span>⚡</span> Balanced Match
              </span>
              <span className="neo-tag text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FF5722] text-white border border-[#1C2028]">
                Recommended
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
              Rewrites key bullets to directly target this job while preserving your authentic story.
            </p>
          </button>

          {/* Overhaul / Full Transformation */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIntensity("overhaul")}
            className={`p-3.5 rounded-xl border-2 text-left transition-all min-h-[70px] flex flex-col justify-between cursor-pointer ${
              activePrefs.intensity === "overhaul"
                ? "border-[#1C2028] bg-[#FFE0B2] text-[#1C2028] shadow-[3px_3px_0px_#1C2028] font-bold"
                : "border-[#1C2028]/40 hover:border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-gray-200 shadow-[1px_1px_0px_rgba(28,32,40,0.15)]"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5">
                <span>🔥</span> Full Rewrite
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-[#1C2028] bg-white text-[#1C2028]">
                Max ATS match
              </span>
            </div>
            <p className="text-[11px] font-mono text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
              Completely rebuilds every bullet for maximum keyword density and executive framing.
            </p>
          </button>
        </div>
      </div>

      {/* Expanded Fine-Tuning Drawer */}
      {isOpen && (
        <div className="px-4 py-4 space-y-4 border-t-2 border-[#1C2028] bg-[#F4F1EA] dark:bg-[#161B22] text-xs sm:text-sm">
          {/* Numbers & Metrics Handling */}
          <div>
            <label className="block font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-2 uppercase text-xs tracking-wider">
              Numbers & Metrics in Experience Bullets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["strict", "placeholders", "benchmarks"] as MetricsMode[]).map((mode) => {
                const isSelected = activePrefs.metricsMode === mode;
                const labels: Record<MetricsMode, { title: string; subtitle: string }> = {
                  strict: {
                    title: "📊 Keep exact numbers only",
                    subtitle: "Don't add any new numbers or estimates.",
                  },
                  placeholders: {
                    title: "🎯 Smart Placeholders [+X%]",
                    subtitle: "Adds [brackets] where you can insert your real metrics.",
                  },
                  benchmarks: {
                    title: "📈 Role KPI Benchmarks",
                    subtitle: "Suggests realistic metrics common for your role.",
                  },
                };
                const item = labels[mode];
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMetricsMode(mode)}
                    className={`p-2.5 rounded-xl border-1.5 text-left transition-all ${
                      isSelected
                        ? "border-[#1C2028] bg-[#FFE0B2] text-[#1C2028] shadow-[2px_2px_0px_#1C2028] font-bold"
                        : "border-[#1C2028]/40 hover:border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-gray-300 shadow-[1px_1px_0px_rgba(28,32,40,0.1)]"
                    }`}
                  >
                    <div className="font-mono font-bold text-xs sm:text-sm">{item.title}</div>
                    <p className="text-[11px] font-mono text-gray-600 dark:text-gray-400 mt-0.5">{item.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Career Level & Section Toggles in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Career Level */}
            <div>
              <label className="block font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-2 uppercase text-xs tracking-wider">
                Target Career Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["mid", "senior", "executive"] as SeniorityLevel[]).map((s) => {
                  const isSelected = activePrefs.seniorityLevel === s;
                  const labelMap = {
                    mid: "Mid-Level",
                    senior: "Senior / Staff",
                    executive: "Executive / Lead",
                  };
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSeniority(s)}
                      className={`py-2 px-2 rounded-lg border-1.5 text-center font-mono font-bold text-xs transition-all ${
                        isSelected
                          ? "border-[#1C2028] bg-[#10B981] text-white shadow-[2px_2px_0px_#1C2028]"
                          : "border-[#1C2028]/40 hover:border-[#1C2028] text-[#1C2028] dark:text-gray-300 bg-white dark:bg-[#21262D] shadow-[1px_1px_0px_rgba(28,32,40,0.1)]"
                      }`}
                    >
                      {labelMap[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sections to update */}
            <div>
              <label className="block font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-2 uppercase text-xs tracking-wider">
                Sections to Tailor
              </label>
              <div className="flex items-center gap-3 pt-1">
                {(["summary", "experience", "skills"] as const).map((sec) => (
                  <label
                    key={sec}
                    className="flex items-center gap-1.5 cursor-pointer text-xs font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={activePrefs.sectionsToModify[sec]}
                      onChange={() => toggleSection(sec)}
                      disabled={disabled}
                      className="w-4 h-4 rounded border-[#1C2028] text-[#FF5722] focus:ring-[#FF5722]"
                    />
                    {sec}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Keywords to Weave */}
          {onKeywordsChange && (
            <div className="pt-2 border-t border-[#1C2028]/20">
              <label className="block font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-1.5 uppercase text-xs tracking-wider">
                Must-Include Keywords (Optional)
              </label>
              {keywordsToWeave.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywordsToWeave.map((kw) => (
                    <span
                      key={kw}
                      className="neo-tag inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FFE0B2] text-[#1C2028] border border-[#1C2028] text-xs font-mono font-bold shadow-[1px_1px_0px_#1C2028]"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="rounded hover:bg-[#FFCC80] p-0.5 ml-0.5"
                        aria-label={`Remove ${kw}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  placeholder="e.g. Kubernetes, React, Python, SOC2 (Press Enter to add)"
                  className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm rounded-lg border-1.5 border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-[#FAF7F0] placeholder-gray-500 font-mono shadow-[2px_2px_0px_#1C2028] focus:outline-none focus:ring-1 focus:ring-[#FF5722]"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="neo-btn px-4 py-2 text-xs sm:text-sm font-mono font-bold rounded-lg bg-[#FF5722] text-white border-1.5 border-[#1C2028] shadow-[2px_2px_0px_#1C2028] hover:bg-[#F4511E] transition-colors"
                >
                  ADD
                </button>
              </div>
            </div>
          )}

          {/* Optional Custom Instructions */}
          {onCustomInstructionsChange && (
            <div className="pt-2">
              <label className="block font-mono font-bold text-[#1C2028] dark:text-[#FAF7F0] mb-1.5 uppercase text-xs tracking-wider">
                Special Focus or Custom Notes (Optional)
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => onCustomInstructionsChange(e.target.value)}
                placeholder="e.g. Emphasize my client-facing leadership and enterprise sales achievements..."
                rows={2}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border-1.5 border-[#1C2028] bg-white dark:bg-[#21262D] text-[#1C2028] dark:text-[#FAF7F0] placeholder-gray-500 font-mono shadow-[2px_2px_0px_#1C2028] focus:outline-none focus:ring-1 focus:ring-[#FF5722] resize-y"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
