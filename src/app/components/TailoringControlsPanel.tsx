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
    <div className="w-full mb-4 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md shadow-sm transition-all overflow-hidden">
      {/* Top Header / Quick Status Bar */}
      <div className="px-4 py-3 sm:px-5 flex items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs shadow-sm flex-shrink-0">
            ⚡
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span>Tailoring Style</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60">
                {intensityDesc.title}
              </span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {metricsDesc.title} • {activePrefs.seniorityLevel === "senior" ? "Senior Framing" : activePrefs.seniorityLevel === "executive" ? "Executive Framing" : "Mid-Level"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 border border-cyan-200/60 dark:border-cyan-800/60 transition-colors flex items-center gap-1 min-h-[36px]"
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
      <div className="p-3.5 sm:p-4 bg-gray-50/40 dark:bg-gray-900/40">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Minimal / Light Polish */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIntensity("minimal")}
            className={`p-3 rounded-xl border text-left transition-all min-h-[64px] flex flex-col justify-between ${
              activePrefs.intensity === "minimal"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100 ring-2 ring-cyan-500/30 shadow-sm"
                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                <span>🟢</span> Light Polish
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                ~15% edits
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              Fix grammar, highlight keywords, keep 85%+ of your original wording intact.
            </p>
          </button>

          {/* Targeted / Balanced (Recommended) */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIntensity("targeted")}
            className={`p-3 rounded-xl border text-left transition-all min-h-[64px] flex flex-col justify-between relative ${
              activePrefs.intensity === "targeted"
                ? "border-cyan-500 bg-cyan-500/10 text-cyan-950 dark:text-cyan-100 ring-2 ring-cyan-500/30 shadow-sm"
                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                <span>⚡</span> Balanced Match
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300">
                Recommended
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              Rewrites key bullets to directly target this job while preserving your authentic story.
            </p>
          </button>

          {/* Overhaul / Full Transformation */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIntensity("overhaul")}
            className={`p-3 rounded-xl border text-left transition-all min-h-[64px] flex flex-col justify-between ${
              activePrefs.intensity === "overhaul"
                ? "border-purple-500 bg-purple-500/10 text-purple-950 dark:text-purple-100 ring-2 ring-purple-500/30 shadow-sm"
                : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                <span>🔥</span> Full Rewrite
              </span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                Max ATS match
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
              Completely rebuilds every bullet for maximum keyword density and executive framing.
            </p>
          </button>
        </div>
      </div>

      {/* Expanded Fine-Tuning Drawer */}
      {isOpen && (
        <div className="px-4 py-4 space-y-4 border-t border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 text-xs sm:text-sm">
          {/* Numbers & Metrics Handling */}
          <div>
            <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-2">
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
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 font-medium ring-1 ring-purple-500/40"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 bg-white/60 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm">{item.title}</div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{item.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Career Level & Section Toggles in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Career Level */}
            <div>
              <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-2">
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
                      className={`py-2 px-2 rounded-lg border text-center font-medium text-xs transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/40"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/40"
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
              <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Sections to Tailor
              </label>
              <div className="flex items-center gap-3 pt-1">
                {(["summary", "experience", "skills"] as const).map((sec) => (
                  <label
                    key={sec}
                    className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-gray-700 dark:text-gray-300 capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={activePrefs.sectionsToModify[sec]}
                      onChange={() => toggleSection(sec)}
                      disabled={disabled}
                      className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500"
                    />
                    {sec}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Optional Keywords to Weave */}
          {onKeywordsChange && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                Must-Include Keywords (Optional)
              </label>
              {keywordsToWeave.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywordsToWeave.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200 text-xs font-medium"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="rounded-full hover:bg-cyan-200 dark:hover:bg-cyan-800 p-0.5"
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
                  className="flex-1 min-w-0 px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddKeyword}
                  className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Optional Custom Instructions */}
          {onCustomInstructionsChange && (
            <div className="pt-2">
              <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                Special Focus or Custom Notes (Optional)
              </label>
              <textarea
                value={customInstructions}
                onChange={(e) => onCustomInstructionsChange(e.target.value)}
                placeholder="e.g. Emphasize my client-facing leadership and enterprise sales achievements..."
                rows={2}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 resize-y"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
