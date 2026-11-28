"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { analytics } from "../services/analytics";
import { getInputFontSizeClass } from "@/app/utils/fontSize";
import { useJobTitle } from "@/app/hooks/useJobTitle";

const MIN_CHARS = 100;
const PASTE_DELTA_THRESHOLD = 50;
const CHAR_COUNT_MILESTONES = [100, 500];

export const SAMPLE_JOB_PRESETS = [
  {
    role: "Full Stack Engineer",
    text: "Senior Full Stack Engineer: Looking for an experienced engineer proficient in TypeScript, React, Next.js, and Node.js. Experience optimizing Core Web Vitals, building RESTful/GraphQL APIs, database modeling in PostgreSQL, unit testing with Vitest/Jest, and deploying cloud applications via CI/CD pipelines.",
  },
  {
    role: "Product Manager",
    text: "Senior Product Manager: Seeking an analytical PM to own the product lifecycle and user conversion funnels. Lead roadmap prioritization, conduct qualitative customer interviews, design A/B testing frameworks, and partner closely with engineering and growth design to maximize activation and retention.",
  },
  {
    role: "Account Executive",
    text: "Enterprise Account Executive: High-growth SaaS platform hiring an AE with demonstrated success exceeding $1M+ ARR quotas. Drive consultative software demos, navigate enterprise security and legal reviews, generate qualified pipeline, and close complex multi-year customer agreements.",
  },
];

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
    <div className={`input-container flex flex-col gap-4 ${fillHeight ? "flex-1 min-h-0" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--design-border-soft)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="neo-tag bg-[var(--design-accent)] text-[var(--design-accent-ink)] text-xs px-2.5 py-1 font-bold">
            Step 2
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[var(--design-ink)] leading-snug mb-0">
              Target Job Description
            </h2>
            <p className="text-xs text-[var(--design-ink-muted)] mb-0">
              Paste job posting or enter a job URL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* URL fetch status badges */}
          {urlFetchState === "fetching" && (
            <span className="neo-tag bg-[var(--design-accent)] text-white text-xs px-2.5 py-0.5 font-bold flex items-center gap-1.5 animate-pulse">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Fetching job...
            </span>
          )}
          {urlFetchState === "success" && (
            <span className="neo-tag bg-[#128C66] text-white text-xs px-2.5 py-0.5 font-bold flex items-center gap-1">
              ✓ {fetchSource === "llm" ? "AI extracted" : "Web parsed"}
            </span>
          )}
          {detectedTitle && urlFetchState !== "fetching" && (
            <span className="neo-tag bg-[var(--design-ink)] text-white text-xs px-2.5 py-0.5 font-bold">
              {detectedTitle}
            </span>
          )}
          {urlFetchState !== "fetching" && (
            <span
              className={`neo-tag text-xs font-bold px-3 py-1 ${
                charCount === 0
                  ? "bg-[var(--design-surface-tint)] text-[var(--design-ink-muted)]"
                  : isSufficient
                    ? "bg-[#128C66] text-white"
                    : "bg-[#F7B93E] text-[#3A0C22]"
              }`}
            >
              {charCount.toLocaleString()} chars
              {charCount > 0 && charCount < MIN_CHARS && (
                <span className="ml-1 opacity-90">(min {MIN_CHARS})</span>
              )}
              {isSufficient && charCount > 0 && (
                <span className="ml-1">Ready ✓</span>
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

      {/* Hint and Quick Launch Sample Roles shown when empty */}
      {charCount === 0 && urlFetchState === "idle" && (
        <div className="mb-2.5">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1.5 flex items-center gap-1.5">
            <span>💡 No job posting handy? Try a sample target role:</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_JOB_PRESETS.map((preset) => (
              <button
                key={preset.role}
                type="button"
                onClick={() => {
                  if (onValueChange) {
                    onValueChange(preset.text);
                  }
                  if (onTitleDetected) {
                    onTitleDetected(preset.role, 0.95);
                  }
                }}
                className="neo-btn text-[11px] font-mono font-bold px-2 py-1 bg-white hover:bg-[#FAF7F0] text-[#1C2028] border border-[#1C2028] rounded shadow-[1px_1px_0px_#1C2028] transition-all"
              >
                + {preset.role}
              </button>
            ))}
          </div>
        </div>
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
