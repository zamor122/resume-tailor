"use client";

import { useEffect, useState } from "react";

export interface ProgressStepItem {
  id: string;
  title: string;
  description: string;
  badge: string;
}

export const TAILORING_STEPS: ProgressStepItem[] = [
  {
    id: "analyze",
    title: "Analyzing Career Experience & Strengths",
    description: "Reviewing your career trajectory, core strengths, and work history",
    badge: "Profile",
  },
  {
    id: "match",
    title: "Aligning to Target Role Qualifications",
    description: "Identifying high-priority competencies and requirements employers look for",
    badge: "Target Match",
  },
  {
    id: "rewrite",
    title: "Enhancing Accomplishments & Impact",
    description: "Elevating bullet points with strong ownership and quantified business outcomes",
    badge: "Rewriting",
  },
  {
    id: "verify",
    title: "Verifying Authenticity with Jev AI",
    description: "Checking truthfulness, tone of voice, and ensuring zero fabricated claims",
    badge: "Quality Gate",
  },
  {
    id: "finalize",
    title: "Polishing Resume & Measuring Score Boost",
    description: "Synthesizing an executive summary and computing your before-and-after match score",
    badge: "Finalizing",
  },
];

interface ProgressStepperProps {
  isActive: boolean;
  onComplete?: () => void;
  agentMessage?: string;
  agentProgress?: number;
}

/**
 * Translates technical backend progress messages into warm, non-technical, human-readable status updates.
 */
function humanizeAgentMessage(msg?: string): string {
  if (!msg) return "";
  const lower = msg.toLowerCase();

  if (lower.includes("ast") || lower.includes("parsing")) {
    return "Analyzing work experience and skills...";
  }
  if (lower.includes("langgraph") || lower.includes("intake") || lower.includes("initializing")) {
    return "Preparing your resume and target role analysis...";
  }
  if (lower.includes("keyword") || lower.includes("competencies")) {
    return "Extracting high-priority competencies for this role...";
  }
  if (lower.includes("profiler") || lower.includes("career arc")) {
    return "Highlighting your top accomplishments and leadership trajectory...";
  }
  if (lower.includes("bullet") || lower.includes("surgical") || lower.includes("transformation")) {
    return "Elevating accomplishment bullets to highlight business results...";
  }
  if (lower.includes("jev") || lower.includes("judge") || lower.includes("gatekeeper")) {
    return "Verifying bullet truthfulness and authentic tone with Jev AI...";
  }
  if (lower.includes("summary")) {
    return "Crafting an executive summary highlighting your domain authority...";
  }
  if (lower.includes("reassemble") || lower.includes("scoring") || lower.includes("complete")) {
    return "Formatting your tailored resume and computing your match improvement...";
  }

  return msg;
}

export default function ProgressStepper({
  isActive,
  onComplete,
  agentMessage,
  agentProgress,
}: ProgressStepperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      setIsComplete(false);
      return;
    }

    if (agentProgress !== undefined) {
      if (agentProgress >= 100) {
        setIsComplete(true);
        setCurrentStep(TAILORING_STEPS.length - 1);
        onComplete?.();
      } else {
        const stepIdx = Math.min(
          TAILORING_STEPS.length - 1,
          Math.floor((agentProgress / 100) * TAILORING_STEPS.length)
        );
        setCurrentStep(stepIdx);
      }
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < TAILORING_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2400);

    return () => clearInterval(stepInterval);
  }, [isActive, agentProgress, onComplete]);

  if (!isActive && !isComplete) {
    return null;
  }

  const calculatedPercent =
    agentProgress !== undefined
      ? Math.min(100, Math.max(0, Math.round(agentProgress)))
      : Math.min(100, Math.round(((currentStep + 0.5) / TAILORING_STEPS.length) * 100));

  const friendlyMessage = humanizeAgentMessage(agentMessage);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 sm:p-7 relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl border border-gray-200/90 dark:border-gray-800 shadow-xl transition-all duration-300">
      {/* Subtle top ambient glow */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500"
        aria-hidden
      />

      {/* Header section with live status and progress counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {isComplete ? "Tailoring Complete" : "AI Tailoring in Progress"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Step {Math.min(currentStep + 1, TAILORING_STEPS.length)} of {TAILORING_STEPS.length}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
            {calculatedPercent}%
          </span>
        </div>
      </div>

      {/* Progress track bar */}
      <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 transition-all duration-500 ease-out"
          style={{ width: `${calculatedPercent}%` }}
        />
      </div>

      {/* Real-time Human-Readable Activity Banner */}
      {friendlyMessage && (
        <div className="mb-6 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 flex items-start gap-3 transition-all duration-300">
          <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Current Focus
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 truncate mt-0.5">
              {friendlyMessage}
            </p>
          </div>
        </div>
      )}

      {/* Stepper items list */}
      <div className="space-y-3">
        {TAILORING_STEPS.map((step, index) => {
          const isActiveStep = index === currentStep && isActive && !isComplete;
          const isCompleted = index < currentStep || isComplete;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-300 ${
                isActiveStep
                  ? "bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 shadow-sm"
                  : isCompleted
                    ? "bg-transparent border border-transparent"
                    : "bg-transparent border border-transparent opacity-60"
              }`}
            >
              {/* Step indicator circle */}
              <div className="flex-shrink-0 mt-0.5">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shadow-emerald-500/30">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : isActiveStep ? (
                  <div className="w-6 h-6 rounded-full border-2 border-blue-500 bg-white dark:bg-gray-900 flex items-center justify-center shadow-sm shadow-blue-500/40">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-[11px] font-medium text-gray-400">
                    {index + 1}
                  </div>
                )}
              </div>

              {/* Step title & description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs sm:text-sm font-semibold transition-colors duration-200 ${
                      isActiveStep
                        ? "text-blue-700 dark:text-blue-300"
                        : isCompleted
                          ? "text-gray-900 dark:text-gray-100 font-medium"
                          : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {step.title}
                  </p>

                  {isActiveStep && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-100/70 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300/40 dark:border-blue-700/40 animate-pulse">
                      In Progress
                    </span>
                  )}
                  {isCompleted && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-100/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300/30 dark:border-emerald-800/30">
                      Completed
                    </span>
                  )}
                </div>

                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Trust Indicator */}
      <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Jev AI Verified
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          Zero Hallucination Guarantee • Authentic Impact
        </span>
      </div>
    </div>
  );
}
