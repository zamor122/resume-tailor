"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
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
  /** Called when the value should be replaced with a new string (e.g. after URL fetch) */
  onValueChange?: (newValue: string) => void;
  onTitleDetected?: (title: string, confidence: number) => void;
  fontSize?: "small" | "medium" | "large";
  fillHeight?: boolean;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onValueChange,
  onTitleDetected,
  fontSize = "medium",
  fillHeight = false,
}) => {
  const [detectedTitle, setDetectedTitle] = useState<string | null>(null);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [urlFetchState, setUrlFetchState] = useState<"idle" | "fetching" | "success" | "error">("idle");
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSource, setFetchSource] = useState<"scraped" | "llm" | null>(null);
  const inputStartedFired = useRef(false);
  const prevLengthRef = useRef(0);
  const milestonesFired = useRef<Set<number>>(new Set());
  const fontSizeClass = getInputFontSizeClass(fontSize);
  const charCount = value.length;
  const isSufficient = charCount >= MIN_CHARS;

  const isUrl = (str: string) => {
    const trimmed = str.trim();
    return trimmed.startsWith("http://") || trimmed.startsWith("https://");
  };

  const fetchJobFromUrl = useCallback(async (url: string) => {
    setUrlFetchState("fetching");
    setFetchError(null);
    setFetchSource(null);
    try {
      const res = await fetch("/api/fetch-job-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(25_000),
      });
      const data = await res.json();
      if (!res.ok || !data.jobDescription) {
        setUrlFetchState("error");
        setFetchError(data.error || "Couldn't retrieve job description from that URL.");
        return;
      }
      setUrlFetchState("success");
      setFetchSource(data.source ?? null);
      onValueChange?.(data.jobDescription);
      analytics.trackEvent("job_url_fetched", {
        source: data.source,
        chars: data.jobDescription.length,
      });
    } catch {
      setUrlFetchState("error");
      setFetchError("Network error — please check your connection or paste the job description directly.");
    }
  }, [onValueChange]);

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

    // Reset URL fetch state if field is cleared
    if (newLen === 0) {
      setUrlFetchState("idle");
      setFetchError(null);
      setFetchSource(null);
    }

    if (newLen >= 10 && !inputStartedFired.current) {
      inputStartedFired.current = true;
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_INPUT_STARTED, {
        ...analytics.getTrackingContext({ section: "tailorResume", element: "job_description_textarea" }),
        charCount: newLen,
      });
    }
    const pastedDelta = newLen - prevLengthRef.current;
    if (pastedDelta >= PASTE_DELTA_THRESHOLD) {
      analytics.trackEvent(analytics.events.JOB_DESCRIPTION_PASTED, {
        ...analytics.getTrackingContext({ section: "tailorResume", element: "job_description_textarea" }),
        charCount: newLen,
        inputMethod: "paste",
      });
      // Auto-fetch if the pasted content looks like a URL
      if (isUrl(newValue)) {
        fetchJobFromUrl(newValue.trim());
      }
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
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* URL fetch status badges */}
          {urlFetchState === "fetching" && (
            <span className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 animate-pulse">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching job listing…
            </span>
          )}
          {urlFetchState === "success" && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30">
              ✓ {fetchSource === "llm" ? "Pulled via AI" : "Pulled from web"}
            </span>
          )}
          {detectedTitle && urlFetchState !== "fetching" && (
            <span className="text-xs px-2 py-1 rounded-lg bg-amber-500/20 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              {detectedTitle}
            </span>
          )}
          {urlFetchState !== "fetching" && (
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
          )}
        </div>
      </div>

      {/* URL fetch error banner */}
      {urlFetchState === "error" && fetchError && (
        <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span className="flex-1">{fetchError}</span>
          <button
            type="button"
            onClick={() => { setUrlFetchState("idle"); setFetchError(null); }}
            className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hint shown when the field is empty */}
      {charCount === 0 && urlFetchState === "idle" && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
          Paste the job description or a job listing URL — we'll pull the details automatically.
        </p>
      )}

      <textarea
        id="jobDescription"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={urlFetchState === "fetching"}
        className={`form-textarea ${fontSizeClass} ${fillHeight ? "flex-1 min-h-0" : ""} ${
          urlFetchState === "fetching" ? "opacity-60 cursor-wait" : ""
        }`}
        aria-label={label}
      />
    </div>
  );
};

export default JobDescriptionInput;
