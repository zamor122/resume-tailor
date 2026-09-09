"use client";

import { useEffect, useState } from "react";

interface ProgressStepperProps {
  isActive: boolean;
  onComplete?: () => void;
  agentMessage?: string;
  agentProgress?: number;
}

const DEFAULT_STEPS = [
  "Parsing resume AST & structure...",
  "Extracting critical ATS keywords...",
  "Applying transformation levers...",
  "Surgically optimizing experience bullets...",
  "Reassembling with zero formatting drift...",
];

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
        setCurrentStep(DEFAULT_STEPS.length - 1);
        onComplete?.();
      } else {
        const stepIdx = Math.min(
          DEFAULT_STEPS.length - 1,
          Math.floor((agentProgress / 100) * DEFAULT_STEPS.length)
        );
        setCurrentStep(stepIdx);
      }
      return;
    }

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < DEFAULT_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1200);

    return () => clearInterval(stepInterval);
  }, [isActive, agentProgress, onComplete]);

  if (!isActive && !isComplete) {
    return null;
  }

  return (
    <div className="input-container w-full max-w-2xl mx-auto p-6 relative overflow-hidden bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-lg">
      <div
        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 animate-pulse"
        aria-hidden
      />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 dark:text-cyan-300">
            LangGraph Agent Running
          </span>
        </div>
        {agentProgress !== undefined && (
          <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
            {Math.round(agentProgress)}%
          </span>
        )}
      </div>

      {agentMessage && (
        <div className="mb-4 p-2.5 rounded-lg bg-cyan-50/50 dark:bg-cyan-950/30 border border-cyan-200/50 dark:border-cyan-800/50 text-xs text-cyan-800 dark:text-cyan-200 font-medium">
          ⚡ {agentMessage}
        </div>
      )}

      <div className="space-y-3.5">
        {DEFAULT_STEPS.map((step, index) => {
          const isActiveStep = index === currentStep && isActive;
          const isCompleted = index < currentStep || (isComplete && index === DEFAULT_STEPS.length - 1);

          return (
            <div key={index} className="flex items-center gap-3.5">
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center shadow-md shadow-cyan-500/20">
                    <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                ) : isActiveStep ? (
                  <div className="w-6 h-6 rounded-full border-2 border-cyan-500 flex items-center justify-center shadow-[0_0_10px_rgba(0,240,255,0.4)]">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs sm:text-sm transition-colors duration-200 ${
                    isCompleted
                      ? "text-gray-900 dark:text-gray-200 font-medium"
                      : isActiveStep
                        ? "text-cyan-600 dark:text-cyan-400 font-semibold"
                        : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {step}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
