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
} from "@/app/types/tailoringPreferences";

interface TailoringControlsPanelProps {
  preferences: TailoringPreferences;
  onChange: (prefs: TailoringPreferences) => void;
  disabled?: boolean;
}

export default function TailoringControlsPanel({
  preferences,
  onChange,
  disabled = false,
}: TailoringControlsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const setIntensity = (intensity: IntensityLevel) => {
    onChange({ ...preferences, intensity });
  };

  const setMetricsMode = (metricsMode: MetricsMode) => {
    onChange({ ...preferences, metricsMode });
  };

  const setSeniority = (seniorityLevel: SeniorityLevel) => {
    onChange({ ...preferences, seniorityLevel });
  };

  const toggleSection = (key: keyof TailoringPreferences["sectionsToModify"]) => {
    onChange({
      ...preferences,
      sectionsToModify: {
        ...preferences.sectionsToModify,
        [key]: !preferences.sectionsToModify[key],
      },
    });
  };

  return (
    <div className="w-full mb-4 rounded-xl border border-gray-200/80 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md shadow-sm transition-all">
      {/* Header bar / Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/40 rounded-xl transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs shadow-sm">
            ⚙️
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Agent Transformation Controls
          </span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
            <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60">
              {INTENSITY_DESCRIPTIONS[preferences.intensity].title} ({INTENSITY_CHANGE_ESTIMATE[preferences.intensity]})
            </span>
            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60">
              {METRICS_DESCRIPTIONS[preferences.metricsMode].title}
            </span>
          </div>
        </div>

        <div className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-1">
          <span className="text-xs font-normal">{isOpen ? "Hide options" : "Customize"}</span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Controls Panel */}
      {isOpen && (
        <div className="px-4 pb-4 pt-2 space-y-4 border-t border-gray-100 dark:border-gray-800 text-xs sm:text-sm">
          {/* 1. Transformation Intensity Lever */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-gray-800 dark:text-gray-200">
                1. Transformation Intensity
              </label>
              <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                Est. Alterations: {INTENSITY_CHANGE_ESTIMATE[preferences.intensity]}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["minimal", "targeted", "overhaul"] as IntensityLevel[]).map((level) => {
                const isSelected = preferences.intensity === level;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={disabled}
                    onClick={() => setIntensity(level)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-900 dark:text-cyan-200 shadow-sm ring-1 ring-cyan-500/40"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/40 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>{INTENSITY_DESCRIPTIONS[level].title}</span>
                      {isSelected && <span className="text-cyan-500">●</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {INTENSITY_DESCRIPTIONS[level].subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Metrics & Impact Mode */}
          <div>
            <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
              2. Add Metrics & Quantification
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["strict", "placeholders", "benchmarks"] as MetricsMode[]).map((mode) => {
                const isSelected = preferences.metricsMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={disabled}
                    onClick={() => setMetricsMode(mode)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-purple-500 bg-purple-500/10 text-purple-900 dark:text-purple-200 shadow-sm ring-1 ring-purple-500/40"
                        : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white/40 dark:bg-gray-800/40 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <div className="font-semibold flex items-center justify-between">
                      <span>{METRICS_DESCRIPTIONS[mode].title}</span>
                      {isSelected && <span className="text-purple-500">●</span>}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {METRICS_DESCRIPTIONS[mode].subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Seniority Target & Section Scope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Seniority */}
            <div>
              <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                3. Seniority Register
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["mid", "senior", "executive"] as SeniorityLevel[]).map((s) => {
                  const isSelected = preferences.seniorityLevel === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSeniority(s)}
                      className={`py-1.5 px-2 rounded-md border text-center font-medium text-xs transition-all ${
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                          : "border-gray-200 dark:border-gray-800 hover:border-gray-300 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {SENIORITY_DESCRIPTIONS[s].title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Scope */}
            <div>
              <label className="block font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                4. Sections to Tailor
              </label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={preferences.sectionsToModify.summary}
                    onChange={() => toggleSection("summary")}
                    disabled={disabled}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  Summary
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={preferences.sectionsToModify.experience}
                    onChange={() => toggleSection("experience")}
                    disabled={disabled}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  Experience
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={preferences.sectionsToModify.skills}
                    onChange={() => toggleSection("skills")}
                    disabled={disabled}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  Skills
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
