"use client";

import React, { useState } from "react";
import { analytics } from "../services/analytics";
import { getInputFontSizeClass } from "@/app/utils/fontSize";

const MIN_CHARS = 100;

interface JobDescriptionInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onTitleDetected?: (title: string, confidence: number) => void;
  fontSize?: "small" | "medium" | "large";
  fillHeight?: boolean;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onTitleDetected,
  fontSize = "medium",
  fillHeight = false,
}) => {
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const fontSizeClass = getInputFontSizeClass(fontSize);
  const charCount = value.length;
  const isSufficient = charCount >= MIN_CHARS;

  const handleBlur = async () => {
    if (value.length < 50) {
      setDetectedTitle(null);
      return;
    }

    try {
      const response = await fetch("/api/tailor/job/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: value }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.warn("Job title extraction failed:", errorData);
        setDetectedTitle(null);
        return;
      }

      const data = await response.json();
      if (data.jobTitle) {
        setDetectedTitle(data.jobTitle);
        onTitleDetected?.(data.jobTitle, data.confidence ?? 0);
        analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
          success: true,
          titleSearched: data.jobTitle,
        });
      } else {
        setDetectedTitle(null);
      }
    } catch (error) {
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
        success: false,
        error: error instanceof Error ? error.message : error,
      });
      console.warn("Error analyzing job description:", error);
      setDetectedTitle(null);
    }
  };

  return (
    <div className={`input-container flex flex-col ${fillHeight ? "flex-1 min-h-0" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 flex-shrink-0">
        <h2 className="text-xl md:text-2xl font-bold gradient-job-description form-label mb-0">
          {label}
        </h2>
        <div className="flex items-center gap-2">
          {detectedTitle && (
            <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {detectedTitle}
            </span>
          )}
          <span
            className={`text-xs font-medium tabular-nums transition-colors duration-200 ${
              charCount === 0
                ? "text-gray-500 dark:text-gray-400"
                : isSufficient
                  ? "text-cyan-500 dark:text-cyan-400"
                  : "text-amber-500 dark:text-amber-400"
            }`}
          >
            {charCount.toLocaleString()} chars
            {charCount > 0 && charCount < MIN_CHARS && (
              <span className="ml-1 opacity-80">(min {MIN_CHARS})</span>
            )}
            {isSufficient && charCount > 0 && (
              <span className="ml-1 text-green-500 dark:text-green-400">Ready</span>
            )}
          </span>
        </div>
      </div>
      <textarea
        id="jobDescription"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e);
          if (detectedTitle && e.target.value.length < 50) setDetectedTitle(null);
        }}
        onBlur={handleBlur}
        className={`form-textarea ${fontSizeClass} ${fillHeight ? "flex-1 min-h-0" : ""}`}
        aria-label={label}
      />
    </div>
  );
};

export default JobDescriptionInput;
