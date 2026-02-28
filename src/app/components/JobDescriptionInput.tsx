"use client";

import React, { useEffect, useState, useRef } from "react";
import { analytics } from "../services/analytics";
import { getInputFontSizeClass } from "@/app/utils/fontSize";
import { useJobTitle } from "@/app/hooks/useJobTitle";

const MIN_CHARS = 100;
const PASTE_DELTA_THRESHOLD = 50;
const CHAR_COUNT_MILESTONES = [100, 500];

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
  const [hasBlurred, setHasBlurred] = useState(false);
  const inputStartedFired = useRef(false);
  const prevLengthRef = useRef(0);
  const milestonesFired = useRef<Set<number>>(new Set());
  const fontSizeClass = getInputFontSizeClass(fontSize);
  const charCount = value.length;
  const isSufficient = charCount >= MIN_CHARS;

  const { jobTitle, confidence, isLoading: jobTitleLoading, error: jobTitleError } = useJobTitle(value, {
    enabled: hasBlurred && value.trim().length >= 100,
  });

  useEffect(() => {
    if (jobTitle) {
      setDetectedTitle(jobTitle);
      onTitleDetected?.(jobTitle, confidence);
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
        success: true,
        titleSearched: jobTitle,
      });
    } else if (hasBlurred && !jobTitleLoading && jobTitleError) {
      setDetectedTitle(null);
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_ANALYSIS, {
        success: false,
        error: jobTitleError instanceof Error ? jobTitleError.message : jobTitleError,
      });
    }
  }, [jobTitle, confidence, jobTitleLoading, jobTitleError, hasBlurred, onTitleDetected]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newLen = newValue.length;

    if (newLen >= 10 && !inputStartedFired.current) {
      inputStartedFired.current = true;
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_INPUT_STARTED, {
        ...analytics.getTrackingContext({ section: "tailorResume", element: "job_description_textarea" }),
        charCount: newLen,
      });
    }
    if (newLen - prevLengthRef.current >= PASTE_DELTA_THRESHOLD) {
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_PASTED, {
        ...analytics.getTrackingContext({ section: "tailorResume", element: "job_description_textarea" }),
        charCount: newLen,
        inputMethod: "paste",
      });
    }
    CHAR_COUNT_MILESTONES.forEach((m) => {
      if (newLen >= m && !milestonesFired.current.has(m)) {
        milestonesFired.current.add(m);
        analytics.trackEvent(analytics.events.JOB_DESC_CHAR_COUNT, {
          ...analytics.getTrackingContext({ section: "tailorResume", element: "job_description_textarea" }),
          charCount: newLen,
          milestone: m,
        });
      }
    });
    prevLengthRef.current = newLen;
    onChange(e);
    if (detectedTitle && newLen < 50) setDetectedTitle(null);
  };

  const handleBlur = () => {
    if (value.length < 50) {
      setDetectedTitle(null);
      return;
    }
    setHasBlurred(true);
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
        onChange={handleChange}
        onBlur={handleBlur}
        className={`form-textarea ${fontSizeClass} ${fillHeight ? "flex-1 min-h-0" : ""}`}
        aria-label={label}
      />
    </div>
  );
};

export default JobDescriptionInput;
